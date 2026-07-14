import { randomUUID } from 'node:crypto';
import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Logger } from '../../../lib/logger.ts';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
  trace_id: string;
}

/**
 * Filtro global de excepciones. Unifica el shape de error de toda la API y
 * separa dos mundos:
 *  - HttpException (400/404/etc., errores esperados): se devuelve el status y
 *    message del throw original.
 *  - Cualquier otra cosa (500, no esperado): se loguea el stack completo con
 *    pino y al cliente le sale un genérico sanitizado — NUNCA el stack ni el
 *    mensaje interno (evita filtrar detalle de implementación / datos).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    // trace_id: se respeta el del cliente (x-trace-id) para correlación end-to-end,
    // o se genera uno.
    const headerTraceId = req.headers['x-trace-id'];
    const traceId =
      (Array.isArray(headerTraceId) ? headerTraceId[0] : headerTraceId) || randomUUID();

    let statusCode: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
        error = exception.name;
      } else {
        const r = response as { message?: string | string[]; error?: string };
        message = r.message ?? exception.message;
        error = r.error ?? exception.name;
      }
    } else {
      statusCode = 500;
      message = 'Internal server error';
      error = 'Internal Server Error';
      // Solo los 500 se loguean acá (con stack). Los HttpException esperados ya
      // los reporta el timing interceptor con su status; no ensuciamos con stacks.
      this.logger.error(
        { step: 'unhandled_exception', trace_id: traceId, method: req.method, path: req.originalUrl, err: exception },
        'unhandled exception',
      );
    }

    const body: ErrorBody = {
      statusCode,
      message,
      error,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
      trace_id: traceId,
    };
    res.status(statusCode).json(body);
  }
}
