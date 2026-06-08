import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS, SETTING_KEYS, TAX_RATE_CAMEROON } from '@celva/shared';
import { requireEnv } from '../src/common/env';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Seeding Celva database...');

  // 1) Admin user — both vars required (no fallback). The admin row is
  // also marked mustChangePassword: true so the operator is forced to set
  // their own password on first sign-in.
  const adminEmail = requireEnv('SEED_ADMIN_EMAIL');
  const adminPassword = requireEnv('SEED_ADMIN_PASSWORD');
  const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: 'Celva Admin',
      role: UserRole.ADMIN,
      passwordHash,
    },
    update: {},
  });
  console.log(`  ✓ Admin user: ${admin.email}`);

  // 2) Default settings
  const settings: Array<{ key: string; value: string; label: { fr: string; en: string } }> = [
    { key: SETTING_KEYS.TAX_RATE, value: String(TAX_RATE_CAMEROON), label: { fr: 'Taux de TVA', en: 'Tax rate' } },
    { key: SETTING_KEYS.MAX_CASH_ON_DELIVERY, value: '100000', label: { fr: 'Plafond paiement à la livraison (XAF)', en: 'Cash on delivery cap (XAF)' } },
    { key: SETTING_KEYS.ORDER_AUTO_COMPLETE_DAYS, value: '7', label: { fr: 'Clôture auto des commandes (jours)', en: 'Auto-complete orders (days)' } },
    { key: SETTING_KEYS.CONSIGNMENT_ALERT_DAYS, value: '14', label: { fr: 'Alerte consignation (jours)', en: 'Consignment alert (days)' } },
    { key: SETTING_KEYS.NEWSLETTER_PROMO_CODE, value: 'WELCOME10', label: { fr: 'Code promo newsletter', en: 'Newsletter promo code' } },
    { key: SETTING_KEYS.INVOICE_COMPANY_NAME, value: 'Celva Design SARL', label: { fr: 'Raison sociale', en: 'Company name' } },
    { key: SETTING_KEYS.INVOICE_TAX_ID, value: '', label: { fr: 'N° contribuable', en: 'Tax ID' } },
    { key: SETTING_KEYS.INVOICE_ADDRESS, value: 'Douala, Cameroun', label: { fr: 'Adresse facturation', en: 'Billing address' } },
    { key: SETTING_KEYS.CONTACT_EMAIL, value: 'contact@celva.store', label: { fr: 'Email contact', en: 'Contact email' } },
    { key: SETTING_KEYS.CONTACT_PHONE, value: '+237000000000', label: { fr: 'Téléphone', en: 'Phone' } },
    { key: SETTING_KEYS.CONTACT_WHATSAPP, value: '+237000000000', label: { fr: 'WhatsApp', en: 'WhatsApp' } },
    { key: SETTING_KEYS.FREE_DELIVERY_ENABLED, value: 'true', label: { fr: 'Livraison gratuite activée', en: 'Free delivery enabled' } },
    { key: SETTING_KEYS.R2_BUCKET_URL, value: requireEnv('R2_PUBLIC_URL'), label: { fr: 'URL publique R2', en: 'R2 public URL' } },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      create: s,
      update: { label: s.label },
    });
  }
  console.log(`  ✓ ${settings.length} settings`);

  // 3) Base categories
  const categories = [
    { slug: 'robes', name: { fr: 'Robes', en: 'Dresses' }, sortOrder: 1 },
    { slug: 'hauts', name: { fr: 'Hauts', en: 'Tops' }, sortOrder: 2 },
    { slug: 'pantalons', name: { fr: 'Pantalons', en: 'Pants' }, sortOrder: 3 },
    { slug: 'jupes', name: { fr: 'Jupes', en: 'Skirts' }, sortOrder: 4 },
    { slug: 'accessoires', name: { fr: 'Accessoires', en: 'Accessories' }, sortOrder: 5 },
    { slug: 'sacs', name: { fr: 'Sacs', en: 'Bags' }, sortOrder: 6 },
  ];
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: c,
      update: { name: c.name, sortOrder: c.sortOrder },
    });
  }
  console.log(`  ✓ ${categories.length} categories`);

  // 4) Delivery zones (using @@unique on JSON name field requires deterministic lookup)
  const zones = [
    { name: { fr: 'Douala', en: 'Douala' }, fee: 1500, actualCost: 1200, freeDeliveryThreshold: 30000, estimatedDays: { fr: '1-2 jours', en: '1-2 days' } },
    { name: { fr: 'Yaoundé', en: 'Yaoundé' }, fee: 2500, actualCost: 2000, freeDeliveryThreshold: 40000, estimatedDays: { fr: '2-3 jours', en: '2-3 days' } },
    { name: { fr: 'National', en: 'National' }, fee: 5000, actualCost: 4000, freeDeliveryThreshold: 75000, estimatedDays: { fr: '3-7 jours', en: '3-7 days' } },
  ];
  for (const z of zones) {
    const existing = await prisma.deliveryZone.findFirst({
      where: { name: { equals: z.name } },
    });
    if (existing) {
      await prisma.deliveryZone.update({ where: { id: existing.id }, data: z });
    } else {
      await prisma.deliveryZone.create({ data: z });
    }
  }
  console.log(`  ✓ ${zones.length} delivery zones`);

  // 5) Magasin Celva pickup point
  const existingPickup = await prisma.pickupPoint.findFirst({
    where: { address: { contains: 'Bonapriso' } },
  });
  if (!existingPickup) {
    await prisma.pickupPoint.create({
      data: {
        name: { fr: 'Magasin Celva Douala', en: 'Celva Store Douala' },
        address: 'Rue de Bonapriso',
        city: 'Douala',
        phone: '+237000000000',
        hours: { fr: 'Lun-Sam 9h-18h', en: 'Mon-Sat 9am-6pm' },
      },
    });
    console.log('  ✓ Magasin Celva pickup point');
  } else {
    console.log('  · Magasin Celva pickup point already present');
  }

  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
