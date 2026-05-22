import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { type Observable, map } from 'rxjs';
import { REQUEST_ID_HEADER } from '@celva/shared';

export type SuccessEnvelope<T> = {
  data: T;
  requestId?: string;
};

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, SuccessEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<SuccessEnvelope<T>> {
    return next.handle().pipe(
      map((data) => {
        const request = context.switchToHttp().getRequest<{
          headers: Record<string, string | string[]>;
        }>();
        const requestId = request.headers[REQUEST_ID_HEADER.toLowerCase()] as string | undefined;
        return { data, requestId };
      }),
    );
  }
}
