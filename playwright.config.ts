import { defineConfig } from '@playwright/test';

/**
 * Le navigateur peut etre fourni par l'environnement (sandbox, CI) plutot que
 * telecharge par Playwright : `PLAYWRIGHT_CHROMIUM_EXECUTABLE` permet alors de
 * pointer l'executable existant sans reinstaller les binaires.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  reporter: [['list']],
  use: {
    headless: true,
    baseURL: 'http://localhost:8080',
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
});
