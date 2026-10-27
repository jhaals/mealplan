import { defineConfig } from '@playwright/test';

const port = process.env.E2E_PORT || '3002';
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run start',
    url: `${baseURL}/health`,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      DATABASE_URL: process.env.E2E_DATABASE_URL || 'file:./test.db',
      PORT: port,
      LANGUAGE: 'en',
      TRMNL_WEBHOOK_URL: '',
      OPENROUTER_API_KEY: '',
    },
  },
});
