import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@celva.store';
const ADMIN_PASSWORD = 'ChangeMe123!';
const SUITE_TAG = `e2e-po-${Date.now()}`;

describe('Purchase orders (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let adminToken = '';
  let supplierId = '';
  let materialAId = '';
  let materialBId = '';

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET ??= 'b'.repeat(32);
    process.env.COOKIE_SECRET ??= 'c'.repeat(32);
    process.env.DATABASE_URL ??=
      'postgresql://valentine@localhost:5432/celva?schema=public';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser(process.env.COOKIE_SECRET));
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api', { exclude: ['health'] });
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
    server = app.getHttpServer();
    prisma = app.get(PrismaService);

    await prisma.rawMaterial.deleteMany({ where: { name: { startsWith: SUITE_TAG } } });
    await prisma.supplier.deleteMany({ where: { name: { startsWith: SUITE_TAG } } });

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = login.body.data.accessToken;

    const supplier = await prisma.supplier.create({
      data: { name: `${SUITE_TAG} Supplier` },
    });
    supplierId = supplier.id;
    const a = await prisma.rawMaterial.create({
      data: { name: `${SUITE_TAG} Coton`, type: 'FABRIC', unit: 'm', unitPrice: 1500, stockQty: 0, supplierId },
    });
    const b = await prisma.rawMaterial.create({
      data: { name: `${SUITE_TAG} Boutons`, type: 'ACCESSORY', unit: 'pièce', unitPrice: 50, stockQty: 0, supplierId },
    });
    materialAId = a.id;
    materialBId = b.id;
  });

  afterAll(async () => {
    const pos = await prisma.purchaseOrder.findMany({
      where: { supplierId },
      select: { id: true },
    });
    const poIds = pos.map((p) => p.id);
    if (poIds.length > 0) {
      await prisma.transaction.deleteMany({ where: { purchaseOrderId: { in: poIds } } });
      await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: { in: poIds } } });
      await prisma.purchaseOrderCost.deleteMany({ where: { purchaseOrderId: { in: poIds } } });
      await prisma.purchaseOrder.deleteMany({ where: { id: { in: poIds } } });
    }
    await prisma.rawMaterial.deleteMany({ where: { name: { startsWith: SUITE_TAG } } });
    await prisma.supplier.deleteMany({ where: { name: { startsWith: SUITE_TAG } } });
    await app?.close();
  });

  const createDraft = async (): Promise<{ id: string; items: Array<{ id: string; rawMaterialId: string }> }> => {
    const res = await request(server)
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId,
        items: [
          { rawMaterialId: materialAId, quantity: 10, unitPrice: 1500 }, // 15,000
          { rawMaterialId: materialBId, quantity: 100, unitPrice: 50 }, // 5,000
        ],
        costs: [{ type: 'TRANSPORT', amount: 2000 }], // +2,000
        notes: `${SUITE_TAG} PO`,
      })
      .expect(201);
    return { id: res.body.data.id, items: res.body.data.items };
  };

  describe('Create + totals', () => {
    it('computes totalAmount = Σ items + Σ costs', async () => {
      const po = await createDraft();
      const fetched = await request(server)
        .get(`/api/v1/purchase-orders/${po.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      // 15,000 + 5,000 + 2,000 = 22,000
      expect(Number(fetched.body.data.totalAmount)).toBe(22_000);
      expect(fetched.body.data.status).toBe('DRAFT');
      expect(fetched.body.data.items).toHaveLength(2);
      expect(fetched.body.data.costs).toHaveLength(1);
    });

    it('rejects unknown raw material (400)', async () => {
      await request(server)
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierId,
          items: [{ rawMaterialId: '00000000-0000-0000-0000-000000000000', quantity: 1, unitPrice: 1 }],
        })
        .expect(400);
    });
  });

  describe('Edit + lock', () => {
    it('DRAFT edit recomputes total', async () => {
      const po = await createDraft();
      const res = await request(server)
        .patch(`/api/v1/purchase-orders/${po.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ rawMaterialId: materialAId, quantity: 1, unitPrice: 1000 }], costs: [] })
        .expect(200);
      expect(Number(res.body.data.totalAmount)).toBe(1_000);
    });

    it('ORDERED PO refuses edits (400)', async () => {
      const po = await createDraft();
      await request(server)
        .post(`/api/v1/purchase-orders/${po.id}/order`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      await request(server)
        .patch(`/api/v1/purchase-orders/${po.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'nope' })
        .expect(400);
    });
  });

  describe('Reception', () => {
    it('partial reception → PARTIALLY_RECEIVED, stock += delta, no EXPENSE yet', async () => {
      const po = await createDraft();
      await request(server)
        .post(`/api/v1/purchase-orders/${po.id}/order`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const aBefore = (await prisma.rawMaterial.findUniqueOrThrow({ where: { id: materialAId } })).stockQty;
      const itemA = po.items.find((i) => i.rawMaterialId === materialAId)!;

      const res = await request(server)
        .post(`/api/v1/purchase-orders/${po.id}/receive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ id: itemA.id, quantityReceived: 4 }] })
        .expect(200);
      expect(res.body.data.status).toBe('PARTIALLY_RECEIVED');

      const aAfter = (await prisma.rawMaterial.findUniqueOrThrow({ where: { id: materialAId } })).stockQty;
      expect(Number(aAfter) - Number(aBefore)).toBe(4);

      const tx = await prisma.transaction.count({ where: { purchaseOrderId: po.id } });
      expect(tx).toBe(0);
    });

    it('full reception → RECEIVED + one EXPENSE/RAW_MATERIALS Transaction', async () => {
      const po = await createDraft();
      await request(server)
        .post(`/api/v1/purchase-orders/${po.id}/order`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const itemA = po.items.find((i) => i.rawMaterialId === materialAId)!;
      const itemB = po.items.find((i) => i.rawMaterialId === materialBId)!;

      const res = await request(server)
        .post(`/api/v1/purchase-orders/${po.id}/receive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            { id: itemA.id, quantityReceived: 10 },
            { id: itemB.id, quantityReceived: 100 },
          ],
        })
        .expect(200);
      expect(res.body.data.status).toBe('RECEIVED');

      const txs = await prisma.transaction.findMany({ where: { purchaseOrderId: po.id } });
      expect(txs).toHaveLength(1);
      expect(txs[0]!.type).toBe('EXPENSE');
      expect(txs[0]!.category).toBe('RAW_MATERIALS');
      expect(Number(txs[0]!.amount)).toBe(22_000);
    });

    it('reception overflow rejected (400)', async () => {
      const po = await createDraft();
      await request(server)
        .post(`/api/v1/purchase-orders/${po.id}/order`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const itemA = po.items.find((i) => i.rawMaterialId === materialAId)!;
      await request(server)
        .post(`/api/v1/purchase-orders/${po.id}/receive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ id: itemA.id, quantityReceived: 999 }] })
        .expect(400);
    });

    it('cannot receive a DRAFT (400)', async () => {
      const po = await createDraft();
      const itemA = po.items.find((i) => i.rawMaterialId === materialAId)!;
      await request(server)
        .post(`/api/v1/purchase-orders/${po.id}/receive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ id: itemA.id, quantityReceived: 1 }] })
        .expect(400);
    });
  });

  describe('Cancel', () => {
    it('cancels a DRAFT', async () => {
      const po = await createDraft();
      const res = await request(server)
        .post(`/api/v1/purchase-orders/${po.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.data.status).toBe('CANCELLED');
    });

    it('cannot cancel once items received (400)', async () => {
      const po = await createDraft();
      await request(server)
        .post(`/api/v1/purchase-orders/${po.id}/order`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const itemA = po.items.find((i) => i.rawMaterialId === materialAId)!;
      await request(server)
        .post(`/api/v1/purchase-orders/${po.id}/receive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ id: itemA.id, quantityReceived: 1 }] })
        .expect(200);
      await request(server)
        .post(`/api/v1/purchase-orders/${po.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('List', () => {
    it('filters by status + supplier', async () => {
      const res = await request(server)
        .get(`/api/v1/purchase-orders?supplierId=${supplierId}&status=DRAFT&pageSize=50`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const rows = res.body.data.data as Array<{ status: string; supplierId: string }>;
      expect(rows.every((r) => r.status === 'DRAFT')).toBe(true);
    });
  });
});
