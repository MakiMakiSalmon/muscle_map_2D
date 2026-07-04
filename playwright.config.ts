import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run start -- -H 127.0.0.1',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_E2E_AUTH_TOKEN: 'e2e-test-token',
      NEXT_PUBLIC_FIREBASE_API_KEY: 'dummy',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'dummy.firebaseapp.com',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'dummy',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'dummy.appspot.com',
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '0',
      NEXT_PUBLIC_FIREBASE_APP_ID: '1:0:web:0',
      FIREBASE_PROJECT_ID: 'dummy',
      FIREBASE_CLIENT_EMAIL: 'dummy@dummy.iam.gserviceaccount.com',
      FIREBASE_PRIVATE_KEY: 'dummy',
    },
  },
});
