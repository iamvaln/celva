import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  check() {
    // The endpoint answers one question: "can I serve requests and reach
    // the DB?" — that's what a load balancer / uptime probe needs.
    //
    // Memory indicators were intentionally removed: they made the result
    // depend on host heap/RSS pressure, which flapped the endpoint to 503
    // under sustained load (e.g. the full e2e suite in one process) without
    // signalling anything actionable. Real memory monitoring belongs in
    // APM, not a liveness probe.
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => {
        try {
          await this.prisma.$queryRawUnsafe('SELECT 1');
          return { database: { status: 'up' } };
        } catch (err) {
          return {
            database: {
              status: 'down',
              message: (err as Error).message,
            },
          };
        }
      },
    ]);
  }
}
