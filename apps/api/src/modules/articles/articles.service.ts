import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Article, type ArticleCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ListArticlesQuery } from './dto/list-articles.query';

const PUBLIC_INCLUDE = {
  author: { select: { id: true, name: true } },
} as const;

@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────────────
  // Public (storefront)
  // ──────────────────────────────────────────────────────────────────────

  async listPublished(query: ListArticlesQuery): Promise<{
    data: Article[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.listInternal({ ...query, isPublished: 'true' }, { publicOnly: true });
  }

  async findPublishedBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: PUBLIC_INCLUDE,
    });
    if (!article || !article.isPublished) {
      throw new NotFoundException('errors.not_found');
    }
    return article;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Admin
  // ──────────────────────────────────────────────────────────────────────

  async listForAdmin(query: ListArticlesQuery) {
    return this.listInternal(query, { publicOnly: false });
  }

  async findByIdForAdmin(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: PUBLIC_INCLUDE,
    });
    if (!article) throw new NotFoundException('errors.not_found');
    return article;
  }

  async create(dto: CreateArticleDto, authorId: string): Promise<Article> {
    await this.assertSlugFree(dto.slug);
    const excerpt = this.normalizeExcerpt(dto.excerpt);
    return this.prisma.article.create({
      data: {
        title: dto.title as unknown as Prisma.JsonObject,
        slug: dto.slug,
        content: dto.content as unknown as Prisma.JsonObject,
        excerpt: excerpt ?? Prisma.JsonNull,
        coverImage: dto.coverImage ?? null,
        category: dto.category as ArticleCategory,
        authorId,
      },
    });
  }

  async update(id: string, dto: UpdateArticleDto): Promise<Article> {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');

    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      await this.assertSlugFree(dto.slug);
    }

    const data: Prisma.ArticleUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title as unknown as Prisma.JsonObject;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.content !== undefined)
      data.content = dto.content as unknown as Prisma.JsonObject;
    if (dto.excerpt !== undefined) {
      const norm = this.normalizeExcerpt(dto.excerpt);
      data.excerpt = norm ?? Prisma.JsonNull;
    }
    if (dto.coverImage !== undefined) {
      data.coverImage = dto.coverImage.trim().length === 0 ? null : dto.coverImage;
    }
    if (dto.category !== undefined) data.category = dto.category as ArticleCategory;

    return this.prisma.article.update({ where: { id }, data });
  }

  async publish(id: string): Promise<Article> {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');
    return this.prisma.article.update({
      where: { id },
      data: {
        isPublished: true,
        // First publish sets the canonical publishedAt; later re-publishes
        // don't disturb the original date so the article keeps its sort
        // position on the storefront timeline.
        publishedAt: existing.publishedAt ?? new Date(),
      },
    });
  }

  async unpublish(id: string): Promise<Article> {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');
    return this.prisma.article.update({
      where: { id },
      data: { isPublished: false },
    });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');
    await this.prisma.article.delete({ where: { id } });
  }

  // ──────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────

  private async listInternal(
    query: ListArticlesQuery,
    opts: { publicOnly: boolean },
  ): Promise<{
    data: Article[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.ArticleWhereInput = {
      ...(opts.publicOnly ? { isPublished: true } : {}),
      ...(!opts.publicOnly && query.isPublished !== undefined
        ? { isPublished: query.isPublished === 'true' }
        : {}),
      ...(query.category ? { category: query.category as ArticleCategory } : {}),
      ...(query.search
        ? {
            OR: [
              { slug: { contains: query.search, mode: 'insensitive' } },
              {
                title: {
                  path: ['fr'],
                  string_contains: query.search,
                } as Prisma.JsonFilter,
              },
              {
                title: {
                  path: ['en'],
                  string_contains: query.search,
                } as Prisma.JsonFilter,
              },
            ],
          }
        : {}),
    };

    const sortBy = query.sortBy ?? 'publishedAt';
    const sortDir = query.sortDir ?? 'desc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        include: PUBLIC_INCLUDE,
        orderBy: [{ [sortBy]: { sort: sortDir, nulls: 'last' } }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.article.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  private async assertSlugFree(slug: string): Promise<void> {
    const existing = await this.prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existing) throw new ConflictException('errors.slug_already_used');
  }

  private normalizeExcerpt(
    raw: { fr?: string; en?: string } | undefined,
  ): Prisma.JsonObject | null {
    if (!raw) return null;
    const fr = raw.fr?.trim();
    const en = raw.en?.trim();
    if (!fr && !en) return null;
    return { fr: fr ?? '', en: en ?? '' };
  }
}
