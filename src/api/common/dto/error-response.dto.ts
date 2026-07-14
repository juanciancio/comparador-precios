import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Shape consistente de TODA respuesta de error de la API (lo emite el global
 * exception filter). Documentado en OpenAPI para 400/404/500.
 */
export const ErrorResponseSchema = z.object({
  statusCode: z.number(),
  // Un string, o varios (p. ej. issues de validación Zod).
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string(),
  path: z.string(),
  timestamp: z.string(),
  trace_id: z.string(),
});
export class ErrorResponseDto extends createZodDto(ErrorResponseSchema) {}
