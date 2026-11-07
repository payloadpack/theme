import { expect, test as setup } from '@playwright/test'

import { DEMO_USER } from '../src/seed'
import { AUTH_FILE } from './demo'

setup('log in as the demo user', async ({ request }) => {
  await expect(await request.post('/api/users/login', { data: DEMO_USER })).toBeOK()
  await request.delete('/api/payload-preferences/nav')
  await request.storageState({ path: AUTH_FILE })
})
