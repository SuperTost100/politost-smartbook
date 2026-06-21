import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

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
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ...(chromiumExecutable
      ? { launchOptions: { executablePath: chromiumExecutable } }
      : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  globalSetup: './e2e/global-setup.ts',
  webServer: {
    command: `npx vite preview --port ${port} --strictPort --host ${host}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
