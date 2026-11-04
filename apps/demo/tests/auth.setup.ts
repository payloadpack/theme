import { expect, test as setup } from '@playwright/test'

import { demoUser } from '../src/seed'
import { authFile } from './demo'

setup('log in as the demo user', async ({ request }) => {
  await expect(await request.post('/api/users/login', { data: demoUser })).toBeOK()
  await request.delete('/api/payload-preferences/nav')
  await request.storageState({ path: authFile })
})
