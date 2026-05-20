import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { USER_ROLE } from '@celva/shared';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { SettingsService } from './settings.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpsertSettingDto } from './dto/upsert-setting.dto';

@ApiTags('settings')
@Controller({ path: 'settings', version: '1' })
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Settings exposed to the storefront (no auth).' })
  listPublic() {
    return this.settings.listPublic();
  }

  @Get()
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  list() {
    return this.settings.listAll();
  }

  @Get(':key')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  findOne(@Param('key') key: string) {
    return this.settings.get(key);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'CREATE', entity: 'Setting', entityIdFrom: 'response.id' })
  create(@Body() dto: CreateSettingDto) {
    return this.settings.create(dto);
  }

  @Patch(':key')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'UPDATE', entity: 'Setting', entityIdFrom: 'params.id' })
  update(@Param('key') key: string, @Body() dto: UpsertSettingDto) {
    return this.settings.update(key, dto);
  }

  @Delete(':key')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditLog({ action: 'DELETE', entity: 'Setting', entityIdFrom: 'params.id' })
  async remove(@Param('key') key: string): Promise<void> {
    await this.settings.remove(key);
  }
}
