import { type APIRequestContext, expect, type Locator, type Page } from '@playwright/test'

export const authFile = 'tests/.auth/demo.json'

export const baseURL = `http://localhost:${process.env.DEMO_PORT ?? 3020}`

export const demoCookie = (name: string, value: string) => ({ name: `theme-demo-${name}`, url: baseURL, value })

const appearancePreferenceURL = '/api/payload-preferences/payloadpack-appearance'

export const deleteSavedAppearance = (request: APIRequestContext) => request.delete(appearancePreferenceURL)

export const saveAppearancePreference = (request: APIRequestContext, value: object) =>
  request.post(appearancePreferenceURL, { data: { value } })

export const waitForHydration = (page: Page) => expect(page.locator('.nav')).toHaveClass(/nav--nav-hydrated/)

export const saveAppearanceAndReload = async (page: Page, setup: object) => {
  await waitForHydration(page)
  await saveAppearancePreference(page.request, setup)
  await page.reload()
}

export const waitForAppearanceSave = (page: Page) =>
  page.waitForResponse((response) => response.url().endsWith(appearancePreferenceURL) && response.request().method() === 'POST')

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
