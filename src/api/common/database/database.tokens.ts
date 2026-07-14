import { Inject } from '@nestjs/common';

/**
 * DI token for the shared porsager `postgres` client. The client is a value
 * (not a class/interface), so it cannot be injected by type — consumers use
 * `@InjectPg()`.
 */
export const PG_CONNECTION = 'PG_CONNECTION' as const;

/** Convenience decorator: `constructor(@InjectPg() private readonly sql: Db) {}`. */
export const InjectPg = (): ParameterDecorator => Inject(PG_CONNECTION);
