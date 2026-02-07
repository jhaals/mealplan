import { Hono } from 'hono';
import * as trmnlService from '../services/trmnlService';

const trmnl = new Hono();

/**
 * POST /api/trmnl/push
 * Manual force push to TRMNL (ignores change detection)
 */
trmnl.post('/push', async (c) => {
  const result = await trmnlService.pushToTRMNL(true);

  if (result.success) {
    return c.json({
      success: true,
      message: 'Successfully pushed to TRMNL',
      pushedAt: result.pushedAt?.toISOString(),
    });
  } else {
    return c.json(
      {
        success: false,
        error: result.error,
      },
      500
    );
  }
});

/**
 * GET /api/trmnl/status
 * Get last push timestamp and error
 */
trmnl.get('/status', async (c) => {
  const status = await trmnlService.getPushStatus();

  return c.json({
    lastPushAt: status.lastPushAt?.toISOString() || null,
    lastPushError: status.lastPushError,
    hasPushed: status.hasPushed,
  });
});

/**
 * GET /api/trmnl/config
 * Check if TRMNL is configured
 */
trmnl.get('/config', async (c) => {
  const config = trmnlService.getTRMNLConfig();

  return c.json({
    enabled: config.enabled,
    hasWebhookUrl: !!config.webhookUrl,
  });
});

export default trmnl;
