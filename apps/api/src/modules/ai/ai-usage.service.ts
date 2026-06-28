import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type RecordUsageInput = {
  feature: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  errorType?: string | null;
  createdById?: string | null;
};

export type AiMetrics = {
  totals: {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    successRate: number; // 0..1
  };
  byFeature: Array<{ feature: string; calls: number; inputTokens: number; outputTokens: number }>;
  byModel: Array<{ model: string; calls: number; inputTokens: number; outputTokens: number }>;
  recent: Array<{
    id: string;
    feature: string;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    success: boolean;
    errorType: string | null;
    createdAt: Date;
  }>;
};

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Log one call. Never throws — usage logging must not break the request. */
  async record(input: RecordUsageInput): Promise<void> {
    try {
      await this.prisma.aiUsage.create({ data: input });
    } catch (err) {
      this.logger.error(`Failed to record AI usage: ${(err as Error).message}`);
    }
  }

  /** Aggregated metrics for the back-office AI dashboard. */
  async metrics(): Promise<AiMetrics> {
    const [agg, successCount, byFeature, byModel, recent] = await Promise.all([
      this.prisma.aiUsage.aggregate({
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true },
      }),
      this.prisma.aiUsage.count({ where: { success: true } }),
      this.prisma.aiUsage.groupBy({
        by: ['feature'],
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true },
      }),
      this.prisma.aiUsage.groupBy({
        by: ['model'],
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true },
      }),
      this.prisma.aiUsage.findMany({
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
    ]);

    const calls = agg._count._all;
    return {
      totals: {
        calls,
        inputTokens: agg._sum.inputTokens ?? 0,
        outputTokens: agg._sum.outputTokens ?? 0,
        successRate: calls > 0 ? successCount / calls : 1,
      },
      byFeature: byFeature
        .map((f) => ({
          feature: f.feature,
          calls: f._count._all,
          inputTokens: f._sum.inputTokens ?? 0,
          outputTokens: f._sum.outputTokens ?? 0,
        }))
        .sort((a, b) => b.calls - a.calls),
      byModel: byModel
        .map((m) => ({
          model: m.model,
          calls: m._count._all,
          inputTokens: m._sum.inputTokens ?? 0,
          outputTokens: m._sum.outputTokens ?? 0,
        }))
        .sort((a, b) => b.calls - a.calls),
      recent: recent.map((r) => ({
        id: r.id,
        feature: r.feature,
        provider: r.provider,
        model: r.model,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        success: r.success,
        errorType: r.errorType,
        createdAt: r.createdAt,
      })),
    };
  }
}
