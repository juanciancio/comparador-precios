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
//
// `*_list_price` es el precio de lista (tachado) de cada cadena; `*_price` es el
// efectivo, con los descuentos que VTEX ya aplicó. Cuando difieren, el efectivo
// puede depender de una condición que el usuario no cumple (ej. tarjeta Mi Crf):
// list > price en 44,7% del catálogo vigente de Carrefour y 20,1% del de Masonline.
// Ver research/precios-descuento/HALLAZGOS.md.
//
// Nullable a propósito: price_history.list_price admite NULL. Hoy son 0 filas de
// 47.358, pero el contrato no puede prometer lo que la columna no garantiza.
//
// `diff_pct` y `cheaper` siguen calculándose sobre `price`, sin cambios. Comparar
// sobre precios de lista (o sobre el precio físico no-socio) es una decisión de
// producto de Fase B4, no de esta capa.
//
// `*_price_without_discount`: precio base sin el descuento ya aplicado a `*_price`.
// En Carrefour es el no-socio (quien no tiene Mi Crf); `*_price` es el de socio. Es
// lo que el frontend necesita para el badge "más barato" sobre el precio físico.
// snake_case por cadena, consistente con el resto del contrato de /compare (no
// camelCase: acá no existe `listPrice`, existe `masonline_list_price`).
//
// `*_has_mi_crf_discount`: trigger del tratamiento visual Mi Crf, derivado en el backend
// de discount_highlight (ver src/lib/mi-crf.ts). boolean, nunca null. `masonline_*` es
// siempre false (Masonline no tiene Mi Crf), se expone igual para simetría con el par y
// para que el frontend no chequee existencia del campo.
export const CompareRowSchema = z.object({
  ean: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  masonline_price: z.number(),
  masonline_list_price: z.number().nullable(),
  masonline_price_without_discount: z.number().nullable(),
  masonline_has_mi_crf_discount: z.boolean(),
  carrefour_price: z.number(),
  carrefour_list_price: z.number().nullable(),
  carrefour_price_without_discount: z.number().nullable(),
  carrefour_has_mi_crf_discount: z.boolean(),
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
