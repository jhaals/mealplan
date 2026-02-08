import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import * as api from '../utils/api';
import type { TRMNLStatus } from '../utils/api';
import { format } from 'date-fns';

export function TRMNLPage() {
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
        setPushResult({ success: true, message: 'Successfully pushed to TRMNL device' });
        // Refresh status
        const statusData = await api.getTRMNLStatus().catch(() => null);
        if (statusData) setStatus(statusData);
      } else {
        setPushResult({ success: false, message: result.error || 'Push failed' });
      }
    } catch (err) {
      setPushResult({ success: false, message: err instanceof Error ? err.message : 'Push failed' });
    } finally {
      setIsPushing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent mb-2"></div>
          <p className="text-gray-600 text-sm">Loading TRMNL status...</p>
        </div>
      </div>
    );
  }

  if (!config?.enabled) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">TRMNL Integration</h2>
          <p className="text-gray-600 mb-4">
            Push your weekly meal plan to a TRMNL e-ink display device for at-a-glance viewing.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm font-medium mb-1">Not Configured</p>
            <p className="text-yellow-700 text-sm">
              Set the <code className="bg-yellow-100 px-1 rounded">TRMNL_WEBHOOK_URL</code> environment variable in{' '}
              <code className="bg-yellow-100 px-1 rounded">server/.env</code> to enable TRMNL integration.
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
        <h2 className="text-lg font-semibold text-gray-900 mb-2">TRMNL Integration</h2>
        <p className="text-gray-600 text-sm mb-4">
          Push your weekly meal plan to your TRMNL e-ink display device.
        </p>

        <button
          onClick={handlePush}
          disabled={isPushing}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPushing ? 'Pushing...' : 'Push to TRMNL'}
        </button>

        {pushResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${
            pushResult.success
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {pushResult.message}
          </div>
        )}
      </Card>

      {/* Status */}
      <Card className="p-6">
        <h3 className="text-md font-semibold text-gray-900 mb-3">Status</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Webhook configured</span>
            <span className="text-sm font-medium text-green-600">✓ Yes</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Auto-sync</span>
            <span className="text-sm font-medium text-gray-900">Every hour</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Last push</span>
            <span className="text-sm font-medium text-gray-900">
              {status?.lastPushAt
                ? format(new Date(status.lastPushAt), 'MMM d, yyyy h:mm a')
                : 'Never'}
            </span>
          </div>
          {status?.lastPushError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">
                <span className="font-medium">Last error:</span> {status.lastPushError}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
