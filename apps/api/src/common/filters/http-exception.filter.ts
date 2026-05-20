import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { I18nContext } from 'nestjs-i18n';
import { REQUEST_ID_HEADER } from '@celva/shared';

type ResponseShape = {
  statusCode: number;
  error: string;
  message: string;
  requestId?: string;
  timestamp: string;
  path: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const i18n = I18nContext.current();
    const lang = i18n?.lang ?? 'fr';

    let message: string;
    let errorName: string;

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      errorName = exception.name;
      if (typeof res === 'string') {
        message = this.translate(res, lang);
      } else if (res && typeof res === 'object' && 'message' in res) {
        const raw = (res as { message: unknown }).message;
        message = Array.isArray(raw)
          ? raw.map((m) => this.translate(String(m), lang)).join('; ')
          : this.translate(String(raw), lang);
      } else {
        message = this.translate('errors.unknown', lang);
      }
    } else {
      errorName = 'InternalServerError';
      message = this.translate('errors.unknown', lang);
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ResponseShape = {
      statusCode: status,
      error: errorName,
      message,
      requestId: request.header(REQUEST_ID_HEADER) ?? undefined,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }

  private translate(key: string, lang: string): string {
    const i18n = I18nContext.current();
    if (!i18n) return key;
    try {
      const translated = i18n.t(key, { lang });
      return typeof translated === 'string' ? translated : key;
    } catch {
      return key;
    }
  }
}
