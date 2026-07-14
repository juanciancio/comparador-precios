import { bootstrap } from '../src/api/main.ts';

bootstrap().catch((err: unknown) => {
  console.error('API failed to start:', err);
  process.exit(1);
});
