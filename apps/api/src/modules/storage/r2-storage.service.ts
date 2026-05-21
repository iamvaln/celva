import { Logger } from '@nestjs/common';
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { StorageService, TransformOptions } from './storage.types';

export type R2Config = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
  cfImagesBaseUrl: string;
};

/**
 * R2 storage backed by Cloudflare Images Transformations for variants.
 * See docs/celva-algo-images.md.
 *
 * Upload: single original file → R2 via S3 PutObject.
 * Serve : Cloudflare /cdn-cgi/image/<opts>/<publicUrl>/<key> URLs.
 */
export class R2StorageService implements StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private readonly client: S3Client;

  constructor(private readonly config: R2Config) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
  }

  async deletePrefix(prefix: string): Promise<void> {
    const listed = await this.client.send(
      new ListObjectsV2Command({ Bucket: this.config.bucket, Prefix: prefix }),
    );
    const keys = (listed.Contents ?? []).map((o) => o.Key).filter((k): k is string => !!k);
    if (keys.length === 0) return;
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.config.bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
      }),
    );
    this.logger.debug(`Deleted ${keys.length} R2 objects under prefix ${prefix}`);
  }

  publicUrl(key: string): string {
    const base = this.config.publicUrl.replace(/\/+$/, '');
    return `${base}/${key.replace(/^\/+/, '')}`;
  }

  transformedUrl(key: string, options: TransformOptions): string {
    const opts = this.encodeOptions(options);
    const base = this.config.cfImagesBaseUrl.replace(/\/+$/, '');
    return `${base}/${opts}/${this.publicUrl(key)}`;
  }

  private encodeOptions(options: TransformOptions): string {
    const parts: string[] = [];
    if (options.width !== undefined) parts.push(`width=${options.width}`);
    if (options.height !== undefined) parts.push(`height=${options.height}`);
    if (options.quality !== undefined) parts.push(`quality=${options.quality}`);
    if (options.format) parts.push(`format=${options.format}`);
    if (options.fit) parts.push(`fit=${options.fit}`);
    if (options.gravity) parts.push(`gravity=${options.gravity}`);
    return parts.join(',');
  }
}
