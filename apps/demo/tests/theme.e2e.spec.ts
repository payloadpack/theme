import { VERTICAL_TABS } from '@payloadpack/theme'
import { expect, type Page, test } from '@playwright/test'

const baseURL = 'http://localhost:3020'

const cookie = (name: string, value: string) => ({ name: `theme-demo-${name}`, url: baseURL, value })

const openShowcase = async (page: Page) => {
  await page.context().addCookies([cookie('theme', 'dark')])
  const { docs } = await (await page.request.get('/api/showcase?where[slug][equals]=showcase&limit=1')).json()
  await page.goto(`/admin/collections/showcase/${docs[0].id}`)
  await page.locator('.collapsible__toggle-wrap').first().waitFor()
}

const size = async (page: Page, selector: string) => {
  const box = await page.locator(selector).first().boundingBox()
  return box && { height: box.height, width: box.width }
}

const style = (page: Page, selector: string, property: string, pseudoElement?: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element, [name, pseudo]) => getComputedStyle(element, pseudo).getPropertyValue(name).trim(), [
      property,
      pseudoElement
    ] as const)

test.describe('Logged out', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('defaults to neutral, comfortable and lucide', async ({ page }) => {
    await page.goto('/admin/login')

    await expect(page.locator('html')).toHaveAttribute('data-admin-theme', 'neutral')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'comfortable')
    await expect(page.locator('html')).toHaveAttribute('data-icons', 'lucide')
  })

  test('ignores unknown cookie values', async ({ page }) => {
    await page.context().addCookies([cookie('admin-theme', 'constructor'), cookie('density', '</script>')])
    await page.goto('/admin/login')

    await expect(page.locator('html')).toHaveAttribute('data-admin-theme', 'neutral')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'comfortable')
  })
})

