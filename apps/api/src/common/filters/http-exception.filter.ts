import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { I18nContext, I18nService } from 'nestjs-i18n';
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

  constructor(private readonly i18nService: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const lang = this.detectLang(host, request);

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

  private detectLang(host: ArgumentsHost, request: Request): string {
    const fromContext = I18nContext.current(host)?.lang;
    if (fromContext) return fromContext;
    const acceptLang = request.header('accept-language');
    if (acceptLang) {
      const first = acceptLang.split(',')[0]?.split(';')[0]?.trim().toLowerCase().split('-')[0];
      if (first === 'fr' || first === 'en') return first;
    }
    return 'fr';
  }

  private translate(key: string, lang: string): string {
    // Only translate keys that look like our i18n namespace ("errors.X").
    if (!/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(key)) return key;
    try {
      const translated = this.i18nService.t(key, { lang });
      return typeof translated === 'string' && translated !== key ? translated : key;
    } catch {
      return key;
    }
  }
}
