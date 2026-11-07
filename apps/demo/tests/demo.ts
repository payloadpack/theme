import { type APIRequestContext, test as base, expect, type Locator, type Page, type Request } from '@playwright/test'

export const AUTH_FILE = 'tests/.auth/demo.json'

export const DEMO_PORT = process.env.DEMO_PORT ?? '3021'

export const baseURL = `http://localhost:${DEMO_PORT}`

export const getEditorForWorker = (parallelIndex: number) => ({
  authFile: `tests/.auth/editor-${parallelIndex}.json`,
  credentials: { email: `editor-${parallelIndex}@payloadpack.com`, password: 'editor' }
})

export const test = base.extend<{ editor: ReturnType<typeof getEditorForWorker>; isolateEditorPreferences: void }>({
  isolateEditorPreferences: [
    async ({ context, editor, playwright }, use) => {
      const editorRequest = await playwright.request.newContext({ baseURL, storageState: editor.authFile })
      await expect(await editorRequest.delete('/api/payload-preferences?where[key][exists]=true')).toBeOK()
      await editorRequest.dispose()
      const isPreferenceSave = (request: Request) =>
        request.url().includes('/api/payload-preferences/') && request.method() === 'POST'
      const unansweredPreferenceSaves = new Set<Request>()
      context.on('request', (request) => {
        if (isPreferenceSave(request)) {
          unansweredPreferenceSaves.add(request)
        }
      })
      context.on('response', (response) => unansweredPreferenceSaves.delete(response.request()))
      context.on('requestfailed', (request) => unansweredPreferenceSaves.delete(request))
      await use()
      await context.route('**/api/payload-preferences/**', (route) =>
        isPreferenceSave(route.request()) ? route.abort() : route.fallback()
      )
      await expect.poll(() => unansweredPreferenceSaves.size).toBe(0)
    },
    { auto: true }
  ],
  editor: async ({}, use, testInfo) => use(getEditorForWorker(testInfo.parallelIndex)),
  storageState: async ({ editor }, use) => use(editor.authFile)
})

export const demoCookie = (name: string, value: string) => ({ name: `theme-demo-${name}`, url: baseURL, value })

const APPEARANCE_PREFERENCE_URL = '/api/payload-preferences/payloadpack-appearance'

export const deleteSavedAppearance = (request: APIRequestContext) => request.delete(APPEARANCE_PREFERENCE_URL)

export const saveAppearancePreference = (request: APIRequestContext, value: object) =>
  request.post(APPEARANCE_PREFERENCE_URL, { data: { value } })

export const waitForHydration = (page: Page) => expect(page.locator('.nav')).toHaveClass(/nav--nav-hydrated/)

export const saveAppearanceAndReload = async (page: Page, setup: object) => {
  await waitForHydration(page)
  await saveAppearancePreference(page.request, setup)
  await page.reload()
}

export const waitForAppearanceSave = (page: Page) =>
  page.waitForResponse((response) => response.url().endsWith(APPEARANCE_PREFERENCE_URL) && response.request().method() === 'POST')

export const clickAndWaitForSave = (page: Page, control: Locator) => Promise.all([waitForAppearanceSave(page), control.click()])

export const buildCustomPalette = (accent: string, primary?: string) => ({
  accent,
  dark: { background: '#0a0a09', primary: primary ?? '#f3f2ed', surface: '#0f0f0e', text: '#f3f2ed' },
  light: { background: '#ffffff', primary: primary ?? '#1a1a1a', surface: '#ffffff', text: '#1a1a1a' }
})

export const waitForAnimations = (locator: Locator) =>
  locator.evaluate((element) => Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished)))

export const openAppearancePanel = async (page: Page) => {
  await page.getByRole('button', { name: 'Appearance' }).click()
  const sheet = page.getByRole('dialog', { name: 'Appearance' })
  await sheet.waitFor()
  await waitForAnimations(sheet)
  return sheet
}

export const radioInGroup = (sheet: Locator, group: string, name: string) =>
  sheet.getByRole('radiogroup', { name: group }).getByRole('radio', { exact: true, name })

export const radioLabel = (radio: Locator) => radio.locator('..')

export const openFineTune = (sheet: Locator) => sheet.locator('summary').click()

export const openShareMenuItem = async (sheet: Locator, action: 'Copy setup' | 'Paste setup') => {
  await sheet.getByRole('button', { name: 'Share setup' }).click()
  return sheet.getByRole('button', { name: action })
}

export const findShowcase = async (page: Page) => {
  const { docs } = await (await page.request.get('/api/showcase?where[slug][equals]=showcase&limit=1')).json()
  return { path: `/admin/collections/showcase/${docs[0].id}`, updatedAt: new Date(docs[0].updatedAt) }
}
