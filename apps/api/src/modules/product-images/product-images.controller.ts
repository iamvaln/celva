import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IMAGE, USER_ROLE } from '@celva/shared';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { ProductImagesService } from './product-images.service';
import { UploadImageDto } from './dto/upload-image.dto';
import { ReorderImagesDto } from './dto/reorder-images.dto';

const MAX_FILES_PER_REQUEST = 5;

@ApiTags('product-images')
@Controller({ path: 'products/:productId/images', version: '1' })
export class ProductImagesController {
  constructor(private readonly images: ProductImagesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "List a product's images in position order with R2 + CF Images URLs." })
  list(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.images.list(productId);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Up to 5 images per request (JPEG, PNG or WebP, max 5MB each).',
        },
        altText: {
          type: 'object',
          properties: { fr: { type: 'string' }, en: { type: 'string' } },
          nullable: true,
        },
      },
      required: ['files'],
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_PER_REQUEST, {
      limits: { fileSize: IMAGE.MAX_BYTES, files: MAX_FILES_PER_REQUEST },
    }),
  )
  @AuditLog({ action: 'CREATE', entity: 'ProductImage' })
  upload(
    @Param('productId', ParseUUIDPipe) productId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadImageDto,
  ) {
    return this.images.uploadMany(
      productId,
      files.map((f) => ({ buffer: f.buffer, mimetype: f.mimetype, originalname: f.originalname })),
      dto,
    );
  }

  @Patch('order')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @AuditLog({ action: 'UPDATE', entity: 'ProductImage' })
  reorder(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: ReorderImagesDto,
  ) {
    return this.images.reorder(productId, dto.ids);
  }

  @Patch(':imageId/primary')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @AuditLog({ action: 'UPDATE', entity: 'ProductImage' })
  setPrimary(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.images.setPrimary(productId, imageId);
  }

  @Delete(':imageId')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditLog({ action: 'DELETE', entity: 'ProductImage' })
  async remove(
    @Param('productId', ParseUUIDPipe) _productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ): Promise<void> {
    await this.images.remove(imageId);
  }
}
