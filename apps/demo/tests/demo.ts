import { RADIO_CARDS, SWITCH } from '@payloadpack/theme'
import { type APIRequestContext, test as base, expect, type Locator, type Page, type Request } from '@playwright/test'

export const AUTH_FILE = 'tests/.auth/demo.json'

export const DEMO_PORT = process.env.DEMO_PORT ?? '3021'

export const NOTIFY_SWITCH_SELECTOR = `.${SWITCH}:has(#field-notify)`

export const baseURL = `http://localhost:${DEMO_PORT}`

export const getEditorForWorker = (parallelIndex: number) => ({
  apiKey: `editor-${parallelIndex}-api-key-0000-000000000000`,
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

export const parkPointer = async (page: Page) => {
  const viewport = page.viewportSize()
  if (!viewport) {
    throw new Error('The page has no viewport')
  }
  await page.mouse.move(viewport.width - 1, viewport.height - 1)
}

export const fillShowcaseChoiceFields = async (page: Page) => {
  await page.locator('.field-type.checkbox').filter({ hasText: 'Featured' }).getByRole('checkbox').check()
  await page.locator('.radio-group').filter({ hasText: 'Size' }).locator('.radio-input').filter({ hasText: /^m$/ }).click()
  await page.locator(`.${RADIO_CARDS} .radio-input`).nth(1).click()
  await page.locator(NOTIFY_SWITCH_SELECTOR).getByRole('checkbox').check()
}

const LOADING_PLACEHOLDERS =
  '.shimmer-effect, .loading-overlay:not(.loading-overlay--exiting), .monaco-editor:not(:has(.view-line))'

type MonacoOnWindow = {
  editor: {
    colorize: (text: string, languageId: string, options: object) => Promise<string>
    getEditors: () => { getModel: () => { getLanguageId: () => string } | null }[]
  }
}

const waitForCodeEditorHighlighting = (page: Page) =>
  page.evaluate(async () => {
    const monaco = (window as Window & { monaco?: MonacoOnWindow }).monaco
    if (!monaco) {
      return
    }
    const languageIds = monaco.editor.getEditors().flatMap((editor) => editor.getModel()?.getLanguageId() ?? [])
    await Promise.all(languageIds.map((languageId) => monaco.editor.colorize('', languageId, {})))
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })

export const waitForLoadingToFinish = async (page: Page) => {
  await expect(page.locator(LOADING_PLACEHOLDERS)).toHaveCount(0)
  await waitForCodeEditorHighlighting(page)
}

const NETWORK_QUIET_MS = 500

export const SETTLE_TIMEOUT_MS = 30_000

const trackNetworkActivity = (page: Page) => {
  const requestsInFlight = new Set<Request>()
  let lastNetworkActivityAt = Date.now()
  const markRequestStarted = (request: Request) => {
    requestsInFlight.add(request)
    lastNetworkActivityAt = Date.now()
  }
  const markRequestEnded = (request: Request) => {
    requestsInFlight.delete(request)
    lastNetworkActivityAt = Date.now()
  }
  page.on('request', markRequestStarted)
  page.on('requestfinished', markRequestEnded)
  page.on('requestfailed', markRequestEnded)
  return (quietSince: number) =>
    expect
      .poll(() => requestsInFlight.size === 0 && Date.now() - Math.max(lastNetworkActivityAt, quietSince) >= NETWORK_QUIET_MS, {
        intervals: [100],
        message: `no requests for ${NETWORK_QUIET_MS} ms after hydration`,
        timeout: SETTLE_TIMEOUT_MS
      })
      .toBe(true)
}

export const openSignedOutPathAndSettle = async (page: Page, path: string) => {
  await page.goto(path, { waitUntil: 'networkidle' })
  await waitForLoadingToFinish(page)
}

export const openSignedInPathAndSettle = async (page: Page, path: string) => {
  const waitForNetworkQuietSince = trackNetworkActivity(page)
  await page.goto(path)
  await waitForHydration(page)
  await waitForNetworkQuietSince(Date.now())
  await waitForLoadingToFinish(page)
}
