import { retailers } from '../config/retailers.ts';

/**
 * Config y overrides específicos de Masonline. Por ahora la config genérica
 * (host, treeDepth, skipDepartmentPatterns) alcanza; los overrides futuros
 * (ej. departamentos que necesiten tratamiento especial) van acá.
 */
export const masonlineConfig = retailers.masonline;
