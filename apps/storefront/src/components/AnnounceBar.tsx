import { useTranslations } from 'next-intl';

export const AnnounceBar = () => {
  const t = useTranslations('announce');
  return (
    <div className="bg-olive text-cream">
      <div className="container-celva py-2.5 text-center text-caption font-medium uppercase tracking-eyebrow">
        {t('free_delivery')}
      </div>
    </div>
  );
};
