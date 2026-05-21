import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type ProductImage } from '@prisma/client';
import { IMAGE } from '@celva/shared';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_SERVICE, type StorageService } from '../storage/storage.types';
import type { UploadImageDto } from './dto/upload-image.dto';

type Variant = 'original' | 'large' | 'medium' | 'thumb';

export type ProductImageWithUrls = ProductImage & {
  urls: Record<Variant, string>;
};

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class ProductImagesService {
  private readonly logger = new Logger(ProductImagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async list(productId: string): Promise<ProductImageWithUrls[]> {
    await this.assertProductExists(productId);
    const images = await this.prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
    return images.map((img) => this.decorate(img));
  }

  async findById(id: string): Promise<ProductImageWithUrls> {
    const image = await this.prisma.productImage.findUnique({ where: { id } });
    if (!image) throw new NotFoundException('errors.not_found');
    return this.decorate(image);
  }

  /**
   * Upload a single original file to storage and create the matching DB row.
   * Per docs/celva-algo-images.md: NO server-side transforms — Cloudflare
   * Images handles every variant on the fly at request time.
   */
  async uploadOne(
    productId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
    dto: UploadImageDto,
  ): Promise<ProductImageWithUrls> {
    await this.assertProductExists(productId);

    if (!IMAGE.ACCEPTED_MIME.includes(file.mimetype as (typeof IMAGE.ACCEPTED_MIME)[number])) {
      throw new BadRequestException('errors.image_mime_unsupported');
    }
    if (file.buffer.byteLength > IMAGE.MAX_BYTES) {
      throw new BadRequestException('errors.image_too_large');
    }

    const ext = MIME_TO_EXT[file.mimetype] ?? extname(file.originalname).slice(1).toLowerCase();
    if (!ext) throw new BadRequestException('errors.image_mime_unsupported');

    const imageId = randomUUID();
    const key = `products/${productId}/${imageId}.${ext}`;

    await this.storage.put(key, file.buffer, file.mimetype);

    try {
      const lastPositionRow = await this.prisma.productImage.findFirst({
        where: { productId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      const isFirst = !lastPositionRow;
      const position = lastPositionRow ? lastPositionRow.position + 1 : 0;

      const created = await this.prisma.productImage.create({
        data: {
          id: imageId,
          key,
          altText: (dto.altText ?? Prisma.JsonNull) as
            | Prisma.InputJsonValue
            | typeof Prisma.JsonNull,
          position,
          isPrimary: isFirst,
          productId,
        },
      });
      return this.decorate(created);
    } catch (err) {
      // Compensate the storage write so we don't leak orphans.
      await this.storage.delete(key).catch((e) => {
        this.logger.error(`Failed to roll back ${key}: ${(e as Error).message}`);
      });
      throw err;
    }
  }

  /** Multi-file convenience: accept up to 5 files in a single request. */
  async uploadMany(
    productId: string,
    files: Array<{ buffer: Buffer; mimetype: string; originalname: string }>,
    dto: UploadImageDto,
  ): Promise<ProductImageWithUrls[]> {
    const out: ProductImageWithUrls[] = [];
    for (const file of files) {
      out.push(await this.uploadOne(productId, file, dto));
    }
    return out;
  }

  async reorder(productId: string, ids: string[]): Promise<ProductImageWithUrls[]> {
    await this.assertProductExists(productId);

    const owned = await this.prisma.productImage.findMany({
      where: { productId },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((o) => o.id));
    if (ids.length !== ownedIds.size || !ids.every((id) => ownedIds.has(id))) {
      throw new BadRequestException('errors.image_reorder_mismatch');
    }

    await this.prisma.$transaction(
      ids.map((id, idx) =>
        this.prisma.productImage.update({ where: { id }, data: { position: idx } }),
      ),
    );

    return this.list(productId);
  }

  async setPrimary(productId: string, imageId: string): Promise<ProductImageWithUrls[]> {
    await this.assertProductExists(productId);
    const target = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!target || target.productId !== productId) {
      throw new NotFoundException('errors.not_found');
    }

    await this.prisma.$transaction([
      this.prisma.productImage.updateMany({
        where: { productId, isPrimary: true, NOT: { id: imageId } },
        data: { isPrimary: false },
      }),
      this.prisma.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      }),
    ]);

    return this.list(productId);
  }

  async remove(imageId: string): Promise<void> {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image) throw new NotFoundException('errors.not_found');

    const wasPrimary = image.isPrimary;
    const productId = image.productId;

    await this.prisma.productImage.delete({ where: { id: imageId } });
    await this.storage.delete(image.key).catch((e) => {
      this.logger.error(`Failed to delete ${image.key}: ${(e as Error).message}`);
    });

    if (wasPrimary) {
      // Promote the next image (by position) to primary so the product
      // always has one if any images remain.
      const replacement = await this.prisma.productImage.findFirst({
        where: { productId },
        orderBy: { position: 'asc' },
      });
      if (replacement) {
        await this.prisma.productImage.update({
          where: { id: replacement.id },
          data: { isPrimary: true },
        });
      }
    }
  }

  /**
   * Serialization per docs/celva-algo-images.md §2.5: the API hands the
   * storefront/admin precomputed URLs so the client never builds CF
   * Images URLs itself.
   */
  private decorate(image: ProductImage): ProductImageWithUrls {
    const urls: Record<Variant, string> = {
      original: this.storage.publicUrl(image.key),
      large: this.storage.transformedUrl(image.key, {
        width: 1200,
        quality: 80,
        format: 'auto',
        fit: 'scale-down',
      }),
      medium: this.storage.transformedUrl(image.key, {
        width: 600,
        quality: 80,
        format: 'auto',
        fit: 'scale-down',
      }),
      thumb: this.storage.transformedUrl(image.key, {
        width: 300,
        quality: 80,
        format: 'auto',
        fit: 'cover',
      }),
    };
    return { ...image, urls };
  }

  private async assertProductExists(productId: string): Promise<void> {
    const exists = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!exists) throw new BadRequestException('errors.product_not_found');
  }
}
