/**
 * Último segmento de un `category_path`, o `null` si el producto no tiene
 * sub-categoría.
 *
 * `products.category_path` es un path estilo VTEX: siempre arranca y termina con
 * `/` (verificado: 39.713/39.713 filas), con 1 a 4 segmentos. La hoja es el
 * último segmento no vacío.
 *
 * **Un path de un solo segmento no tiene hoja.** `/Huevos/` es un departamento
 * top-level, no una sub-categoría: devolver `'Huevos'` haría que el producto sea
 * "similar" a todo el departamento, que no es la relación que se quiere. Son 15
 * productos en el catálogo, todos de la taxonomía plana de una de las cadenas.
 *
 * El equivalente en SQL es un `regexp_replace` sobre el path trimeado que borra
 * todo hasta la última barra; las dos formas tienen que dar el mismo string o el
 * endpoint de similares compara la hoja de A contra otra cosa. Ver
 * `products.repository.ts:similarProducts`.
 */
export function categoryLeaf(path: string | null): string | null {
  if (!path) return null;
  const segments = path.split('/').filter((s) => s.length > 0);
  if (segments.length < 2) return null;
  return segments[segments.length - 1] ?? null;
}

/**
 * Escapa los metacaracteres de LIKE para que el valor se compare literal.
 *
 * Sin esto, una hoja con `_` (comodín de un carácter en LIKE) matchearía hojas
 * ajenas. El carácter de escape es `\`, que es el default de Postgres — por eso
 * no hace falta cláusula `ESCAPE` en la query.
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
