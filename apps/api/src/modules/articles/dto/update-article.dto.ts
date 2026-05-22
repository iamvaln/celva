import { PartialType } from '@nestjs/swagger';
import { CreateArticleDto } from './create-article.dto';

/** Same shape as create, all fields optional. Slug uniqueness re-checked in service if changed. */
export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