test.describe('Theme plugin', () => {
  test('enlarges code editors in comfortable density and keeps field overrides', async ({ page }) => {
    await openShowcase(page)
    const code = page.locator('.monaco-editor .view-lines').nth(0)
    const smallCode = page.locator('.monaco-editor .view-lines').nth(1)

    await expect(code).toHaveCSS('font-size', '13px')
    await expect(smallCode).toHaveCSS('font-size', '10px')

    await page.evaluate(() => {
      const { monaco } = window as unknown as {
        monaco: { editor: { getEditors: () => { updateOptions: (options: { fontSize: number }) => void }[] } }
      }
      monaco.editor.getEditors()[0].updateOptions({ fontSize: 11 })
    })
    await expect(code).toHaveCSS('font-size', '13px')

    await page.context().addCookies([cookie('density', 'compact')])
    await page.reload()
    await expect(code).toHaveCSS('font-size', '11px')
    await expect(smallCode).toHaveCSS('font-size', '10px')
  })

  test('switches from the user menu and persists across reloads', async ({ page }) => {
    await page.goto('/admin')

    await page.locator('.user-menu__trigger').click()
    await page.getByRole('menuitem', { name: 'Settings' }).hover()
    await page.getByRole('menuitemradio', { name: 'Stock' }).click()
    await page.getByRole('menuitemradio', { name: 'Compact' }).click()

    await expect(page.getByRole('menuitemradio', { name: 'Stock' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('html')).toHaveAttribute('data-admin-theme', 'stock')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact')

    const html = await (await page.request.get('/admin')).text()
    expect(html).toContain(
      '<script>Object.assign(document.documentElement.dataset,{"adminTheme":"stock","density":"compact","icons":"lucide"})</script>'
    )

    await page.reload()

    await expect(page.locator('html')).toHaveAttribute('data-admin-theme', 'stock')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact')
  })
})

test.describe('Theme values', () => {
  test('comfortable density sizes', async ({ page }) => {
    await openShowcase(page)

    await expect(page.locator('.field-label').first()).toHaveCSS('font-size', '14px')
    await expect(page.locator('.field-type.text input').first()).toHaveCSS('font-size', '14px')
    expect(await size(page, '.field-type.text input')).toMatchObject({ height: 40 })
    expect(await size(page, '.doc-controls__controls .btn')).toMatchObject({ height: 32 })
    expect(await size(page, '.nav__link')).toMatchObject({ height: 36 })
    expect(await size(page, '.collapsible__toggle-wrap')).toMatchObject({ height: 48 })
    expect(await size(page, '.collapsible__indicator')).toEqual({ height: 32, width: 32 })
    expect(await size(page, '.collapsible__actions .popup-button')).toEqual({ height: 32, width: 32 })
    expect(await style(page, '.fixed-toolbar + .editor-container .ContentEditable__root', 'padding-top')).toBe('24px')

    const popupMaxHeight = await page
      .locator('.popup__scroll-container')
      .first()
      .evaluate((element) => parseFloat(getComputedStyle(element).maxHeight) === window.innerHeight - 16)
    expect(popupMaxHeight).toBe(true)

    await page.locator('.date-time-picker input').first().click()
    await expect(page.locator('.react-datepicker__header__dropdown')).toHaveCSS('padding-left', '0px')
  })

  test('list view keeps its layout when selecting rows', async ({ page }) => {
    await page.goto('/admin/collections/showcase')
    const table = page.locator('table')
    await table.waitFor()

    expect(await size(page, '.list-controls .dots')).toEqual({ height: 32, width: 32 })

    const before = await table.boundingBox()
    await page.locator('table tbody tr').first().locator('.checkbox-input__input').click()
    await expect(page.locator('.list-selection')).toBeVisible()
    expect((await table.boundingBox())?.y).toBe(before?.y)
  })

  test('checked checkboxes fill with the text color and use the Lucide tick', async ({ page }) => {
    await openShowcase(page)
    const featured = page.locator('.field-type.checkbox').filter({ hasText: 'Featured' })
    await featured.getByRole('checkbox').check()
    await page.mouse.move(0, 0)

    await expect(featured.locator('.checkbox-input__visuals')).toHaveCSS('background-color', 'rgb(243, 242, 237)')
    await expect(featured.locator('.checkbox-input__check')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.9)')
    expect(await style(page, '.field-type.checkbox .checkbox-input__check', 'mask-image')).toContain('data:image/svg+xml')
    expect(await size(page, '.field-type.checkbox .checkbox-input__input')).toEqual({ height: 18, width: 18 })
    expect(await size(page, '.field-type.checkbox .checkbox-input__check')).toEqual({ height: 18, width: 18 })
    await expect(featured.locator('.field-description')).toHaveCSS('padding-left', '26px')

    const center = async (selector: string) => {
      const box = await featured.locator(selector).boundingBox()
      return box && box.y + box.height / 2
    }
    expect(await center('.checkbox-input__input')).toBe(await center('.field-label'))
  })

  test('a click changes the checkbox in one step', async ({ page }) => {
    await openShowcase(page)
    const featured = page.locator('.field-type.checkbox').filter({ hasText: 'Featured' })
    const visuals = featured.locator('.checkbox-input__visuals')
    await expect(featured.getByRole('checkbox')).toBeEnabled()
    const box = await featured.locator('.checkbox-input__input').boundingBox()

    await page.mouse.move((box?.x ?? 0) + 9, (box?.y ?? 0) + 9)
    const hovered = await visuals.evaluate((element) => getComputedStyle(element).backgroundColor)
    await page.mouse.down()
    await expect(visuals).toHaveCSS('background-color', hovered)
    await page.mouse.up()

    await expect(visuals).toHaveCSS('background-color', 'rgb(243, 242, 237)')
  })

  test('Payload icons keep the Payload tick without its halo', async ({ page }) => {
    await page.context().addCookies([cookie('icons', 'payload')])
    await openShowcase(page)
    const featured = page.locator('.field-type.checkbox').filter({ hasText: 'Featured' })
    await featured.getByRole('checkbox').check()

    await expect(featured.locator('.checkbox-input__check .checkbox-input__mark')).toHaveCSS('stroke', 'rgba(0, 0, 0, 0.9)')
    await expect(featured.locator('.checkbox-input__check .checkbox-input__mark-halo')).toBeHidden()
  })

  test('large buttons on the dashboard', async ({ page }) => {
    await page.goto('/admin')

    expect(await size(page, '.recents-widget__select-documents')).toMatchObject({ height: 40 })
  })

  test('neutral dark palette', async ({ page }) => {
    await openShowcase(page)

    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(15, 15, 14)')
    await expect(page.locator('.nav')).toHaveCSS('background-color', 'rgb(10, 10, 9)')
    await expect(page.locator('body')).toHaveCSS('color', 'rgb(243, 242, 237)')
    await expect(page.locator('.field-type.text input').first()).toHaveCSS('background-color', 'rgb(24, 24, 23)')
    await expect(page.locator('.field-type.text input').first()).toHaveCSS('border-top-color', 'rgb(42, 42, 39)')
    expect(await style(page, 'html', '--accessibility-focus-color')).toBe('#f3f2ed')

    await page.getByRole('button', { name: 'More options' }).first().click()
    await expect(page.locator('.popup__content:visible').first()).toHaveCSS('border-radius', '9px')
  })

  test('lucide icon sizes and mappings', async ({ page }) => {
    await openShowcase(page)

    expect(await style(page, '.date-time-picker svg.icon--calendar', 'mask-size')).toBe('min(100%, 14px) auto')
    expect(await style(page, '.dropdown-indicator svg.icon--chevron', 'mask-size')).toBe('min(100%, 12px) auto')
    expect(await style(page, '.multi-value svg.icon--edit', 'mask-size')).toBe('min(100%, 12px) auto')
    expect(await style(page, '.collapsible__indicator svg.icon--chevron', 'mask-size')).toBe('min(100%, 16px) auto')
    expect(await style(page, '.collapsible__actions svg.icon--more', 'mask-size')).toBe('min(100%, 16px) auto')
    expect(await style(page, '.sidebar-tabs__tab svg.icon--align-justified', '--payloadpack-icon')).toContain(
      'data:image/svg+xml'
    )
    expect(await style(page, '.nav__link', 'mask-image', '::after')).toContain('data:image/svg+xml')
  })

  test('vertical tabs from 768px wide', async ({ page }) => {
    await openShowcase(page)
    const tabs = page.locator(`.${VERTICAL_TABS}`)
    const layout = () =>
      tabs.evaluate((root) => {
        const [general, advanced] = [...root.querySelectorAll('[role="tab"]')].map((tab) => tab.getBoundingClientRect())
        return {
          advanced: { left: advanced.left, top: advanced.top },
          content: root.querySelector('.tabs-field__content-wrap')?.getBoundingClientRect().left,
          general: { bottom: general.bottom, left: general.left, right: general.right, top: general.top },
          list: root.querySelector('.tabs-field__tabs-wrap')?.getBoundingClientRect().width
        }
      })

    const wide = await layout()
    expect(wide.advanced).toEqual({ left: wide.general.left, top: wide.general.bottom })
    expect(wide.list).toBe(270)
    expect(wide.content).toBeGreaterThan(wide.general.right)
    expect(await style(page, `.${VERTICAL_TABS} .tabs-field__tab-button--active`, 'width', '::after')).toBe('3px')
    expect(await style(page, `.${VERTICAL_TABS} .tabs-field__tab-button--active`, 'height', '::after')).toBe(
      `${wide.general.bottom - wide.general.top}px`
    )

    await tabs.getByRole('tab', { name: 'Advanced' }).click()
    await expect(tabs.getByLabel('Canonical Url')).toBeVisible()

    await page.setViewportSize({ width: 700, height: 900 })
    const narrow = await layout()
    expect(narrow.advanced.top).toBe(narrow.general.top)
  })

  test('roomier confirmation dialogs', async ({ page }) => {
    await openShowcase(page)
    await page.locator('.field-type.checkbox').filter({ hasText: 'Featured' }).getByRole('checkbox').check()
    await page.locator('#nav-users').click()
    const dialog = page.locator('.dialog--small').filter({ hasText: 'Leave without saving' })

    await expect(dialog).toBeVisible()
    expect((await dialog.boundingBox())?.width).toBe(400)
    await expect(dialog.locator('.dialog__header')).toHaveCSS('padding', '16px 16px 16px 24px')
    await expect(dialog.locator('.dialog-title')).toHaveCSS('font-size', '16px')
    await expect(dialog.locator('.dialog__body')).toHaveCSS('padding', '24px')
    await expect(dialog.locator('.dialog__footer')).toHaveCSS('padding', '16px 24px')
  })

  test('each area sizes its buttons independently', async ({ page }) => {
    await openShowcase(page)
    await page.addStyleTag({ content: 'html { --payloadpack-row-button-height: 2.5rem; }' })

    expect(await size(page, '.collapsible__indicator')).toEqual({ height: 40, width: 40 })
    expect(await size(page, '.collapsible__actions .popup-button')).toEqual({ height: 40, width: 40 })
    expect(await size(page, '.collapsible__toggle-wrap')).toMatchObject({ height: 56 })
    expect(await size(page, '.doc-controls__controls .btn')).toMatchObject({ height: 32 })
    expect(await size(page, '.doc-header .doc-tab')).toMatchObject({ height: 32 })
  })

  test('app CSS picks the nav icon for its own collection', async ({ page }) => {
    await page.goto('/admin')
    await page.addStyleTag({ content: "#nav-showcase { --payloadpack-icon: url('/icons/chef-hat.svg'); }" })

    expect(await style(page, '#nav-showcase', 'mask-image', '::after')).toContain('/icons/chef-hat.svg')
    expect((await page.request.get('/icons/chef-hat.svg')).headers()['content-type']).toContain('image/svg+xml')
  })

  test('app CSS outranks the plugin', async ({ page }) => {
    await openShowcase(page)
    await page.addStyleTag({ content: 'html { --popup-radius: 2px; }' })

    await page.getByRole('button', { name: 'More options' }).first().click()
    await expect(page.locator('.popup__content:visible').first()).toHaveCSS('border-radius', '2px')
  })

  test('stock, compact and Payload icons apply none of the theme settings', async ({ page }) => {
    await page.context().addCookies([cookie('admin-theme', 'stock'), cookie('density', 'compact'), cookie('icons', 'payload')])
    await openShowcase(page)

    const { applied, total } = await page.evaluate(() => {
      const styleRules = (list: CSSRuleList): CSSStyleRule[] =>
        [...list].flatMap((rule) =>
          rule instanceof CSSMediaRule ? styleRules(rule.cssRules) : rule instanceof CSSStyleRule ? [rule] : []
        )
      const rules = [...document.styleSheets]
        .flatMap((sheet) => [...sheet.cssRules])
        .filter((rule): rule is CSSLayerBlockRule => rule instanceof CSSLayerBlockRule && rule.name === 'payload')
        .flatMap((layer) => styleRules(layer.cssRules))
      const elementSelector = (selector: string) => selector.replace(/::[\w-]+/g, '')
      return {
        applied: rules
          .map((rule) => rule.selectorText)
          .filter((selector) => document.querySelectorAll(elementSelector(selector)).length > 0),
        total: rules.length
      }
    })

    expect(total).toBeGreaterThan(0)
    expect(applied).toContain(`.${VERTICAL_TABS}`)
    expect(applied.filter((selector) => !selector.startsWith(`.${VERTICAL_TABS}`))).toEqual([])
  })
})
