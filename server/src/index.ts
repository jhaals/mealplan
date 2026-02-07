import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { errorHandler } from './middleware/errorHandler';
import mealPlanRoutes from './routes/mealPlan';
import shoppingListRoutes from './routes/shoppingList';
import trmnlRoutes from './routes/trmnl';
import * as trmnlService from './services/trmnlService';

const app = new Hono();

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.route('/api/meal-plan', mealPlanRoutes);
app.route('/api/shopping-list', shoppingListRoutes);
app.route('/api/trmnl', trmnlRoutes);

// Serve static files from dist
app.use('/*', serveStatic({ root: '../dist' }));

// Fallback to index.html for client-side routing
app.get('*', serveStatic({ path: '../dist/index.html' }));

// Error handling
app.onError(errorHandler);

const port = Number(process.env.PORT) || 3001;

console.log(`Server starting on http://localhost:${port}`);

// Start server
Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`Server running on http://localhost:${port}`);

// TRMNL Periodic Push
const TRMNL_PUSH_INTERVAL = 60 * 60 * 1000; // 1 hour

function startTRMNLSync() {
  const config = trmnlService.getTRMNLConfig();

  if (!config.enabled) {
    console.log('[TRMNL] Sync disabled - TRMNL_WEBHOOK_URL not set');
    return;
  }

  console.log('[TRMNL] Starting periodic sync (every hour)');

  // Initial push on startup
  trmnlService.pushToTRMNL(false).then((result) => {
    if (result.success && result.changeDetected) {
      console.log('[TRMNL] Initial sync completed');
    } else if (result.success && !result.changeDetected) {
      console.log('[TRMNL] Initial sync - no changes detected');
    } else if (!result.success) {
      console.error('[TRMNL] Initial sync failed:', result.error);
    }
  });

  // Periodic push every hour
  setInterval(async () => {
    const result = await trmnlService.pushToTRMNL(false);
    if (result.success && result.changeDetected) {
      console.log('[TRMNL] Periodic sync - changes pushed');
    } else if (!result.success) {
      console.error('[TRMNL] Periodic sync failed:', result.error);
    }
  }, TRMNL_PUSH_INTERVAL);
}

startTRMNLSync();
