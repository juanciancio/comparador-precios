import { performance } from 'node:perf_hooks';
import {
  type CallHandler,
  type ExecutionContext,
  HttpException,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { type Observable, catchError, tap, throwError } from 'rxjs';
import type { Logger } from '../../../lib/logger.ts';

/**
 * Mide la duración de cada request y emite UN log estructurado por request
 * completada (reemplaza el autoLogging de nestjs-pino, apagado en app.module).
 * La duración va al log y al header `x-response-time-ms` (para debugging desde
 * el cliente), NUNCA al response body.
 */
@Injectable()
export class TimingInterceptor implements NestInterceptor {
  constructor(private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = performance.now();
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const finish = (statusCode: number): void => {
      const durationMs = Math.round((performance.now() - start) * 10) / 10;
      if (!res.headersSent) res.setHeader('x-response-time-ms', String(durationMs));
      this.logger.info(
        {
          step: 'request',
          method: req.method,
          path: req.originalUrl,
          status_code: statusCode,
          duration_ms: durationMs,
          ip: req.ip,
          user_agent: req.headers['user-agent'],
        },
        'request completed',
      );
    };

    return next.handle().pipe(
      tap(() => finish(res.statusCode)),
      catchError((err: unknown) => {
        // El status real lo pone el exception filter después; acá lo derivamos
        // del error para que el log y el header lo reflejen.
        const statusCode = err instanceof HttpException ? err.getStatus() : 500;
        finish(statusCode);
        return throwError(() => err);
      }),
    );
  }
}
