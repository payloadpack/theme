import { test as setup } from '@playwright/test'

import { authFile, logIn } from './demo'

setup('log in as the demo user', async ({ page }) => {
  await logIn(page)
  await page.request.delete('/api/payload-preferences/nav')
  await page.context().storageState({ path: authFile })
})
