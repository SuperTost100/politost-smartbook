import { defineConfig } from '@playwright/test';
import config from './playwright.config';

/** Dummy public IDs are used only with network-mocked tests. Never contact Google's real services. */
export default defineConfig({
  ...config,
  testMatch: '**/google-services.spec.ts',
  testIgnore: [],
  projects: [{ name: 'google-mocked', use: { ...config.projects![0].use } }],
  webServer: {
    ...config.webServer,
    reuseExistingServer: false,
    env: {
      VITE_BOOKS_URL: 'https://books.e2e.invalid',
      VITE_GA4_ID: 'G-READERTEST',
      VITE_ADSENSE_CLIENT: 'ca-pub-1234567890123456',
      VITE_GOOGLE_CMP_ENABLED: 'true',
    },
  },
});
