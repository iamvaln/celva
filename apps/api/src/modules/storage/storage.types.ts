/**
 * Where uploaded images live. The service implementation is chosen at module
 * init time based on whether R2_* env vars are set:
 *   - R2_ACCOUNT_ID + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY + R2_PUBLIC_URL → R2
 *   - otherwise                                                              → local FS
 *
 * The local backend is for dev and CI only — it writes the original file
 * under `apps/api/uploads/` and serves it from `/uploads/*` on the API.
 * Local builds do not transform; every "variant" URL returns the original.
 * Production always sets R2 + CF Images Transformations (see
 * docs/celva-algo-images.md).
 */
export interface StorageService {
  /** Upload an object and return the storage key. */
  put(key: string, body: Buffer, contentType: string): Promise<void>;

  /** Delete a single object. No-op if it doesn't exist. */
  delete(key: string): Promise<void>;

  /** Delete every object under a key prefix (used when wiping a whole product). */
  deletePrefix(prefix: string): Promise<void>;

  /** Direct URL to the original object (zoom, download). */
  publicUrl(key: string): string;

  /**
   * URL for a transformed view of the original. On R2 this is a
   * Cloudflare `/cdn-cgi/image/<opts>/<R2_PUBLIC_URL>/<key>` URL — the
   * edge pulls from R2, resizes, caches. On the local backend this just
   * returns the public URL (no transforms in dev/CI).
   */
  transformedUrl(key: string, options: TransformOptions): string;
}

export type TransformOptions = {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'webp' | 'avif' | 'json';
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  gravity?: 'auto' | 'center' | 'top' | 'bottom' | 'left' | 'right';
};

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
