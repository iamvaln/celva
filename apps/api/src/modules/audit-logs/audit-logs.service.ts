import { Injectable, Logger } from '@nestjs/common';
import type { AppSource } from '@celva/shared';
import { PrismaService } from '../prisma/prisma.service';

export type AuditLogEntry = {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  appSource: AppSource;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          appSource: entry.appSource,
          metadata: entry.metadata as never,
        },
      });
    } catch (err) {
      this.logger.error(`AuditLog write failed: ${(err as Error).message}`);
    }
  }
}
