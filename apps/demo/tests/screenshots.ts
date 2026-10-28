import { RADIO_CARDS, VERTICAL_TABS } from '@payloadpack/theme'
import { expect, type Page, test } from '@playwright/test'

import { cookie, findShowcase } from './demo'

const looks = {
  stock: [cookie('admin-theme', 'stock'), cookie('density', 'compact'), cookie('icons', 'payload')],
  themed: [cookie('admin-theme', 'neutral'), cookie('density', 'comfortable'), cookie('icons', 'lucide')]
}

const fields = { 'radio-cards': RADIO_CARDS, 'vertical-tabs': VERTICAL_TABS }

const box = async (page: Page, selector: string) => {
  const rect = await page.locator(selector).first().boundingBox()
  if (!rect) {
    throw new Error(`${selector} is not visible`)
  }
  return rect
}

const openShowcase = async (page: Page, cookies: ReturnType<typeof cookie>[], theme: string) => {
  await page.context().addCookies([...cookies, cookie('theme', theme)])
  const showcase = await findShowcase(page)
  await page.clock.setFixedTime(showcase.updatedAt.getTime() + 60 * 60 * 1000)
  await page.goto(showcase.path, { waitUntil: 'networkidle' })
  await page.locator('.field-type.checkbox').filter({ hasText: 'Featured' }).getByRole('checkbox').check()
  await page.locator('.radio-group').filter({ hasText: 'Size' }).locator('.radio-input').filter({ hasText: /^m$/ }).click()
  await page.locator(`.${RADIO_CARDS} .radio-input`).nth(1).click()
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
    for (const [look, cookies] of Object.entries(looks)) {
      await openShowcase(page, cookies, theme)
      await expect(page).toHaveScreenshot(`compare-${look}-${theme}.png`, { clip: { height: 540, width: 720, x: 0, y: 0 } })
    }

    for (const [name, className] of Object.entries(fields)) {
      await page.locator(`.${className}`).scrollIntoViewIfNeeded()
      const column = await box(page, '.document-fields__fields')
      const field = await box(page, `.${className}`)
      await expect(page).toHaveScreenshot(`${name}-${theme}.png`, {
        clip: { height: field.height + 32, width: column.width + 32, x: column.x - 16, y: field.y - 16 }
      })
    }

    await page.evaluate(() => window.scrollTo(0, 0))
    await page.locator('.user-menu__trigger').click()
    await page.getByRole('menuitem', { name: 'Appearance' }).hover()
    await expect(page.getByRole('menuitemradio', { name: 'Lucide' })).toBeVisible()
    await expect(page).toHaveScreenshot(`appearance-${theme}.png`, { clip: { height: 560, width: 440, x: 0, y: 0 } })
  })
}
