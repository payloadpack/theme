import { test as setup } from '@playwright/test'

import { demoUser } from '../src/seed'
import { authFile } from './demo'

setup('log in as the demo user', async ({ request }) => {
  await request.post('/api/users/login', { data: demoUser })
  await request.delete('/api/payload-preferences/nav')
  await request.storageState({ path: authFile })
})
