import { expect, test as setup } from '@playwright/test'
import { randomUUID } from 'node:crypto'

import { DEMO_USER } from '../src/seed'
import { AUTH_FILE, baseURL, getEditorForWorker } from './demo'

setup('log in as the demo user and as one editor per worker', async ({ playwright, request }, { config }) => {
  await expect(await request.post('/api/users/login', { data: DEMO_USER })).toBeOK()
  await request.storageState({ path: AUTH_FILE })

  for (let parallelIndex = 0; parallelIndex < config.workers; parallelIndex++) {
    const { authFile, credentials } = getEditorForWorker(parallelIndex)
    const editorRequest = await playwright.request.newContext({ baseURL })
    if (!(await editorRequest.post('/api/users/login', { data: credentials })).ok()) {
      await expect(await request.post('/api/users', { data: { ...credentials, apiKey: randomUUID() } })).toBeOK()
      await expect(await editorRequest.post('/api/users/login', { data: credentials })).toBeOK()
    }
    await editorRequest.storageState({ path: authFile })
    await editorRequest.dispose()
  }
})
