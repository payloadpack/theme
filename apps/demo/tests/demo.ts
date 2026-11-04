import type { Locator, Page } from '@playwright/test'

export const authFile = 'tests/.auth/demo.json'

export const baseURL = `http://localhost:${process.env.DEMO_PORT ?? 3020}`

export const cookie = (name: string, value: string) => ({ name: `theme-demo-${name}`, url: baseURL, value })

export const appearance = (choices: object) => cookie('appearance', encodeURIComponent(JSON.stringify(choices)))

const setupPreference = '/api/payload-preferences/payloadpack-appearance'

export const clearSetup = (page: Page) => page.request.delete(setupPreference)

export const saved = (page: Page) =>
  page.waitForResponse((response) => response.url().endsWith(setupPreference) && response.request().method() === 'POST')

export const pickAndSave = (page: Page, control: Locator) => Promise.all([saved(page), control.click()])

export const customPalette = (accent: string, primary?: string) => ({
  accent,
  dark: { background: '#0a0a09', primary: primary ?? '#f3f2ed', surface: '#0f0f0e', text: '#f3f2ed' },
  light: { background: '#ffffff', primary: primary ?? '#1a1a1a', surface: '#ffffff', text: '#1a1a1a' }
})

export const settled = (locator: Locator) =>
  locator.evaluate((element) => Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished)))

export const openAppearancePanel = async (page: Page) => {
  await page.getByRole('button', { name: 'Appearance' }).click()
  const sheet = page.getByRole('dialog', { name: 'Appearance' })
  await sheet.waitFor()
  await settled(sheet)
  return sheet
}

export const findShowcase = async (page: Page) => {
  const { docs } = await (await page.request.get('/api/showcase?where[slug][equals]=showcase&limit=1')).json()
  return { path: `/admin/collections/showcase/${docs[0].id}`, updatedAt: new Date(docs[0].updatedAt) }
}
