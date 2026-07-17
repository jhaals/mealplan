import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';
import { ThemeToggle } from './ThemeToggle';
import * as api from '../utils/api';
import type { TRMNLStatus } from '../utils/api';
import { format } from 'date-fns';

function StatusRow({ label, value, tone }: { label: string; value: string; tone?: 'mint' | 'muted' }) {
  return (
    <div className="flex justify-between items-baseline gap-3 py-2">
      <span className="text-sm text-muted min-w-0">{label}</span>
      <span
        className="text-sm font-medium text-right min-w-0 break-words"
        style={{ color: tone === 'mint' ? 'var(--color-mint)' : 'var(--color-ink)' }}
      >
        {value}
      </span>
    </div>
  );
}

export function TRMNLPage() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<{ enabled: boolean; hasWebhookUrl: boolean } | null>(null);
  const [status, setStatus] = useState<TRMNLStatus | null>(null);
  const [isPushing, setIsPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [configData, statusData] = await Promise.all([
        api.getTRMNLConfig(),
        api.getTRMNLStatus().catch(() => null),
      ]);
      setConfig(configData);
      if (statusData) setStatus(statusData);
    } catch (err) {
      console.error('Failed to load TRMNL data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, []);

  const handlePush = async () => {
    setIsPushing(true);
    setPushResult(null);
    try {
      const result = await api.pushToTRMNL();
      if (result.success) {
        setPushResult({ success: true, message: t('messages.trmnlPushSuccess') });
        // Refresh status
        const statusData = await api.getTRMNLStatus().catch(() => null);
        if (statusData) setStatus(statusData);
      } else {
        setPushResult({ success: false, message: result.error || t('messages.trmnlPushFailed') });
      }
    } catch (err) {
      setPushResult({ success: false, message: err instanceof Error ? err.message : t('messages.trmnlPushFailed') });
    } finally {
      setIsPushing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="shell py-8 text-center">
        <span
          className="inline-block h-8 w-8 mb-2 rounded-full border-2 border-t-transparent"
          style={{ borderColor: 'var(--color-ink-2)', borderTopColor: 'transparent', animation: 'hum-spin 700ms linear infinite' }}
          aria-hidden="true"
        />
        <p className="text-muted text-sm">{t('messages.loadingTRMNLStatus')}</p>
      </div>
    );
  }

  /* The settings route is the app's quiet one — no accent tint on its
   * surfaces, per the accent-per-route table in design.md. Colour appears only
   * where it carries meaning: mint for healthy, coral for an error. */
  return (
    <div className="shell py-6 grid gap-6">
      <section>
        <h2 style={{ fontSize: 'var(--text-xl)' }}>{t('headings.settings')}</h2>
        <div className="flex items-center justify-between gap-3 mt-3">
          <span className="text-sm text-muted">{t('theme.label')}</span>
          <ThemeToggle />
        </div>
      </section>

      <hr className="seam" />

      <section>
        <h3 style={{ fontSize: 'var(--text-lg)' }}>{t('headings.trmnlIntegration')}</h3>

        {!config?.enabled ? (
          <>
            <p className="text-sm text-muted mt-2 max-w-prose">{t('messages.trmnlDescription')}</p>
            <div className="card card--tint tint-pear p-4 mt-4" style={{ boxShadow: 'none' }}>
              <p className="font-semibold text-ink text-sm">{t('headings.notConfigured')}</p>
              <p className="text-sm text-muted mt-1">{t('messages.trmnlNotConfigured')}</p>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted mt-2 max-w-prose">{t('messages.trmnlPushDescription')}</p>

            <Button className="mt-4" onClick={handlePush} loading={isPushing}>
              {isPushing ? t('buttons.pushing') : t('buttons.pushToTRMNL')}
            </Button>

            {pushResult && (
              <div
                className={`card card--tint ${pushResult.success ? 'tint-mint' : 'tint-coral'} p-3 mt-3`}
                style={{ boxShadow: 'none' }}
                role="status"
              >
                <p className="text-sm text-ink break-words">{pushResult.message}</p>
              </div>
            )}

            <hr className="seam my-5" />

            <h4 className="mono-label mb-1">{t('headings.status')}</h4>
            <div className="divide-y" style={{ borderColor: 'var(--color-rule)' }}>
              <StatusRow label={t('status.webhookConfigured')} value={t('status.yes')} tone="mint" />
              <StatusRow label={t('status.autoSync')} value={t('status.everyHour')} />
              <StatusRow
                label={t('status.lastPush')}
                value={
                  status?.lastPushAt
                    ? format(new Date(status.lastPushAt), 'MMM d, yyyy h:mm a')
                    : t('status.never')
                }
              />
            </div>

            {status?.lastPushError && (
              <div className="card card--tint tint-coral p-3 mt-3" style={{ boxShadow: 'none' }} role="alert">
                <p className="text-sm text-ink break-words">
                  <span className="font-semibold">{t('headings.lastError')}</span> {status.lastPushError}
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
