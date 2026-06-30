import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import {
  BadRequestException,
  Controller,
  Inject,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IMAGE, USER_ROLE } from '@celva/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { STORAGE_SERVICE, type StorageService } from './storage.types';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Generic single-image upload for editorial assets that aren't tied to a
 * product (article covers, collection heroes). Product images keep their
 * own product-scoped endpoint (`POST /products/:id/images`).
 *
 * Stores the original via the active StorageService and returns its public
 * URL, which the back-office persists directly into the resource field
 * (`Article.coverImage`, `Collection.imageUrl`). No DB row, no schema change.
 */
@ApiTags('uploads')
@Controller({ path: 'uploads', version: '1' })
export class StorageController {
  constructor(@Inject(STORAGE_SERVICE) private readonly storage: StorageService) {}

  @Post('image')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a single editorial image; returns its public URL.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'One image (JPEG, PNG or WebP, max 5MB).',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: IMAGE.MAX_BYTES, files: 1 } }),
  )
  async uploadImage(@UploadedFile() file?: Express.Multer.File): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('errors.image_mime_unsupported');
    }
    if (!IMAGE.ACCEPTED_MIME.includes(file.mimetype as (typeof IMAGE.ACCEPTED_MIME)[number])) {
      throw new BadRequestException('errors.image_mime_unsupported');
    }
    if (file.buffer.byteLength > IMAGE.MAX_BYTES) {
      throw new BadRequestException('errors.image_too_large');
    }

    const ext = MIME_TO_EXT[file.mimetype] ?? extname(file.originalname).slice(1).toLowerCase();
    if (!ext) {
      throw new BadRequestException('errors.image_mime_unsupported');
    }

    const key = `editorial/${randomUUID()}.${ext}`;
    await this.storage.put(key, file.buffer, file.mimetype);

    return { url: this.storage.publicUrl(key) };
  }
}
