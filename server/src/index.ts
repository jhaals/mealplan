import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { errorHandler } from './middleware/errorHandler';
import mealPlanRoutes from './routes/mealPlan';
import shoppingListRoutes from './routes/shoppingList';

const app = new Hono();

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.route('/api/meal-plan', mealPlanRoutes);
app.route('/api/shopping-list', shoppingListRoutes);

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
