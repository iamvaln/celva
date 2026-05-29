import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type NewsletterSubscriber } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { ListSubscribersQuery } from './dto/list-subscribers.query';

@Injectable()
export class NewsletterService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────────────
  // Public (storefront)
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Idempotent opt-in. We never reveal whether the email was already on the
   * list (membership privacy) — every valid email gets the same 204. A
   * previously-unsubscribed address is silently re-activated.
   */
  async subscribe(dto: SubscribeNewsletterDto): Promise<void> {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name?.trim() || null;

    await this.prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email, name },
      update: {
        isActive: true,
        unsubscribedAt: null,
        // Only fill the name if we don't already have one — don't clobber a
        // name captured earlier with a later empty submission.
        ...(name ? { name } : {}),
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // Admin
  // ──────────────────────────────────────────────────────────────────────

  async listForAdmin(query: ListSubscribersQuery): Promise<{
    data: NewsletterSubscriber[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.NewsletterSubscriberWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const sortBy = query.sortBy ?? 'subscribedAt';
    const sortDir = query.sortDir ?? 'desc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.newsletterSubscriber.findMany({
        where,
        // Plain { col: dir } — the { sort, nulls } form is rejected by Prisma
        // on non-nullable columns (subscribedAt, email), which is the default.
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.newsletterSubscriber.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findByIdForAdmin(id: string): Promise<NewsletterSubscriber> {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({ where: { id } });
    if (!subscriber) throw new NotFoundException('errors.not_found');
    return subscriber;
  }

  async unsubscribe(id: string): Promise<NewsletterSubscriber> {
    const existing = await this.prisma.newsletterSubscriber.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');
    if (!existing.isActive) return existing;
    return this.prisma.newsletterSubscriber.update({
      where: { id },
      data: { isActive: false, unsubscribedAt: new Date() },
    });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.newsletterSubscriber.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');
    await this.prisma.newsletterSubscriber.delete({ where: { id } });
  }
}
