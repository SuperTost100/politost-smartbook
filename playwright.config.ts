import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { BOOKS_URL } from './e2e/helpers/books';
import { MEASUREMENT_VERSION } from './src/lib/printFormulaMode';

const host = '127.0.0.1';
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const baseURL = `http://${host}:${port}`;

function resolveChromiumExecutable(): string | undefined {
  const fromEnv = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const cache = path.join(homedir(), 'Library/Caches/ms-playwright');
  const candidates = [
    path.join(cache, 'chromium-1228/chrome-mac-arm64/chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium'),
    path.join(
      cache,
      'chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    ),
    path.join(cache, 'chromium-1161/chrome-mac/Chromium.app/Contents/MacOS/Chromium'),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

const chromiumExecutable = resolveChromiumExecutable();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  use: {
    baseURL,
    // The print page picks fast print on a device it measures as slow (docs/Print.md, "Formule"). A
    // stored measurement of a fast device keeps every spec on KaTeX whatever machine runs it;
    // e2e/fast-print.spec.ts sets its own.
    storageState: {
      cookies: [],
      origins: [{ origin: baseURL, localStorage: [{ name: 'politost-print-formulas', value: JSON.stringify({ layoutMs: 0, version: MEASUREMENT_VERSION }) }] }],
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ...(chromiumExecutable
      ? { launchOptions: { executablePath: chromiumExecutable } }
      : {}),
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: '**/mobile.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      testMatch: '**/mobile.spec.ts',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
      },
    },
  ],
  // Build first: Playwright starts the web server before any global setup runs.
  // The build inherits VITE_PLATFORM_ENABLED, so the same variable picks the specs that run.
  webServer: {
    command: `npm run build && npx vite preview --port ${port} --strictPort --host ${host}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    // remote-books.spec.ts answers for this origin with page.route; other specs see it fail.
    env: { VITE_BOOKS_URL: BOOKS_URL },
  },
});
