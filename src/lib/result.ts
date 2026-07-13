/**
 * Tipo Result para I/O externo: nada de throws de errores esperados.
 * Los throws quedan reservados para bugs de programador (invariantes rotos).
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
