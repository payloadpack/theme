import type { Page } from '@playwright/test'

export const authFile = 'tests/.auth/demo.json'

export const baseURL = 'http://localhost:3020'

export const cookie = (name: string, value: string) => ({ name: `theme-demo-${name}`, url: baseURL, value })

export const findShowcase = async (page: Page) => {
  const { docs } = await (await page.request.get('/api/showcase?where[slug][equals]=showcase&limit=1')).json()
  return { path: `/admin/collections/showcase/${docs[0].id}`, updatedAt: new Date(docs[0].updatedAt) }
}
