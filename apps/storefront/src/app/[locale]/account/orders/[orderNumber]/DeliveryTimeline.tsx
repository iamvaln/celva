import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { apiFetch, ApiError } from '@/lib/api';

type DeliveryStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED';

type CustomerDelivery = {
  id: string;
  mode: 'HOME_DELIVERY' | 'STAFF_DELIVERY' | 'STORE_PICKUP' | 'RELAY_PICKUP';
  status: DeliveryStatus;
  trackingNote: string | null;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
};

/**
 * Stages shown in the timeline for couriered orders. STORE_PICKUP and
 * RELAY_PICKUP get a different render — for those modes the "transit"
 * phase isn't really a thing.
 */
const COURIER_STAGES: DeliveryStatus[] = [
  'ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
];

const PICKUP_STAGES: DeliveryStatus[] = ['ASSIGNED', 'PICKED_UP', 'DELIVERED'];

/**
 * A stage is "reached" if the delivery status equals it OR is downstream
 * of it on the happy path. We compute that from index order in the
 * stages array.
 */
const stageReached = (stage: DeliveryStatus, current: DeliveryStatus, stages: DeliveryStatus[]): boolean => {
  if (current === 'FAILED') return false;
  if (current === 'PENDING') return false;
  return stages.indexOf(stage) <= stages.indexOf(current);
};

export const DeliveryTimeline = async ({
  orderNumber,
  locale,
  accessToken,
}: {
  orderNumber: string;
  locale: Locale;
  accessToken: string;
}) => {
  let delivery: CustomerDelivery | null = null;
  try {
    delivery = await apiFetch<CustomerDelivery>(
      `/me/orders/by-number/${encodeURIComponent(orderNumber)}/delivery`,
      { locale, accessToken, cache: 'no-store' },
    );
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 404) throw err;
    return null;
  }
  if (!delivery) return null;

  const t = await getTranslations({ locale, namespace: 'account.delivery_timeline' });
  const isPickup =
    delivery.mode === 'STORE_PICKUP' || delivery.mode === 'RELAY_PICKUP';
  const stages = isPickup ? PICKUP_STAGES : COURIER_STAGES;
  const failed = delivery.status === 'FAILED';

  const stageDate = (stage: DeliveryStatus): string | null => {
    if (stage === 'ASSIGNED') return delivery!.assignedAt;
    if (stage === 'PICKED_UP') return delivery!.pickedUpAt;
    if (stage === 'DELIVERED') return delivery!.deliveredAt;
    return null;
  };

  const fmtDate = (iso: string | null): string =>
    iso
      ? new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(iso))
      : '';

  return (
    <section className="mb-8 border border-border p-6">
      <h2 className="eyebrow mb-4">{t('heading')}</h2>

      {failed ? (
        <div className="border border-accent bg-accent/10 px-4 py-3 font-body text-base text-accent">
          {t('failed')}
          {delivery.trackingNote && (
            <p className="mt-1 font-body text-small">{delivery.trackingNote}</p>
          )}
        </div>
      ) : (
        <ol className="space-y-3">
          {stages.map((stage) => {
            const reached = stageReached(stage, delivery!.status, stages);
            const date = stageDate(stage);
            return (
              <li key={stage} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className={`mt-1 inline-block h-3 w-3 shrink-0 border ${
                    reached ? 'border-accent bg-accent' : 'border-border bg-transparent'
                  }`}
                />
                <div className="flex-1">
                  <p
                    className={`font-body text-base ${
                      reached ? 'text-foreground' : 'text-foreground-muted'
                    }`}
                  >
                    {t(`stage.${stage}`)}
                  </p>
                  {date && (
                    <p className="font-body text-caption uppercase tracking-eyebrow text-foreground-muted">
                      {fmtDate(date)}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {!failed && delivery.trackingNote && (
        <p className="mt-4 font-body text-small text-foreground-muted">
          <strong className="text-foreground">{t('note_label')}: </strong>
          {delivery.trackingNote}
        </p>
      )}
    </section>
  );
};
