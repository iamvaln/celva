import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { USER_ROLE } from '@celva/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLogsService } from './audit-logs.service';
import { ListAuditLogsQuery } from './dto/list-audit-logs.query';

@ApiTags('audit-logs')
@ApiBearerAuth('access-token')
@Controller({ path: 'audit-logs', version: '1' })
@Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
export class AuditLogsController {
  constructor(private readonly auditLogs: AuditLogsService) {}

  @Get('admin')
  @ApiOperation({
    summary:
      'Paginated audit-log read for the admin "Journal d\'audit" — filters: action, entity, userId, appSource, from/to. Sort: createdAt desc.',
  })
  listAdmin(@Query() query: ListAuditLogsQuery) {
    return this.auditLogs.listForAdmin(query);
  }
}
