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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { USER_ROLE } from '@celva/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';

@ApiTags('partners')
@ApiBearerAuth('access-token')
@Controller({ path: 'partners', version: '1' })
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  @Get()
  @Roles(USER_ROLE.ADMIN, USER_ROLE.FINANCE)
  @ApiOperation({ summary: 'List partners with their capital account (apports/retraits/net).' })
  list() {
    return this.partners.findAllWithCapital();
  }

  @Get(':id')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.FINANCE)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.partners.findById(id);
  }

  @Post()
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'CREATE', entity: 'Partner', entityIdFrom: 'response.id' })
  create(@Body() dto: CreatePartnerDto) {
    return this.partners.create(dto);
  }

  @Patch(':id')
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'UPDATE', entity: 'Partner', entityIdFrom: 'params.id' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePartnerDto) {
    return this.partners.update(id, dto);
  }

  @Delete(':id')
  @Roles(USER_ROLE.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditLog({ action: 'DELETE', entity: 'Partner', entityIdFrom: 'params.id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.partners.remove(id);
  }
}
