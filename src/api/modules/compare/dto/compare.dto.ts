import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ─── Query params ────────────────────────────────────────────────────────────

export const CompareQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  brand: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  // Filtra por |diff_pct| >= min. Útil para ver solo diferencias grandes.
  min_diff_pct: z.coerce.number().min(0).optional(),
  // Filtra por cuál cadena es más barata (misma tolerancia de tie que el resto).
  cheaper_at: z.enum(['masonline', 'carrefour', 'tie']).optional(),
  // 'diff' y su alias 'diff_pct_abs' ordenan por |diff_pct|; 'name' por nombre.
  sort_by: z.enum(['diff', 'diff_pct_abs', 'name']).default('diff'),
  sort_dir: z.enum(['asc', 'desc']).default('desc'),
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
