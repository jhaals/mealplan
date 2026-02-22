import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import { serveStatic } from '@hono/node-server/serve-static';
import { errorHandler } from './middleware/errorHandler';
import mealPlanRoutes from './routes/mealPlan';
import shoppingListRoutes from './routes/shoppingList';
import trmnlRoutes from './routes/trmnl';
import configRoutes from './routes/config';
import * as trmnlService from './services/trmnlService';
import { wsManager } from './services/websocketManager';

const app = new Hono();

// WebSocket setup
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// WebSocket endpoint for shopping list updates
app.get('/ws/shopping-list', upgradeWebSocket(() => ({
  onOpen(event, ws) {
    const clientId = crypto.randomUUID();
    (ws as any)._clientId = clientId;
    wsManager.addClient(clientId, ws);
  },

  onMessage(event, ws) {
    // Optional: handle ping/pong for keep-alive
    if (event.data === 'ping') {
      ws.send('pong');
    }
  },

  onClose(event, ws) {
    const clientId = (ws as any)._clientId;
    if (clientId) {
      wsManager.removeClient(clientId);
    }
  },

  onError(event, ws) {
    console.error('[WS] Error:', event);
  },
})));

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.route('/api/meal-plan', mealPlanRoutes);
app.route('/api/shopping-list', shoppingListRoutes);
app.route('/api/trmnl', trmnlRoutes);
app.route('/api/config', configRoutes);

// Serve static files from dist
app.use('/*', serveStatic({ root: '../dist' }));

// Fallback to index.html for client-side routing
app.get('*', serveStatic({ path: '../dist/index.html' }));

// Error handling
app.onError(errorHandler);

const port = Number(process.env.PORT) || 3001;

console.log(`Server starting on http://localhost:${port}`);

// Start server with WebSocket support
const server = serve({
  port,
  fetch: app.fetch,
}, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`WebSocket available at ws://localhost:${port}/ws/shopping-list`);
});

// Inject WebSocket into server
injectWebSocket(server);

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
