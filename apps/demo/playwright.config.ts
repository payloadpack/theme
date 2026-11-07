import { defineConfig, devices } from '@playwright/test'

import { AUTH_FILE, baseURL, DEMO_PORT } from './tests/demo'

const E2E_DATABASE_FILE = 'e2e.db'
const E2E_MEDIA_DIR = 'e2e-media'

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
    }
  ],
  reporter: 'list',
  testDir: './tests',
  timeout: 60_000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    viewport: { height: 900, width: 1440 }
  },
  webServer: {
    command: `rm -rf ${E2E_DATABASE_FILE} ${E2E_MEDIA_DIR} && bunx payload run src/prepare-database.ts && bun run build && bun run start`,
    env: { DATABASE_URI: `file:./${E2E_DATABASE_FILE}`, DEMO_PORT, MEDIA_DIR: E2E_MEDIA_DIR },
    reuseExistingServer: false,
    timeout: 300_000,
    url: `${baseURL}/admin/login`
  }
})
