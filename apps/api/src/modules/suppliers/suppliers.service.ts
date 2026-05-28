import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Supplier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { ListSuppliersQuery } from './dto/list-suppliers.query';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListSuppliersQuery): Promise<{
    data: Supplier[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where: Prisma.SupplierWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { contact: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};
    const sortBy = query.sortBy ?? 'name';
    const sortDir = query.sortDir ?? 'asc';
    const [data, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        orderBy: [{ [sortBy]: sortDir }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.supplier.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async findById(id: string): Promise<Supplier> {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('errors.not_found');
    return supplier;
  }

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    return this.prisma.supplier.create({
      data: {
        name: dto.name.trim(),
        contact: dto.contact ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        address: dto.address ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    await this.findById(id);
    const data: Prisma.SupplierUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.contact !== undefined) data.contact = dto.contact.trim() || null;
    if (dto.phone !== undefined) data.phone = dto.phone.trim() || null;
    if (dto.email !== undefined) data.email = dto.email.trim() || null;
    if (dto.address !== undefined) data.address = dto.address.trim() || null;
    return this.prisma.supplier.update({ where: { id }, data });
  }

  /**
   * Refuses to delete a supplier still referenced by raw materials or
   * purchase orders — those carry historical cost data. Deactivation
   * isn't modeled (no isActive on Supplier), so deletion is the only
   * removal path and must be guarded.
   */
  async remove(id: string): Promise<void> {
    await this.findById(id);
    const [materials, orders] = await Promise.all([
      this.prisma.rawMaterial.count({ where: { supplierId: id } }),
      this.prisma.purchaseOrder.count({ where: { supplierId: id } }),
    ]);
    if (materials > 0 || orders > 0) {
      throw new ConflictException('errors.supplier_in_use');
    }
    await this.prisma.supplier.delete({ where: { id } });
  }
}
