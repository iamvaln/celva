import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Observable, tap } from 'rxjs';
import { APP_SOURCE, APP_SOURCE_HEADER, type AppSource } from '@celva/shared';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

export const AUDIT_LOG_KEY = 'audit_log';

export type AuditLogOptions = {
  action: string;
  entity: string;
  /**
   * Where to read the affected entity's id from at log time.
   * - params.id   → :id route param
   * - body.id     → request body's `id` field
   * - response.id → controller return value's `id` field
   * - user.id     → the authenticated user's id (for self-actions)
   */
  entityIdFrom?: 'params.id' | 'body.id' | 'response.id' | 'user.id';
};

export const AuditLog = (options: AuditLogOptions) => {
  return (target: object, key?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(AUDIT_LOG_KEY, options, descriptor.value);
    } else {
      Reflect.defineMetadata(AUDIT_LOG_KEY, options, target);
    }
  };
};

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogs: AuditLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<AuditLogOptions | undefined>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    return next.handle().pipe(
      tap((response) => {
        if (!options) return;
        const request = context.switchToHttp().getRequest<{
          user?: AuthenticatedUser;
          params: Record<string, string>;
          body: Record<string, unknown>;
          headers: Record<string, string | string[]>;
        }>();

        const userId = request.user?.id;
        if (!userId) return;

        const entityId =
          options.entityIdFrom === 'params.id'
            ? request.params.id
            : options.entityIdFrom === 'body.id'
              ? (request.body?.id as string | undefined)
              : options.entityIdFrom === 'response.id'
                ? ((response as { id?: string } | undefined)?.id ?? '')
                : options.entityIdFrom === 'user.id'
                  ? userId
                  : '';

        const rawSource = request.headers[APP_SOURCE_HEADER.toLowerCase()];
        const sourceCandidate = Array.isArray(rawSource) ? rawSource[0] : rawSource;
        const appSource: AppSource = (Object.values(APP_SOURCE) as string[]).includes(
          sourceCandidate ?? '',
        )
          ? (sourceCandidate as AppSource)
          : APP_SOURCE.API;

        void this.auditLogs
          .record({
            userId,
            action: options.action,
            entity: options.entity,
            entityId: entityId ?? '',
            appSource,
          })
          .catch((err) =>
            this.logger.error(`Failed to write AuditLog: ${(err as Error).message}`),
          );
      }),
    );
  }
}
