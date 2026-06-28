import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LocalStorageService } from '../src/modules/storage/local-storage.service';
import { R2StorageService } from '../src/modules/storage/r2-storage.service';
import type { StorageService } from '../src/modules/storage/storage.types';

const REPO_ROOT = resolve(__dirname, '..', '..', '..');

/**
 * Source images for the seed. Default to the team art under docs/images
 * (nested per product); override with SEED_IMAGES_DIR when the repo isn't laid
 * out the same way where the uploader runs (e.g. a mounted volume).
 */
export const IMAGES_DIR = process.env.SEED_IMAGES_DIR
  ? resolve(process.env.SEED_IMAGES_DIR)
  : resolve(REPO_ROOT, 'docs', 'images');

/**
 * Pick the storage backend the same way StorageModule does: R2 when all the
 * R2_* vars are set (preprod/prod), local filesystem otherwise (dev/CI).
 */
export function makeStorage(): StorageService {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKey = process.env.R2_ACCESS_KEY_ID;
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME ?? 'celva-media';
  const publicUrl = process.env.R2_PUBLIC_URL;
  const endpoint =
    process.env.R2_ENDPOINT ??
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
  const cfImagesBaseUrl =
    process.env.CF_IMAGES_BASE_URL ?? 'https://media.celva.store/cdn-cgi/image';

  if (accountId && accessKey && secret && publicUrl && endpoint) {
    return new R2StorageService({
      endpoint,
      accessKeyId: accessKey,
      secretAccessKey: secret,
      bucket,
      publicUrl,
      cfImagesBaseUrl,
    });
  }

  return new LocalStorageService({
    root: resolve(__dirname, '..', 'uploads'),
    publicUrl: 'http://localhost:3001/uploads',
  });
}

/** True when the active backend is R2 (all R2_* vars present). */
export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_PUBLIC_URL,
  );
}

/** Recursively index image files under `dir` by basename → absolute path. */
export async function indexImages(dir: string): Promise<Map<string, string>> {
  const index = new Map<string, string>();
  async function walk(d: string): Promise<void> {
    for (const entry of await readdir(d, { withFileTypes: true })) {
      const full = resolve(d, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        index.set(entry.name, full);
      }
    }
  }
  await walk(dir);
  return index;
}
