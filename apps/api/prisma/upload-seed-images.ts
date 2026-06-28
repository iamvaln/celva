import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname } from 'node:path';
import { CONTENT_TYPE, allSeedImages } from './catalogue-seed-data';
import { IMAGES_DIR, indexImages, isR2Configured, makeStorage } from './seed-storage';

/**
 * Uploads the catalogue seed images to storage (R2 in preprod/prod, local FS in
 * dev) at the DETERMINISTIC keys defined in catalogue-seed-data.ts. Run this
 * ONCE per environment before `seed-catalogue.ts` — the seed then just creates
 * DB rows that reference these keys, so it needs no image files itself.
 *
 * Idempotent: re-running overwrites the same keys. Reads originals from
 * docs/images (override with SEED_IMAGES_DIR).
 *
 *   node --env-file=.env --import tsx prisma/upload-seed-images.ts
 */
async function main(): Promise<void> {
  console.log('🖼️  Uploading catalogue seed images…');
  console.log(`  → Backend: ${isR2Configured() ? 'R2' : 'local filesystem'}`);

  if (!existsSync(IMAGES_DIR)) {
    throw new Error(
      `Images directory not found: ${IMAGES_DIR} (set SEED_IMAGES_DIR to override)`,
    );
  }

  const storage = makeStorage();
  const index = await indexImages(IMAGES_DIR);
  console.log(`  → Indexed ${index.size} source images from ${IMAGES_DIR}`);

  const manifest = allSeedImages();
  let uploaded = 0;
  const missing: string[] = [];

  for (const { file, key } of manifest) {
    const source = index.get(file);
    if (!source) {
      missing.push(file);
      console.warn(`    ! Missing source, skipping: ${file}`);
      continue;
    }
    const ext = extname(file).toLowerCase();
    const buffer = await readFile(source);
    await storage.put(key, buffer, CONTENT_TYPE[ext] ?? 'application/octet-stream');
    uploaded++;
    console.log(`    ✓ ${key}`);
  }

  console.log(`✅ Uploaded ${uploaded}/${manifest.length} images.`);
  if (missing.length > 0) {
    console.warn(`⚠️  ${missing.length} missing: ${missing.join(', ')}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('❌ Upload failed:', err);
  process.exitCode = 1;
});
