import { type ExecutionContext, createParamDecorator } from '@nestjs/common';
import { APP_SOURCE, APP_SOURCE_HEADER, type AppSource } from '@celva/shared';

export const AppSourceHeader = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AppSource => {
    const request = ctx.switchToHttp().getRequest<{ headers: Record<string, string | string[]> }>();
    const raw = request.headers[APP_SOURCE_HEADER.toLowerCase()];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value && (Object.values(APP_SOURCE) as string[]).includes(value)) {
      return value as AppSource;
    }
    return APP_SOURCE.API;
  },
);
