import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  type StudioAppointmentMode,
  type StudioGender,
  type StudioOrderMeasureMode,
  type StudioRequest,
  type StudioRequestStatus,
  type StudioRequestType,
} from '@prisma/client';
import { APP_SOURCE, type AppSource, SETTING_KEYS } from '@celva/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import {
  buildStudioRequestCustomerEmail,
  buildStudioRequestInternalEmail,
} from '../studio-emails';
import { CreateStudioRequestDto } from './dto/create-studio-request.dto';
import { ListStudioRequestsQuery } from './dto/list-studio-requests.query';
import { StudioTransitionStatusDto } from './dto/transition-studio-request.dto';

const ADMIN_INCLUDE = {
  model: { select: { id: true, slug: true, name: true, coverImage: true } },
  fabric: { select: { id: true, name: true, swatchImage: true, photoImage: true } },
} as const;

/** Allowed forward transitions. REJECTED is a side-jump from any non-terminal state. */
const ALLOWED_TRANSITIONS: Record<StudioRequestStatus, StudioRequestStatus[]> = {
  PENDING: ['CONTACTED', 'REJECTED'],
  CONTACTED: ['CONFIRMED', 'REJECTED'],
  CONFIRMED: ['COMPLETED', 'REJECTED'],
  COMPLETED: [],
  REJECTED: [],
};

