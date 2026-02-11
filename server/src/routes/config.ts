import { Hono } from 'hono';

const config = new Hono();

/**
 * GET /api/config/language
 * Returns the current language setting from environment
 */
config.get('/language', (c) => {
  const language = process.env.LANGUAGE || 'en';
  return c.json({ language });
});

export default config;
