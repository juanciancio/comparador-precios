import { defineConfig } from 'vitest/config';

// Tests del scraper (unit puros: normalización, parsing). Corren con el transform
// default de vitest (esbuild) — no necesitan decorator metadata. Los tests de la
// API viven en tests/api/ y usan vitest.api.config.ts (SWC + Nest).
export default defineConfig({
  test: {
    include: ['tests/*.test.ts'],
  },
});
