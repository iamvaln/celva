import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { type Observable, tap } from 'rxjs';
import { REQUEST_ID_HEADER } from '@celva/shared';
import { createHash } from 'node:crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Http');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const started = Date.now();
    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      ip?: string;
      headers: Record<string, string | string[]>;
      user?: { id: string };
    }>();

    const reqId = (request.headers[REQUEST_ID_HEADER.toLowerCase()] as string) ?? '-';
    const ipHash = request.ip ? createHash('sha256').update(request.ip).digest('hex').slice(0, 12) : '-';

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - started;
          const response = context.switchToHttp().getResponse<{ statusCode: number }>();
          this.logger.log(
            `${request.method} ${request.url} ${response.statusCode} ${ms}ms reqId=${reqId} ipHash=${ipHash} user=${request.user?.id ?? '-'}`,
          );
        },
        error: (err) => {
          const ms = Date.now() - started;
          this.logger.warn(
            `${request.method} ${request.url} ERR ${ms}ms reqId=${reqId} ipHash=${ipHash} - ${(err as Error).message}`,
          );
        },
      }),
    );
  }
}
