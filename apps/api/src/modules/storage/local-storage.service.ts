import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import type { StorageService } from './storage.types';

export type LocalConfig = {
  root: string;
  publicUrl: string;
};

/**
 * Filesystem-backed storage for dev/CI. Writes the original file under
 * `root` (typically `<repo>/apps/api/uploads/`) and exposes it via the
 * API's static-serve mount at `<publicUrl>/<key>` (typically
 * `http://localhost:3001/uploads/<key>`).
 *
 * No transformations: `transformedUrl` returns the same URL as
 * `publicUrl`. Variant-aware admin UIs degrade gracefully (they just
 * see the full-size original).
 */
export class LocalStorageService implements StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly root: string;

  constructor(private readonly config: LocalConfig) {
    this.root = resolve(config.root);
  }

  private resolveKey(key: string): string {
    const normalized = key.replace(/^\/+|\/+$/g, '');
    if (normalized.includes('..')) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return join(this.root, normalized);
  }

  async put(key: string, body: Buffer): Promise<void> {
    const target = this.resolveKey(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body);
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }

  async deletePrefix(prefix: string): Promise<void> {
    const target = this.resolveKey(prefix);
    try {
      await rm(target, { recursive: true });
      this.logger.debug(`Removed local directory ${target}`);
      return;
    } catch {
      // not a directory — try filename-prefix matching
    }
    const parent = dirname(target);
    const stem = basename(target);
    let entries: string[] = [];
    try {
      entries = await readdir(parent);
    } catch {
      return;
    }
    const matches = entries.filter((name) => name.startsWith(stem));
    await Promise.all(matches.map((name) => rm(join(parent, name), { force: true })));
    this.logger.debug(`Removed ${matches.length} files under ${parent}/${stem}*`);
  }

  publicUrl(key: string): string {
    const base = this.config.publicUrl.replace(/\/+$/, '');
    return `${base}/${key.replace(/^\/+/, '')}`;
  }

  transformedUrl(key: string): string {
    // Dev/CI: no transformations available, return the plain URL.
    return this.publicUrl(key);
  }

  get rootDir(): string {
    return this.root;
  }
}
