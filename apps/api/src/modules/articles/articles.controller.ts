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
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ListArticlesQuery } from './dto/list-articles.query';

@ApiTags('articles')
@Controller({ path: 'articles', version: '1' })
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  // ── Public ──────────────────────────────────────────────────────────

  @Get()
  @Public()
  @ApiOperation({
    summary:
      'List PUBLISHED articles (storefront). Filters: category, search, sort. Drafts never appear here.',
  })
  list(@Query() query: ListArticlesQuery) {
    return this.articles.listPublished(query);
  }

  @Get('by-slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Look up a published article by slug (storefront).' })
  findBySlug(@Param('slug') slug: string) {
    return this.articles.findPublishedBySlug(slug);
  }

  // ── Admin ───────────────────────────────────────────────────────────

  @Get('admin')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @ApiOperation({
    summary:
      'List all articles incl. drafts (admin). Same filters as public, plus isPublished=true|false to toggle the publish state.',
  })
  listAdmin(@Query() query: ListArticlesQuery) {
    return this.articles.listForAdmin(query);
  }

  @Get('admin/:id')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.articles.findByIdForAdmin(id);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @AuditLog({ action: 'CREATE', entity: 'Article', entityIdFrom: 'response.id' })
  create(@Body() dto: CreateArticleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.articles.create(dto, user.id);
  }

  @Patch('admin/:id')
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @AuditLog({ action: 'UPDATE', entity: 'Article', entityIdFrom: 'params.id' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateArticleDto) {
    return this.articles.update(id, dto);
  }

  @Post('admin/:id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'Article', entityIdFrom: 'params.id' })
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.articles.publish(id);
  }

  @Post('admin/:id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
  @AuditLog({ action: 'STATUS_CHANGE', entity: 'Article', entityIdFrom: 'params.id' })
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.articles.unpublish(id);
  }

  @Delete('admin/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @Roles(USER_ROLE.ADMIN)
  @AuditLog({ action: 'DELETE', entity: 'Article', entityIdFrom: 'params.id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.articles.remove(id);
  }
}
