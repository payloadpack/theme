import { defineConfig, devices } from '@playwright/test'

import { authFile, baseURL } from './tests/demo'

export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { dependencies: ['setup'], name: 'e2e', use: { storageState: authFile } },
    {
      dependencies: ['setup'],
      expect: { toHaveScreenshot: { scale: 'device' } },
      name: 'screenshots',
      snapshotPathTemplate: '{testDir}/../../../.github/assets/{arg}{ext}',
      testMatch: /screenshots\.ts/,
      use: { deviceScaleFactor: 2, storageState: authFile, viewport: { height: 800, width: 1280 } }
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
    command: 'bun run dev',
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    url: `${baseURL}/admin/login`
  },
  workers: 1
})