@Injectable()
export class StudioRequestsService {
  private readonly logger = new Logger(StudioRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  // ── Public ──────────────────────────────────────────────────────────

  async create(
    dto: CreateStudioRequestDto,
    appSource: AppSource,
  ): Promise<{ id: string }> {
    // Confirm referenced model/fabric exist when provided.
    if (dto.modelId) {
      const model = await this.prisma.studioModel.findUnique({
        where: { id: dto.modelId },
        select: { id: true, isActive: true },
      });
      if (!model || !model.isActive) {
        throw new BadRequestException('errors.not_found');
      }
    }
    if (dto.fabricId) {
      const fabric = await this.prisma.studioFabric.findUnique({
        where: { id: dto.fabricId },
        select: { id: true, modelId: true, isActive: true },
      });
      if (!fabric || !fabric.isActive) {
        throw new BadRequestException('errors.not_found');
      }
      if (dto.modelId && fabric.modelId !== dto.modelId) {
        // Fabric doesn't belong to the chosen model.
        throw new BadRequestException('errors.not_found');
      }
    }

    const created = await this.prisma.studioRequest.create({
      data: {
        type: dto.type as StudioRequestType,
        customerName: dto.customerName.trim(),
        customerEmail: dto.customerEmail?.trim().toLowerCase() ?? null,
        customerPhone: dto.customerPhone.trim(),
        customerCity: dto.customerCity?.trim() ?? null,
        gender: dto.gender ? (dto.gender as StudioGender) : null,
        skinToneIndex: dto.skinToneIndex ?? null,
        silhouetteSize: dto.silhouetteSize ?? null,
        silhouetteHeight: dto.silhouetteHeight ?? null,
        modelId: dto.modelId ?? null,
        fabricId: dto.fabricId ?? null,
        sizeRef: dto.sizeRef ?? null,
        measurementMode: dto.measurementMode
          ? (dto.measurementMode as StudioOrderMeasureMode)
          : null,
        appointmentMode: dto.appointmentMode
          ? (dto.appointmentMode as StudioAppointmentMode)
          : null,
        appointmentDate: dto.appointmentDate ? new Date(dto.appointmentDate) : null,
        appointmentSlot: dto.appointmentSlot ?? null,
        notes: dto.notes ?? null,
        appSource,
      },
    });

    // Fire-and-forget emails. Failure mustn't block the response.
    void this.dispatchEmails(created.id).catch((err: unknown) => {
      this.logger.error(`Studio email dispatch failed: ${(err as Error).message}`);
    });

    return { id: created.id };
  }

  // ── Admin ──────────────────────────────────────────────────────────

  async listForAdmin(query: ListStudioRequestsQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const where: Prisma.StudioRequestWhereInput = {
      ...(query.type ? { type: query.type as StudioRequestType } : {}),
      ...(query.status ? { status: query.status as StudioRequestStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { customerName: { contains: query.search, mode: 'insensitive' } },
              { customerEmail: { contains: query.search, mode: 'insensitive' } },
              { customerPhone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lt: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const sortBy = query.sortBy ?? 'createdAt';
    const sortDir = query.sortDir ?? 'desc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.studioRequest.findMany({
        where,
        include: ADMIN_INCLUDE,
        orderBy: [{ [sortBy]: sortDir }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.studioRequest.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findByIdForAdmin(id: string): Promise<StudioRequest> {
    const row = await this.prisma.studioRequest.findUnique({
      where: { id },
      include: ADMIN_INCLUDE,
    });
    if (!row) throw new NotFoundException('errors.not_found');
    return row;
  }

  async transition(
    id: string,
    next: StudioTransitionStatusDto,
    internalNote?: string,
  ): Promise<StudioRequest> {
    const existing = await this.prisma.studioRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('errors.not_found');

    const allowed = ALLOWED_TRANSITIONS[existing.status];
    if (!allowed.includes(next as StudioRequestStatus)) {
      throw new BadRequestException('errors.invalid_order_transition');
    }

    return this.prisma.studioRequest.update({
      where: { id },
      data: {
        status: next as StudioRequestStatus,
        ...(internalNote
          ? {
              internalNotes: existing.internalNotes
                ? `${existing.internalNotes}\n\n— ${new Date().toISOString().slice(0, 10)} — ${internalNote}`
                : `— ${new Date().toISOString().slice(0, 10)} — ${internalNote}`,
            }
          : {}),
      },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private async dispatchEmails(requestId: string): Promise<void> {
    const row = await this.prisma.studioRequest.findUnique({
      where: { id: requestId },
      include: {
        model: { select: { name: true } },
        fabric: { select: { name: true } },
      },
    });
    if (!row) return;

    const modelName = pickFr(row.model?.name);
    const fabricName = pickFr(row.fabric?.name);

    const customer = buildStudioRequestCustomerEmail({
      type: row.type,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
      modelName,
      fabricName,
      sizeRef: row.sizeRef,
      appointmentDate: row.appointmentDate
        ? row.appointmentDate.toISOString().slice(0, 10)
        : null,
      appointmentSlot: row.appointmentSlot,
      appointmentMode: row.appointmentMode,
      notes: row.notes,
    });
    if (customer) void this.mail.send(customer).catch(() => undefined);

    const contactEmail = await this.readContactEmail();
    if (contactEmail) {
      const internal = buildStudioRequestInternalEmail({
        to: contactEmail,
        requestId: row.id,
        type: row.type,
        customerName: row.customerName,
        customerEmail: row.customerEmail,
        customerPhone: row.customerPhone,
        modelName,
        fabricName,
        sizeRef: row.sizeRef,
        appointmentDate: row.appointmentDate
          ? row.appointmentDate.toISOString().slice(0, 10)
          : null,
        appointmentSlot: row.appointmentSlot,
        appointmentMode: row.appointmentMode,
        notes: row.notes,
      });
      void this.mail.send(internal).catch(() => undefined);
    }
  }

  private async readContactEmail(): Promise<string | null> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: SETTING_KEYS.CONTACT_EMAIL },
    });
    return setting?.value && setting.value.includes('@') ? setting.value : null;
  }
}

// Local helper: pull the FR side of a bilingual Json field for email copy.
function pickFr(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;
  const obj = json as Record<string, unknown>;
  const fr = obj.fr;
  return typeof fr === 'string' && fr.length > 0
    ? fr
    : typeof obj.en === 'string'
      ? (obj.en as string)
      : null;
}

// Keep an unused import alive for clarity (AppSource is used at the call site).
void APP_SOURCE;
