import { expect, type Page, test } from '@playwright/test'

import { demoCookie, openSignedInPathAndSettle, parkPointer, saveAppearancePreference } from './demo'

const SOCIAL_PREVIEW_CARD_URL = new URL('social-preview.html', import.meta.url).href

const openCardAndFindAdminScreenshotSlot = async (page: Page) => {
  await page.setViewportSize({ height: 640, width: 1280 })
  await page.goto(SOCIAL_PREVIEW_CARD_URL)
  return page.locator('.admin-screenshot')
}

test('social preview', async ({ page }) => {
  const adminScreenshotWidth = await (await openCardAndFindAdminScreenshotSlot(page)).evaluate((image) => image.clientWidth)

  expect(await saveAppearancePreference(page.request, { character: 'studio', palette: 'neutral' })).toBeOK()
  await page.context().addCookies([demoCookie('theme', 'dark')])
  const {
    docs: [choosingAPalettePost]
  } = await (await page.request.get(`/api/posts?where[title][equals]=${encodeURIComponent('Choosing a palette')}&limit=1`)).json()
  await page.clock.setFixedTime(new Date(choosingAPalettePost.updatedAt).getTime() + 60 * 60 * 1000)
  await page.setViewportSize({ height: 720, width: adminScreenshotWidth })
  await openSignedInPathAndSettle(page, `/admin/collections/posts/${choosingAPalettePost.id}`)
  await parkPointer(page)
  const adminScreenshot = await page.screenshot()

  await (
    await openCardAndFindAdminScreenshotSlot(page)
  ).evaluate(
    (image: HTMLImageElement, adminScreenshotDataUrl) => {
      image.src = adminScreenshotDataUrl
      return image.decode()
    },
    `data:image/png;base64,${adminScreenshot.toString('base64')}`
  )
  await expect(page).toHaveScreenshot('social-preview.png')
})
