import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ─── Query params ────────────────────────────────────────────────────────────

export const CompareQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20).describe('Tamaño de página (1–100).'),
  offset: z.coerce.number().int().min(0).default(0).describe('Desplazamiento para paginar.'),
  brand: z.string().min(1).optional().describe("Marca exacta a filtrar. Ej: 'La Serenísima'"),
  category: z.string().min(1).optional().describe("Substring case-insensitive de categoría. Ej: 'Electro'"),
  min_diff_pct: z.coerce
    .number()
    .min(0)
    .optional()
    .describe('Filtra por |diff_pct| ≥ este valor. Ej: 50 (solo diferencias grandes).'),
  cheaper_at: z
    .enum(['masonline', 'carrefour', 'tie'])
    .optional()
    .describe('Filtra por cuál cadena es más barata (tie = |diff| ≤ 1%).'),
  sort_by: z
    .enum(['diff', 'diff_pct_abs', 'name'])
    .default('diff')
    .describe("Ordenamiento. 'diff' y 'diff_pct_abs' (alias) por |diff_pct|; 'name' por nombre."),
  sort_dir: z.enum(['asc', 'desc']).default('desc').describe('Dirección del ordenamiento.'),
});
export class CompareQueryDto extends createZodDto(CompareQuerySchema) {}

// ─── Response shapes ─────────────────────────────────────────────────────────

// snake_case en *_price y diff_pct fijado por contrato (ver CLAUDE.md).
export const CompareRowSchema = z.object({
  ean: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  masonline_price: z.number(),
  carrefour_price: z.number(),
  diff_pct: z.number(),
  cheaper: z.enum(['masonline', 'carrefour', 'tie']),
});
export class CompareRowDto extends createZodDto(CompareRowSchema) {}

export const CompareResponseSchema = z.object({
  data: z.array(CompareRowSchema),
  pagination: z.object({
    limit: z.number(),
    offset: z.number(),
    total: z.number(),
  }),
});
export class CompareResponseDto extends createZodDto(CompareResponseSchema) {}

const CountPct = z.object({ count: z.number(), pct: z.number() });

export const CompareStatsSchema = z.object({
  total_matched: z.number(),
  diff_histogram: z.array(
    z.object({ bucket: z.string(), count: z.number(), pct: z.number() }),
  ),
  cheaper: z.object({
    masonline: CountPct,
    carrefour: CountPct,
    tie: CountPct,
  }),
  exclusives: z.object({
    masonline_only: z.number(),
    carrefour_only: z.number(),
  }),
});
export class CompareStatsDto extends createZodDto(CompareStatsSchema) {}

export type CompareRow = z.infer<typeof CompareRowSchema>;
export type CompareStats = z.infer<typeof CompareStatsSchema>;
