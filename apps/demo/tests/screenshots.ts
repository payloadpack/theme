import { RADIO_CARDS, SWITCH, VERTICAL_TABS } from '@payloadpack/theme'
import { expect, type Page, test } from '@playwright/test'

import {
  deleteSavedAppearance,
  demoCookie,
  findShowcase,
  openAppearancePanel,
  openFineTune,
  saveAppearancePreference
} from './demo'

test.beforeEach(async ({ page }) => {
  await deleteSavedAppearance(page.request)
})

const APPEARANCE_VARIANTS = {
  payload: { character: 'payload', palette: 'payload' },
  themed: {}
}

const GALLERY_SETUPS = {
  'payload-neutral': { character: 'payload', palette: 'neutral' },
  'studio-neutral': { character: 'studio', palette: 'neutral' },
  'enhanced-payload': { palette: 'payload' },
  'enhanced-warm': { palette: 'warm' },
  'enhanced-soft': { palette: 'soft' }
}

const COMPARE_CLIP = { height: 540, width: 720, x: 0, y: 0 }

const CUSTOM_FIELD_CLASS_NAMES = { 'radio-cards': RADIO_CARDS, switch: SWITCH, 'vertical-tabs': VERTICAL_TABS }

const visibleBoundingBox = async (page: Page, selector: string) => {
  const rect = await page.locator(selector).first().boundingBox()
  if (!rect) {
    throw new Error(`${selector} is not visible`)
  }
  return rect
}

const openShowcase = async (page: Page, setup: object, theme: string) => {
  await saveAppearancePreference(page.request, setup)
  await page.context().addCookies([demoCookie('theme', theme)])
  const showcase = await findShowcase(page)
  await page.clock.setFixedTime(showcase.updatedAt.getTime() + 60 * 60 * 1000)
  await page.goto(showcase.path, { waitUntil: 'networkidle' })
  await page.locator('.field-type.checkbox').filter({ hasText: 'Featured' }).getByRole('checkbox').check()
  await page.locator('.radio-group').filter({ hasText: 'Size' }).locator('.radio-input').filter({ hasText: /^m$/ }).click()
  await page.locator(`.${RADIO_CARDS} .radio-input`).nth(1).click()
  await page.locator(`.${SWITCH}`).getByRole('checkbox').check()
  await page.getByRole('tab', { name: 'General' }).click()
  await page.evaluate(() => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    window.scrollTo(0, 0)
  })
  const viewport = page.viewportSize()
  if (!viewport) {
    throw new Error('The page has no viewport')
  }
  await page.mouse.move(viewport.width - 1, viewport.height - 1)
}

for (const theme of ['dark', 'light']) {
  test(theme, async ({ page }) => {
    for (const [look, setup] of Object.entries(APPEARANCE_VARIANTS)) {
      await openShowcase(page, setup, theme)
      await expect(page).toHaveScreenshot(`compare-${look}-${theme}.png`, { clip: COMPARE_CLIP })
    }

    for (const [galleryName, setup] of Object.entries(GALLERY_SETUPS)) {
      await openShowcase(page, setup, theme)
      await expect(page).toHaveScreenshot(`gallery-${galleryName}-${theme}.png`, { clip: COMPARE_CLIP })
    }

    for (const [name, className] of Object.entries(CUSTOM_FIELD_CLASS_NAMES)) {
      await page.locator(`.${className}`).scrollIntoViewIfNeeded()
      const column = await visibleBoundingBox(page, '.document-fields__fields')
      const field = await visibleBoundingBox(page, `.${className}`)
      await expect(page).toHaveScreenshot(`${name}-${theme}.png`, {
        clip: { height: field.height + 32, width: column.width + 32, x: column.x - 16, y: field.y - 16 }
      })
    }

    await openShowcase(page, APPEARANCE_VARIANTS.themed, theme)
    const sheet = await openAppearancePanel(page)
    await openFineTune(sheet)
    const height = await sheet.evaluate((element) =>
      [...element.children].reduce((sum, child) => sum + Math.max(child.scrollHeight, (child as HTMLElement).offsetHeight), 0)
    )
    await page.setViewportSize({ height: Math.ceil(height), width: 1280 })
    await page.mouse.move(0, 0)
    await expect(page).toHaveScreenshot(`appearance-${theme}.png`, {
      clip: await visibleBoundingBox(page, '.payloadpack-appearance-panel__sheet')
    })
  })
}
