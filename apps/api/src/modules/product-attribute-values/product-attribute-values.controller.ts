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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { USER_ROLE } from '@celva/shared';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { ProductAttributeValuesService } from './product-attribute-values.service';
import { CreateAttributeValueDto } from './dto/create-attribute-value.dto';
import { UpdateAttributeValueDto } from './dto/update-attribute-value.dto';
import { ListAttributeValuesQuery } from './dto/list-attribute-values.query';

@ApiTags('product-attribute-values')
@Controller({ path: 'attribute-values', version: '1' })
export class ProductAttributeValuesController {
  constructor(private readonly values: ProductAttributeValuesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List attribute values. Filter by attributeId.' })
  list(@Query() query: ListAttributeValuesQuery) {
    return this.values.list(query);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.values.findById(id);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @AuditLog({ action: 'CREATE', entity: 'ProductAttributeValue', entityIdFrom: 'response.id' })
  create(@Body() dto: CreateAttributeValueDto) {
    return this.values.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @AuditLog({ action: 'UPDATE', entity: 'ProductAttributeValue', entityIdFrom: 'params.id' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAttributeValueDto) {
    return this.values.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditLog({ action: 'DELETE', entity: 'ProductAttributeValue', entityIdFrom: 'params.id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.values.remove(id);
  }
}
