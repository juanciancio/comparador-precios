import { Injectable } from '@nestjs/common';
import type { Db } from '../../../lib/db.ts';
import { InjectPg } from '../../common/database/database.tokens.ts';

export interface HealthStatus {
  database: boolean;
  uptimeSeconds: number;
}

@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  constructor(@InjectPg() private readonly sql: Db) {}

  async check(): Promise<HealthStatus> {
    let database = false;
    try {
      await this.sql`SELECT 1`;
      database = true;
    } catch {
      database = false;
    }
    return {
      database,
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }
}
