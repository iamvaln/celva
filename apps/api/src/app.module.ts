import { join } from 'node:path';
import { requireEnv } from './common/env';
import { type MiddlewareConsumer, Module, type NestModule, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AcceptLanguageResolver, HeaderResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import { LoggerModule } from 'nestjs-pino';
import { RATE_LIMITS, REQUEST_ID_HEADER } from '@celva/shared';
import { validateEnv } from './config/env';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { StockMovementsModule } from './modules/stock-movements/stock-movements.module';
import { MailModule } from './modules/mail/mail.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { UsersModule } from './modules/users/users.module';
import { SettingsModule } from './modules/settings/settings.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { ProductAttributesModule } from './modules/product-attributes/product-attributes.module';
import { ProductAttributeValuesModule } from './modules/product-attribute-values/product-attribute-values.module';
import { VariantsModule } from './modules/variants/variants.module';
import { StorageModule } from './modules/storage/storage.module';
import { ProductImagesModule } from './modules/product-images/product-images.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { RelatedProductsModule } from './modules/related-products/related-products.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { SavedPaymentMethodsModule } from './modules/saved-payment-methods/saved-payment-methods.module';
import { CartModule } from './modules/cart/cart.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { PromoCodesModule } from './modules/promo-codes/promo-codes.module';
import { DeliveryZonesModule } from './modules/delivery-zones/delivery-zones.module';
import { PickupPointsModule } from './modules/pickup-points/pickup-points.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { FinanceModule } from './modules/finance/finance.module';
import { PaymentAccountsModule } from './modules/payment-accounts/payment-accounts.module';
import { PartnersModule } from './modules/partners/partners.module';
import { CommissionsModule } from './modules/commissions/commissions.module';
import { ConsignmentsModule } from './modules/consignments/consignments.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { RawMaterialsModule } from './modules/raw-materials/raw-materials.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { ProductionOrdersModule } from './modules/production-orders/production-orders.module';
import { NewsletterModule } from './modules/newsletter/newsletter.module';
import { SizeGuidesModule } from './modules/size-guides/size-guides.module';
import { PackagingModule } from './modules/packaging/packaging.module';
import { StudioFamiliesModule } from './modules/studio/studio-families/studio-families.module';
import { StudioGarmentsModule } from './modules/studio/studio-garments/studio-garments.module';
import { StudioModelsModule } from './modules/studio/studio-models/studio-models.module';
import { StudioFabricsModule } from './modules/studio/studio-fabrics/studio-fabrics.module';
import { StudioRequestsModule } from './modules/studio/studio-requests/studio-requests.module';
import { AiModule } from './modules/ai/ai.module';
import { ContactModule } from './modules/contact/contact.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { RolesGuard } from './common/guards/roles.guard';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      useFactory: () => ({
        pinoHttp: {
          level: requireEnv('LOG_LEVEL'),
          customProps: () => ({ service: 'celva-api' }),
          transport:
            process.env.NODE_ENV !== 'production'
              ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
              : undefined,
          customSuccessMessage: (req, res) =>
            `${req.method} ${req.url} ${res.statusCode}`,
          customReceivedMessage: (req) => `→ ${req.method} ${req.url}`,
          customErrorMessage: (req, res, err) =>
            `${req.method} ${req.url} ${res.statusCode} - ${err.message}`,
          customAttributeKeys: { reqId: 'requestId' },
          genReqId: (req) =>
            (req.headers[REQUEST_ID_HEADER.toLowerCase()] as string) ??
            (req as { id?: string }).id ??
            '-',
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.passwordHash',
              'req.body.token',
            ],
            censor: '[REDACTED]',
          },
        },
      }),
    }),
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60_000, limit: RATE_LIMITS.GLOBAL_PER_MIN },
    ]),
    I18nModule.forRoot({
      fallbackLanguage: 'fr',
      loaderOptions: {
        path: join(__dirname, 'i18n'),
        // Only watch translations in true development. The previous
        // `!== 'production'` was too permissive: running `node dist/src/main.js`
        // with NODE_ENV unset left the watcher active, and a concurrent
        // `nest build` (deleteOutDir: true) would wipe dist/src/i18n/ under
        // it and crash with ENOENT mid-request.
        watch: process.env.NODE_ENV === 'development',
      },
      resolvers: [
        new QueryResolver(['lang', 'l']),
        new HeaderResolver(['x-celva-lang']),
        AcceptLanguageResolver,
      ],
    }),
    PrismaModule,
    AuditLogsModule,
    StockMovementsModule,
    MailModule,
    HealthModule,
    AuthModule,
    UsersModule,
    SettingsModule,
    CategoriesModule,
    ProductsModule,
    ProductAttributesModule,
    ProductAttributeValuesModule,
    VariantsModule,
    StorageModule,
    ProductImagesModule,
    CollectionsModule,
    RelatedProductsModule,
    AddressesModule,
    SavedPaymentMethodsModule,
    CartModule,
    WishlistModule,
    PromoCodesModule,
    DeliveryZonesModule,
    PickupPointsModule,
    OrdersModule,
    PaymentsModule,
    InvoicesModule,
    ArticlesModule,
    DeliveriesModule,
    TransactionsModule,
    FinanceModule,
    PaymentAccountsModule,
    PartnersModule,
    CommissionsModule,
    ConsignmentsModule,
    SuppliersModule,
    RawMaterialsModule,
    PurchaseOrdersModule,
    ProductionOrdersModule,
    NewsletterModule,
    SizeGuidesModule,
    PackagingModule,
    StudioFamiliesModule,
    StudioGarmentsModule,
    StudioModelsModule,
    StudioFabricsModule,
    StudioRequestsModule,
    AiModule,
    ContactModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          // `whitelist` strips properties not declared on the DTO (keeps
          // mass-assignment protection). We intentionally do NOT
          // `forbidNonWhitelisted`: the React-Admin client saves whole records
          // (incl. read-only fields like productCount) and sends sortBy/sortDir
          // on resources that don't declare them — those should be ignored, not
          // hard-rejected with 400. Declared fields are still validated.
          whitelist: true,
          transform: true,
          transformOptions: { enableImplicitConversion: true },
        }),
    },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
