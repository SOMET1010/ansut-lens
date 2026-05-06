import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  reporter: [['list']],
  use: {
    headless: true,
    baseURL: 'http://localhost:8080',
  },
});
