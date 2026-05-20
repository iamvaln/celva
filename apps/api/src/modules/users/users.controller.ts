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
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuditLog } from '../../common/interceptors/audit-log.interceptor';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQuery } from './dto/list-users.query';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller({ path: 'users', version: '1' })
@Roles(USER_ROLE.ADMIN)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users with filters (admin only).' })
  list(@Query() query: ListUsersQuery) {
    return this.users.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findById(id);
  }

  @Post()
  @AuditLog({ action: 'CREATE', entity: 'User', entityIdFrom: 'response.id' })
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch(':id')
  @AuditLog({ action: 'UPDATE', entity: 'User', entityIdFrom: 'params.id' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.users.update(id, dto, actingUser.id);
  }

  @Patch(':id/activate')
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'User', entityIdFrom: 'params.id' })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.activate(id);
  }

  @Patch(':id/deactivate')
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'User', entityIdFrom: 'params.id' })
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.users.deactivate(id, actingUser.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditLog({ action: 'DELETE', entity: 'User', entityIdFrom: 'params.id' })
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actingUser: AuthenticatedUser,
  ): Promise<void> {
    await this.users.softDelete(id, actingUser.id);
  }
}
