import { defineConfig, devices } from '@playwright/test'

import { authFile } from './tests/auth-file'

export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { dependencies: ['setup'], name: 'e2e', use: { storageState: authFile } }
  ],
  reporter: 'list',
  testDir: './tests',
  timeout: 60_000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:3020',
    viewport: { height: 900, width: 1440 }
  },
  webServer: {
    command: 'bun run dev',
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    url: 'http://localhost:3020/admin/login'
  },
  workers: 1
})
