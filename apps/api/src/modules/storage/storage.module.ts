import { resolve } from 'node:path';
import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from './local-storage.service';
import { R2StorageService } from './r2-storage.service';
import { StorageController } from './storage.controller';
import { STORAGE_SERVICE, type StorageService } from './storage.types';

const LOCAL_ROOT_DEFAULT = resolve(process.cwd(), 'uploads');
const LOCAL_URL_DEFAULT = 'http://localhost:3001/uploads';

@Global()
@Module({
  controllers: [StorageController],
  providers: [
    {
      provide: STORAGE_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): StorageService => {
        const logger = new Logger('Storage');
        const accountId = config.get<string>('R2_ACCOUNT_ID');
        const accessKey = config.get<string>('R2_ACCESS_KEY_ID');
        const secret = config.get<string>('R2_SECRET_ACCESS_KEY');
        const bucket = config.get<string>('R2_BUCKET_NAME') ?? 'celva-media';
        const publicUrl = config.get<string>('R2_PUBLIC_URL');
        const endpoint =
          config.get<string>('R2_ENDPOINT') ??
          (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
        const cfImagesBaseUrl =
          config.get<string>('CF_IMAGES_BASE_URL') ?? 'https://celva.store/cdn-cgi/image';

        if (accountId && accessKey && secret && publicUrl && endpoint) {
          logger.log(
            `Storage backend: R2 (bucket=${bucket}, transforms via ${cfImagesBaseUrl})`,
          );
          return new R2StorageService({
            endpoint,
            accessKeyId: accessKey,
            secretAccessKey: secret,
            bucket,
            publicUrl,
            cfImagesBaseUrl,
          });
        }

        logger.warn(
          'R2 env vars incomplete — falling back to local filesystem storage. This is OK for dev/CI but MUST NOT happen in production.',
        );
        return new LocalStorageService({
          root: LOCAL_ROOT_DEFAULT,
          publicUrl: LOCAL_URL_DEFAULT,
        });
      },
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
