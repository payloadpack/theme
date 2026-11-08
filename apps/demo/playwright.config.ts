import { defineConfig, devices } from '@playwright/test'

import { AUTH_FILE, baseURL, DEMO_PORT } from './tests/demo'

const E2E_DATABASE_FILE = 'e2e.db'
const E2E_MEDIA_DIR = 'e2e-media'
const TEST_TIMEOUT_MS = 60_000

export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { dependencies: ['setup'], fullyParallel: true, name: 'e2e' },
    {
      dependencies: ['setup'],
      expect: { toHaveScreenshot: { scale: 'device' } },
      name: 'screenshots',
      snapshotPathTemplate: '{testDir}/../../../.github/assets/{arg}{ext}',
      testMatch: /screenshots\.ts/,
      use: { deviceScaleFactor: 2, storageState: AUTH_FILE, viewport: { height: 800, width: 1280 } }
    },
    { dependencies: ['setup'], name: 'panel-tour', testMatch: /panel-tour\.ts/ },
    {
      dependencies: ['setup'],
      expect: { toHaveScreenshot: { maxDiffPixels: 0, threshold: 0 } },
      fullyParallel: true,
      name: 'visual',
      snapshotPathTemplate: '{testDir}/__visual__/{arg}-{platform}{ext}',
      testMatch: /visual\.ts/,
      use: {
        deviceScaleFactor: 1,
        launchOptions: { args: ['--disable-partial-raster'] },
        locale: 'en-US',
        timezoneId: 'UTC',
        viewport: { height: 900, width: 1440 }
      }
    }
  ],
  reporter: 'list',
  testDir: './tests',
  timeout: TEST_TIMEOUT_MS,
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: process.env.CI ? { mode: 'retain-on-failure', screenshots: false } : 'off',
    viewport: { height: 900, width: 1440 }
  },
  webServer: {
    command: `rm -rf ${E2E_DATABASE_FILE} ${E2E_MEDIA_DIR} && bunx payload run src/prepare-database.ts && bun run build && bun run start --keepAliveTimeout ${TEST_TIMEOUT_MS}`,
    env: { DATABASE_URI: `file:./${E2E_DATABASE_FILE}`, DEMO_PORT, MEDIA_DIR: E2E_MEDIA_DIR },
    reuseExistingServer: false,
    timeout: 300_000,
    url: `${baseURL}/admin/login`
  }
})
