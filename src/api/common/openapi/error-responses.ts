import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto.ts';

/**
 * Decoradores reusables para documentar los errores en OpenAPI. Todos comparten
 * el shape de ErrorResponseDto (lo emite el global exception filter).
 */

const badRequestExample = {
  statusCode: 400,
  message: 'q requiere al menos 2 caracteres',
  error: 'Bad Request',
  path: '/search?q=a',
  timestamp: '2026-07-14T13:00:00.000Z',
  trace_id: '3f1c2e8a-9b4d-4a2e-8c1f-0a1b2c3d4e5f',
};

const notFoundExample = {
  statusCode: 404,
  message: 'No existe producto con EAN 9999999999999',
  error: 'Not Found',
  path: '/products/9999999999999',
  timestamp: '2026-07-14T13:00:00.000Z',
  trace_id: '3f1c2e8a-9b4d-4a2e-8c1f-0a1b2c3d4e5f',
};

const serverErrorExample = {
  statusCode: 500,
  message: 'Internal server error',
  error: 'Internal Server Error',
  path: '/products',
  timestamp: '2026-07-14T13:00:00.000Z',
  trace_id: '3f1c2e8a-9b4d-4a2e-8c1f-0a1b2c3d4e5f',
};

export const ApiBadRequest = (): MethodDecorator =>
  ApiResponse({
    status: 400,
    type: ErrorResponseDto,
    description: 'Parámetros inválidos (falla la validación Zod de query/params).',
    example: badRequestExample,
  });

export const ApiNotFound = (description: string): MethodDecorator =>
  ApiResponse({ status: 404, type: ErrorResponseDto, description, example: notFoundExample });

export const ApiServerError = (): MethodDecorator =>
  ApiResponse({
    status: 500,
    type: ErrorResponseDto,
    description:
      'Error interno no esperado. El response va sanitizado (sin stack ni ' +
      'mensaje interno); el `trace_id` permite correlacionar con los logs.',
    example: serverErrorExample,
  });

/** Errores comunes a endpoints con validación de input pero sin recurso por id. */
export const ApiCommonErrors = (): ClassDecorator & MethodDecorator =>
  applyDecorators(ApiBadRequest(), ApiServerError());
