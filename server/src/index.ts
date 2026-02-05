import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { errorHandler } from './middleware/errorHandler';
import mealPlanRoutes from './routes/mealPlan';

const app = new Hono();

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.route('/api/meal-plan', mealPlanRoutes);

// Serve static files from dist
app.use('/*', serveStatic({ root: '../dist' }));

// Fallback to index.html for client-side routing
app.get('*', serveStatic({ path: '../dist/index.html' }));

// Error handling
app.onError(errorHandler);

const port = process.env.PORT || 3001;

console.log(`Server starting on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
