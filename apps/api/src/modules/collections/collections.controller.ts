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
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { USER_ROLE } from '@celva/shared';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { ListCollectionsQuery } from './dto/list-collections.query';
import { SetCollectionProductsDto } from './dto/set-collection-products.dto';
import { ReorderCollectionsDto } from './dto/reorder-collections.dto';

@ApiTags('collections')
@Controller({ path: 'collections', version: '1' })
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List collections (public, storefront-friendly).' })
  list(@Query() query: ListCollectionsQuery) {
    return this.collections.list(query);
  }

  @Post('reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @ApiOperation({ summary: 'Persist drag-reordered collection display order.' })
  @AuditLog({ action: 'UPDATE', entity: 'Collection', entityIdFrom: 'user.id' })
  async reorder(@Body() dto: ReorderCollectionsDto): Promise<void> {
    await this.collections.reorder(dto.ids);
  }

  @Get('by-slug/:slug')
  @Public()
  findBySlug(@Param('slug') slug: string) {
    return this.collections.findBySlug(slug);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.collections.findById(id);
  }

  @Get(':id/products')
  @Public()
  @ApiOperation({ summary: 'List the products in this collection, in sortOrder.' })
  listProducts(@Param('id', ParseUUIDPipe) id: string) {
    return this.collections.listProducts(id);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @AuditLog({ action: 'CREATE', entity: 'Collection', entityIdFrom: 'response.id' })
  create(@Body() dto: CreateCollectionDto) {
    return this.collections.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @AuditLog({ action: 'UPDATE', entity: 'Collection', entityIdFrom: 'params.id' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCollectionDto) {
    return this.collections.update(id, dto);
  }

  @Put(':id/products')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @ApiOperation({
    summary: 'Full replacement of the collection’s product list, in display order.',
  })
  @AuditLog({ action: 'UPDATE', entity: 'Collection', entityIdFrom: 'params.id' })
  setProducts(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetCollectionProductsDto,
  ) {
    return this.collections.setProducts(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditLog({ action: 'DELETE', entity: 'Collection', entityIdFrom: 'params.id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.collections.remove(id);
  }
}
