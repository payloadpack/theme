import { test as setup } from '@playwright/test'

import { demoUser } from '../src/seed'
import { authFile } from './auth-file'

setup('log in as the demo user', async ({ page }) => {
  await page.goto('/admin/login')
  await page.fill('#field-email', demoUser.email)
  await page.fill('#field-password', demoUser.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/admin')
  await page.context().storageState({ path: authFile })
})
