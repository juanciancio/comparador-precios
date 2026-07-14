import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { HealthService } from './health.service.ts';

const HEALTH_EXAMPLE = {
  status: 'ok',
  database: 'reachable',
  uptime_seconds: 42,
};

const HEALTH_DEGRADED_EXAMPLE = {
  status: 'degraded',
  database: 'unreachable',
  uptime_seconds: 42,
};

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Liveness + DB reachability',
    description:
      'Returns 200 when the API can reach the database, 503 otherwise. ' +
      'Meant for uptime probes and load balancer health checks.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'API is up and the database responded to `SELECT 1`.',
    schema: { example: HEALTH_EXAMPLE },
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'API is up but the database did not respond.',
    schema: { example: HEALTH_DEGRADED_EXAMPLE },
  })
  async get(@Res({ passthrough: true }) res: Response): Promise<{
    status: 'ok' | 'degraded';
    database: 'reachable' | 'unreachable';
    uptime_seconds: number;
  }> {
    const { database, uptimeSeconds } = await this.health.check();
    res.status(database ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return {
      status: database ? 'ok' : 'degraded',
      database: database ? 'reachable' : 'unreachable',
      uptime_seconds: uptimeSeconds,
    };
  }
}
