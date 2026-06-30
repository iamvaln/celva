import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type AppSource as PrismaAppSource, type AuditLog } from '@prisma/client';
import type { AppSource } from '@celva/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ListAuditLogsQuery } from './dto/list-audit-logs.query';

export type AuditLogEntry = {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  appSource: AppSource;
  metadata?: Record<string, unknown>;
};

const USER_SELECT = {
  user: { select: { id: true, name: true, email: true } },
} as const;

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

  /** Read-only listing for the admin "Journal d'audit" (paginated, desc). */
  async listForAdmin(query: ListAuditLogsQuery): Promise<{
    data: AuditLog[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const where: Prisma.AuditLogWhereInput = {
      // action/entity are SearchInput-driven in the admin — partial / case-
      // insensitive match so typing "delete" finds DELETE and ACCOUNT_DELETE,
      // "order" finds Order, etc.
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {}),
      ...(query.entity ? { entity: { contains: query.entity, mode: 'insensitive' } } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.appSource ? { appSource: query.appSource as PrismaAppSource } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lt: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: USER_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }
}
