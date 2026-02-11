import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from './ui/Card';
import * as api from '../utils/api';
import type { TRMNLStatus } from '../utils/api';
import { format } from 'date-fns';

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
    loadData();
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
      <div className="max-w-3xl mx-auto p-4">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{t('messages.loadingTRMNLStatus')}</p>
        </div>
      </div>
    );
  }

  if (!config?.enabled) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('headings.trmnlIntegration')}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('messages.trmnlDescription')}
          </p>
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm font-medium mb-1">{t('headings.notConfigured')}</p>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm">
              {t('messages.trmnlNotConfigured')}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      {/* Push Action */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('headings.trmnlIntegration')}</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          {t('messages.trmnlPushDescription')}
        </p>

        <button
          onClick={handlePush}
          disabled={isPushing}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPushing ? t('buttons.pushing') : t('buttons.pushToTRMNL')}
        </button>

        {pushResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${
            pushResult.success
              ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
          }`}>
            {pushResult.message}
          </div>
        )}
      </Card>

      {/* Status */}
      <Card className="p-6">
        <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('headings.status')}</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">{t('status.webhookConfigured')}</span>
            <span className="text-sm font-medium text-green-600">{t('status.yes')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">{t('status.autoSync')}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('status.everyHour')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">{t('status.lastPush')}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {status?.lastPushAt
                ? format(new Date(status.lastPushAt), 'MMM d, yyyy h:mm a')
                : t('status.never')}
            </span>
          </div>
          {status?.lastPushError && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-700 dark:text-red-300">
                <span className="font-medium">{t('headings.lastError')}</span> {status.lastPushError}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
