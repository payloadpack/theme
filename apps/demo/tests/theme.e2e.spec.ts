import { RADIO_CARDS, SWITCH, VERTICAL_TABS } from '@payloadpack/theme'
import { expect, type Locator, type Page, test } from '@playwright/test'

import {
  appearance,
  authFile,
  baseURL,
  clearSetup,
  cookie,
  customPalette,
  findShowcase,
  openAppearancePanel,
  pickAndSave,
  saved,
  settled
} from './demo'

test.beforeEach(async ({ page }) => {
  await clearSetup(page)
})

const nextScripts = '**/_next/static/**/*.js'

const openShowcase = async (page: Page) => {
  await page.context().addCookies([cookie('theme', 'dark')])
  await page.goto((await findShowcase(page)).path)
  await page.locator('.collapsible__toggle-wrap').first().waitFor()
}

const size = async (page: Page, selector: string) => {
  const box = await page.locator(selector).first().boundingBox()
  return box && { height: box.height, width: box.width }
}

const computedColor = (page: Page, color: string) =>
  page.evaluate((value) => {
    const probe = document.createElement('div')
    probe.style.color = value
    document.body.append(probe)
    const computed = getComputedStyle(probe).color
    probe.remove()
    return computed
  }, color)

const nearColor = async (page: Page, actual: string, expected: string) => {
  const [a, b] = [await channels(page, 'oklab', actual), await channels(page, 'oklab', expected)]
  return a.length === b.length && a.every((value, index) => Math.abs(value - b[index]) < 0.004)
}

const style = (page: Page, selector: string, property: string, pseudoElement?: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element, [name, pseudo]) => getComputedStyle(element, pseudo).getPropertyValue(name).trim(), [
      property,
      pseudoElement
    ] as const)

const channels = async (page: Page, space: 'oklab' | 'oklch', color: string) =>
  (await computedColor(page, `${space}(from ${color} ${space === 'oklab' ? 'l a b' : 'l c h'})`))
    .match(/-?[\d.]+/g)
    ?.map(Number) ?? []

const backgrounds = (page: Page) =>
  page.evaluate(() => [document.documentElement, document.body].map((element) => getComputedStyle(element).backgroundColor))

test.describe('Logged out', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('defaults to Enhanced and Warm with medium radius, comfortable density, Lucide icons and motion', async ({ page }) => {
    await page.context().addCookies([cookie('theme', 'dark')])
    await page.goto('/admin/login')

    await expect(page.locator('html')).toHaveAttribute('data-character', 'enhanced')
    await expect(page.locator('html')).toHaveAttribute('data-radius', 'md')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'comfortable')
    await expect(page.locator('html')).toHaveAttribute('data-icons', 'lucide')
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on')
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'warm')
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(15, 15, 14)')
  })

  test('ignores unknown cookie values', async ({ page }) => {
    await page.context().addCookies([appearance({ character: 'constructor', options: { enhanced: { density: '</script>' } } })])
    await page.goto('/admin/login')

    await expect(page.locator('html')).toHaveAttribute('data-character', 'enhanced')
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

    await page.context().addCookies([appearance({ options: { enhanced: { density: 'compact' } } })])
    await page.reload()
    await expect(code).toHaveCSS('font-size', '11px')
    await expect(smallCode).toHaveCSS('font-size', '10px')
  })

  test('renders the appearance cookie on the server, with no option attributes under Stock', async ({ page }) => {
    await page.context().addCookies([appearance({ character: 'stock', options: { enhanced: { density: 'compact' } } })])

    const html = await (await page.request.get('/admin')).text()
    expect(html).toContain(
      `<script>Object.assign(document.documentElement.dataset,{"character":"stock","palette":"warm"});document.documentElement.style.setProperty('--payloadpack-font-geist',"'Geist', 'Geist Fallback'")</script>`
    )

    await page.goto('/admin')
    await expect(page.locator('html')).toHaveAttribute('data-character', 'stock')
    for (const option of ['radius', 'density', 'icons', 'motion']) {
      await expect(page.locator('html')).not.toHaveAttribute(`data-${option}`)
    }
  })

  test('paints the dashboard in the theme before hydration', async ({ page }) => {
    await page.context().addCookies([cookie('theme', 'dark')])

    await page.route(nextScripts, (route) => route.abort())
    await page.goto('/admin')
    const beforeHydration = await backgrounds(page)

    await page.unroute(nextScripts)
    await page.goto('/admin', { waitUntil: 'networkidle' })

    expect(beforeHydration).toEqual(await backgrounds(page))
  })
})

test.describe('Appearance panel', () => {
  test('opens from the header as a full-height sheet on the right and closes with Escape', async ({ page }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)

    expect(await sheet.boundingBox()).toEqual({ height: 900, width: 360, x: 1080, y: 0 })

    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()

    await page.setViewportSize({ height: 800, width: 375 })
    await openAppearancePanel(page)

    expect(await sheet.boundingBox()).toEqual({ height: 800, width: 375, x: 0, y: 0 })

    await sheet.getByRole('button', { name: 'Close' }).click()
    await expect(sheet).toBeHidden()
  })

  test('picks Stock with no option attributes and keeps it after a reload', async ({ page }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)

    await pickAndSave(page, sheet.getByRole('button', { name: 'Stock' }))

    await expect(sheet.getByRole('button', { name: 'Stock' })).toHaveAttribute('aria-pressed', 'true')
    await expect(sheet.getByText("Stock keeps Payload's own layout. It has no options.")).toBeVisible()
    await expect(sheet.getByRole('group', { name: 'Density' })).toHaveCount(0)
    await expect(page.locator('html')).toHaveAttribute('data-character', 'stock')
    await expect(page.locator('html')).not.toHaveAttribute('data-density')

    await page.reload()

    await expect(page.locator('html')).toHaveAttribute('data-character', 'stock')
    await expect(page.locator('html')).not.toHaveAttribute('data-density')
  })

  test('switches density, keeps it across characters and resets to the defaults', async ({ page }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    const compact = sheet.getByRole('group', { name: 'Density' }).getByRole('button', { name: 'Compact' })

    await compact.click()

    await expect(compact).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact')

    await sheet.getByRole('button', { name: 'Stock' }).click()
    await sheet.getByRole('button', { name: 'Enhanced' }).click()

    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact')

    await sheet.getByRole('button', { name: 'Stock' }).click()
    await pickAndSave(page, sheet.getByRole('button', { name: 'Reset' }))

    await expect(page.locator('html')).toHaveAttribute('data-character', 'enhanced')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'comfortable')
    expect((await page.context().cookies()).map(({ name }) => name)).not.toContain('theme-demo-appearance')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-character', 'enhanced')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'comfortable')
  })

  test('saves the setup in Payload preferences, so it follows the editor to a new browser', async ({ browser, page }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)

    await pickAndSave(page, sheet.getByRole('group', { name: 'Density' }).getByRole('button', { name: 'Compact' }))

    const elsewhere = await browser.newContext({ baseURL, storageState: authFile })
    const other = await elsewhere.newPage()
    await other.goto('/admin')

    expect((await elsewhere.cookies()).map(({ name }) => name)).not.toContain('theme-demo-appearance')
    await expect(other.locator('html')).toHaveAttribute('data-density', 'compact')
    await elsewhere.close()
  })

  test('copies the setup in one browser and pastes it in another', async ({ browser, context, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.context().addCookies([appearance({ character: 'stock', custom: customPalette('#be185d'), palette: 'custom' })])
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)

    await sheet.getByRole('button', { name: 'Copy setup' }).click()
    await expect(sheet.getByRole('button', { name: 'Copied' })).toBeVisible()
    const setup = await page.evaluate(() => navigator.clipboard.readText())
    const attributes = await page.locator('html').evaluate((html) => ({ ...html.dataset }))

    const elsewhere = await browser.newContext({ baseURL, storageState: authFile })
    await elsewhere.grantPermissions(['clipboard-read', 'clipboard-write'])
    const other = await elsewhere.newPage()
    await other.goto('/admin')
    const otherSheet = await openAppearancePanel(other)
    const pasteButton = otherSheet.getByRole('button', { name: 'Paste setup' })
    const writeClipboard = (text: string) => other.evaluate((value) => navigator.clipboard.writeText(value), text)

    await writeClipboard('not a setup')
    await pasteButton.click()
    await expect(otherSheet.getByRole('button', { name: 'Invalid setup' })).toBeVisible()
    await expect(otherSheet.getByRole('status')).toHaveText('Invalid setup')
    await expect(other.locator('html')).toHaveAttribute('data-character', 'enhanced')
    await expect(pasteButton).toBeVisible()
    await expect(otherSheet.getByRole('status')).toBeEmpty()

    await writeClipboard(setup)
    await pickAndSave(other, pasteButton)
    expect(await other.locator('html').evaluate((html) => ({ ...html.dataset }))).toEqual(attributes)
    await elsewhere.close()
  })

  test('sits left of the nav toggle under Enhanced, right of it under Studio, and in the header when the nav is closed or Stock', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Appearance' })
    const beside = async () => {
      const [trigger, toggle] = [(await button.boundingBox())!, (await page.locator('.payloadpack-rail-toggle').boundingBox())!]
      expect(trigger.y).toBe(toggle.y)
      return trigger.x < toggle.x ? 'left' : 'right'
    }

    await page.goto('/admin')
    expect(await beside()).toBe('left')

    await page.context().addCookies([appearance({ character: 'studio' })])
    await page.reload()
    expect(await beside()).toBe('right')

    await page.route('**/api/payload-preferences/nav*', (route) =>
      route.request().method() === 'POST' ? route.fulfill({ json: {} }) : route.fallback()
    )
    await page.context().addCookies([appearance({ options: { enhanced: { nav: 'hidden' } } })])
    await page.reload()
    await page.getByRole('button', { name: 'Hide sidebar' }).click()
    await expect(page.locator('.app-header').getByRole('button', { name: 'Appearance' })).toBeVisible()

    await page.context().addCookies([appearance({ character: 'stock' })])
    await page.reload()
    await expect(page.locator('.app-header').getByRole('button', { name: 'Appearance' })).toBeVisible()
  })

  test('draws the bundled Lucide palette icon on the header button', async ({ page }) => {
    await page.goto('/admin')

    expect(await style(page, '.payloadpack-appearance-panel__palette-icon', 'mask-image')).toContain('data:image/svg+xml')
  })

  test('segments sit 3px inside a bordered track', async ({ page }) => {
    await page.goto('/admin')
    const track = (await openAppearancePanel(page)).getByRole('group', { name: 'Density' })
    const inset = await track.evaluate((element) => {
      const outer = element.getBoundingClientRect()
      const inner = element.querySelector('[aria-pressed="true"]')!.getBoundingClientRect()
      return [inner.top - outer.top, outer.bottom - inner.bottom, outer.right - inner.right]
    })

    expect(inset).toEqual([4, 4, 4])
    await expect(track).toHaveCSS('border-top-width', '1px')
    await expect(track).toHaveCSS('border-radius', '8px')
  })

  test('switches Payload color mode', async ({ page }) => {
    await page.goto('/admin')
    const colorMode = (await openAppearancePanel(page)).getByRole('group', { name: 'Color mode' })
    const themeCookie = async () => (await page.context().cookies()).find(({ name }) => name === 'theme-demo-theme')?.value

    await expect(colorMode.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'true')

    await colorMode.getByRole('button', { name: 'Dark' }).click()

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(colorMode.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
    expect(await themeCookie()).toBe('dark')

    await colorMode.getByRole('button', { name: 'Auto' }).click()

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    expect(await themeCookie()).toBeUndefined()
  })
})

test.describe('Theme values', () => {
  test('comfortable density sizes', async ({ page }) => {
    await openShowcase(page)

    await expect(page.locator('.field-label').first()).toHaveCSS('font-size', '14px')
    await expect(page.locator('.field-type.text input').first()).toHaveCSS('font-size', '14px')
    expect(await size(page, '.field-type.text input')).toMatchObject({ height: 36 })
    expect(await size(page, '.doc-controls__controls .btn')).toMatchObject({ height: 36 })
    expect(await size(page, '.nav__link')).toMatchObject({ height: 36 })
    expect(await size(page, '.collapsible__toggle-wrap')).toMatchObject({ height: 52 })
    expect(await size(page, '.collapsible__indicator')).toEqual({ height: 36, width: 36 })
    expect(await size(page, '.collapsible__actions .popup-button')).toEqual({ height: 36, width: 36 })
    expect(await size(page, '.slug-field-component__action-btn')).toEqual({ height: 28, width: 28 })
    expect(await style(page, '.slug-field-component__action-btn', 'border-radius')).toBe(
      await style(page, '.doc-controls__controls .btn', 'border-radius')
    )
    expect(await style(page, '.fixed-toolbar + .editor-container .ContentEditable__root', 'padding-top')).toBe('24px')

    const popupMaxHeight = await page
      .locator('.popup__scroll-container')
      .first()
      .evaluate((element) => parseFloat(getComputedStyle(element).maxHeight) === window.innerHeight - 16)
    expect(popupMaxHeight).toBe(true)

    await page.locator('.doc-controls__popup-button').click()
    await settled(page.locator('.doc-controls__popup'))
    expect(await size(page, '.doc-controls__popup .popup-button-list__button')).toMatchObject({ height: 32 })

    await page.locator('.date-time-picker input').first().click()
    await expect(page.locator('.react-datepicker__header__dropdown')).toHaveCSS('padding-left', '0px')
  })

  test('list view keeps its layout when selecting rows', async ({ page }) => {
    await page.goto('/admin/collections/showcase')
    const table = page.locator('table')
    await table.waitFor()

    expect(await size(page, '.list-controls .dots')).toEqual({ height: 36, width: 36 })

    const before = await table.boundingBox()
    await page.locator('table tbody tr').first().locator('.checkbox-input__input').click()
    await expect(page.locator('.list-selection')).toBeVisible()
    expect((await table.boundingBox())?.y).toBe(before?.y)
  })

  test('radio cards stack with the radio on the right', async ({ page }) => {
    await openShowcase(page)
    const cards = page.locator(`.${RADIO_CARDS} .radio-input`)
    await cards.first().click()
    await page.mouse.move(0, 0)

    const layout = await page.locator(`.${RADIO_CARDS}`).evaluate((root) =>
      [...root.querySelectorAll('.radio-input')].map((card) => {
        const box = card.getBoundingClientRect()
        const radio = card.querySelector('.radio-input__styled-radio')?.getBoundingClientRect()
        return { bottom: box.bottom, radioRight: radio?.right, right: box.right, top: box.top }
      })
    )
    expect(layout).toHaveLength(3)
    expect(layout[1].top).toBeGreaterThan(layout[0].bottom)
    expect(layout[0].radioRight).toBe(layout[0].right - 17)

    await expect
      .poll(async () => nearColor(page, await style(page, '.payloadpack-radio-cards .radio-input', 'background-color'), '#20201e'))
      .toBe(true)
    await expect(cards.nth(1)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(cards.first().locator('.radio-input__label > :last-child')).toHaveCSS('color', 'rgb(163, 162, 155)')
    await expect(cards.first()).toHaveCSS('border-radius', await style(page, '.field-type.text input', 'border-radius'))
  })

  test('switches slide the thumb and line the description up with the label', async ({ page }) => {
    await openShowcase(page)
    const field = page.locator(`.${SWITCH}`)
    const track = field.locator('.checkbox-input__visuals')

    const box = await size(page, `.${SWITCH} .checkbox-input__visuals`)
    expect(box?.height).toBe(24)
    expect(box?.width).toBeCloseTo(41.2, 1)
    await expect(track).toHaveCSS('grid-template-columns', /^0px 17\.\d+px 17\.\d+px$/)
    await expect(track).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)')
    await expect(track).toHaveCSS('background-color', await computedColor(page, 'color-mix(in srgb, #f3f2ed 20%, transparent)'))
    expect(await style(page, `.${SWITCH} .checkbox-input__visuals`, 'background-color', '::before')).toBe('rgb(243, 242, 237)')

    await field.getByText('Notify subscribers').click()
    await expect(field.getByRole('checkbox')).toBeChecked()
    await expect(track).toHaveCSS('grid-template-columns', /^17\.\d+px 17\.\d+px 0px$/)
    await expect(track).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)')
    await expect(track).toHaveCSS('background-color', 'rgb(243, 242, 237)')
    expect(await style(page, `.${SWITCH} .checkbox-input__visuals`, 'background-color', '::before')).toBe('rgba(0, 0, 0, 0.9)')

    const indent = await field.evaluate((root) => {
      const description = root.querySelector('.field-description') as HTMLElement
      const label = root.querySelector('.field-label') as HTMLElement
      return {
        description: description.getBoundingClientRect().left + parseFloat(getComputedStyle(description).paddingInlineStart),
        label: label.getBoundingClientRect().left
      }
    })
    expect(indent.description).toBeCloseTo(indent.label, 1)
  })

  test('Payload icons keep the Payload tick without its halo', async ({ page }) => {
    await page.context().addCookies([appearance({ options: { enhanced: { icons: 'payload' } } })])
    await openShowcase(page)
    const featured = page.locator('.field-type.checkbox').filter({ hasText: 'Featured' })
    await featured.getByRole('checkbox').check()

    await expect(featured.locator('.checkbox-input__check .checkbox-input__mark')).toHaveCSS('stroke', 'rgba(0, 0, 0, 0.9)')
    await expect(featured.locator('.checkbox-input__check .checkbox-input__mark-halo')).toBeHidden()
  })

  test('large buttons on the dashboard', async ({ page }) => {
    await page.goto('/admin')
    await page.getByRole('button', { name: 'Pinned' }).click()

    expect(await size(page, '.activity-widget__select-documents')).toMatchObject({ height: 36 })
  })

  test('API key buttons sit inside the field like the slug buttons', async ({ page }) => {
    await page.goto('/admin/account')
    await page.locator('.api-key__regenerate-button').click()
    await page.getByRole('button', { exact: true, name: 'Generate' }).click()

    const [input, visibility, regenerate] = await Promise.all(
      ['.auth-fields .field-type.api-key input', '.api-key__visibility-button', '.api-key__regenerate-button'].map((selector) =>
        page.locator(selector).boundingBox()
      )
    )
    const inset = (box: typeof input) =>
      box &&
      input && { height: box.height, right: input.x + input.width - box.x - box.width, top: box.y - input.y, width: box.width }

    expect(input?.height).toBe(36)
    expect(inset(regenerate)).toEqual({ height: 28, right: 4, top: 4, width: 28 })
    expect(inset(visibility)).toEqual({ height: 28, right: 36, top: 4, width: 28 })
  })

  test('lucide icon sizes and mappings', async ({ page }) => {
    await openShowcase(page)

    await expect.poll(() => style(page, '.date-time-picker svg.icon--calendar', 'mask-size')).toBe('min(100%, 14px) auto')
    expect(await style(page, '.dropdown-indicator svg.icon--chevron', 'mask-size')).toBe('min(100%, 12px) auto')
    expect(await style(page, '.multi-value svg.icon--edit', 'mask-size')).toBe('min(100%, 12px) auto')
    expect(await style(page, '.collapsible__indicator svg.icon--chevron', 'mask-size')).toBe('min(100%, 16px) auto')
    expect(await style(page, '.collapsible__actions svg.icon--more', 'mask-size')).toBe('min(100%, 16px) auto')
    expect(await style(page, '.sidebar-tabs__tab svg.icon--align-justified', '--payloadpack-icon')).toContain(
      'data:image/svg+xml'
    )
    expect(await style(page, '.nav__link', 'mask-image', '::after')).toContain('data:image/svg+xml')
  })

  for (const character of ['enhanced', 'studio']) {
    for (const theme of ['light', 'dark']) {
      test(`sidebar tabs match the panel's segments under ${character} in ${theme} mode`, async ({ page }) => {
        await page.context().addCookies([appearance({ character }), cookie('theme', theme)])
        await page.goto('/admin')
        const segments = (await openAppearancePanel(page)).locator('.payloadpack-appearance-panel__segments').first()
        const look = (locator: Locator) =>
          locator.evaluate((element) => {
            const style = getComputedStyle(element)
            const properties = ['padding-top', 'padding-left', 'gap', 'border-top-width', 'border-top-color', 'border-top-left-radius']
            return {
              height: element.getBoundingClientRect().height,
              ...Object.fromEntries(
                [...properties, 'background-color', 'box-shadow', 'color'].map((name) => [name, style.getPropertyValue(name)])
              )
            }
          })

        for (const [tab, segment] of [
          ['.sidebar-tabs__tabs', segments],
          ['.sidebar-tabs__tab--active', segments.locator('[aria-pressed="true"]')],
          ['.sidebar-tabs__tab:not(.sidebar-tabs__tab--active)', segments.locator('[aria-pressed="false"]').first()]
        ] as const) {
          expect(await look(page.locator(tab)), tab).toEqual(await look(segment))
        }
      })
    }
  }

  test('hide sidebar button shows the focus ring', async ({ page }) => {
    await page.context().addCookies([appearance({ options: { enhanced: { nav: 'hidden' } } })])
    await page.goto('/admin')
    await page.getByRole('button', { name: 'Hide sidebar' }).focus()

    await expect(page.locator('.nav__close .sidebar-toggle')).toHaveCSS('outline-style', 'solid')
    await expect(page.locator('.nav__close .sidebar-toggle')).toHaveCSS('outline-width', '2px')
    expect(await page.locator('.nav__close').evaluate((element) => getComputedStyle(element, '::after').content)).toBe('none')
  })

  test('the toasts preview reuses the list heading and marks its nav link', async ({ page }) => {
    await page.goto('/admin/collections/showcase')
    const listTitle = await style(page, '.list-header__title', 'font-size')
    await page.goto('/admin/toasts')

    await expect(page.locator('.list-header__title')).toHaveCSS('font-size', listTitle)
    await expect(page.getByRole('link', { name: 'Toasts' })).toHaveAttribute('aria-current', 'page')
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
    expect(await size(page, '.doc-controls__controls .btn')).toMatchObject({ height: 36 })
    expect(await size(page, '.doc-header .doc-tab')).toMatchObject({ height: 36 })
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
})

test.describe('Radius', () => {
  const button = '.doc-controls__controls .btn'
  const field = '.field-type.text input'

  test("md keeps Payload's own radii", async ({ page }) => {
    const radii = () =>
      Promise.all([
        ...['--radius-small', '--radius-chip', '--radius-medium', '--radius-large'].map((token) => style(page, 'html', token)),
        style(page, button, 'border-radius'),
        style(page, field, 'border-radius')
      ])

    await page.context().addCookies([appearance({ character: 'stock' })])
    await openShowcase(page)
    const payload = await radii()

    await page.context().addCookies([appearance({})])
    await openShowcase(page)

    await expect(page.locator('html')).toHaveAttribute('data-radius', 'md')
    expect(await radii()).toEqual(payload)
  })

  test('none squares buttons, fields and popups', async ({ page }) => {
    await page.context().addCookies([appearance({ options: { enhanced: { radius: 'none' } } })])
    await openShowcase(page)

    await expect(page.locator(button).first()).toHaveCSS('border-radius', '0px')
    await expect(page.locator(field).first()).toHaveCSS('border-radius', '0px')

    await page.getByRole('button', { name: 'More options' }).first().click()
    await expect(page.locator('.popup__content:visible').first()).toHaveCSS('border-radius', '0px')
  })

  test('full makes buttons pills and keeps fields on the large tier', async ({ page }) => {
    await page.context().addCookies([appearance({ options: { enhanced: { radius: 'full' } } })])
    await openShowcase(page)

    await expect(page.locator(button).first()).toHaveCSS('border-radius', '9999px')
    await expect(page.locator(field).first()).toHaveCSS('border-radius', '8px')
  })
})

test.describe('Motion', () => {
  const recordTransitions = async (page: Page, classNames: string[]) => {
    await page.addInitScript((watched) => {
      const runs: string[] = []
      Object.assign(window, { transitionRuns: runs })
      document.addEventListener('transitionrun', (event) => {
        const name = watched.find((className) => (event.target as Element).classList.contains(className))
        if (name) {
          runs.push(`${name} ${event.propertyName}`)
        }
      })
    }, classNames)
    return () => page.evaluate(() => (window as unknown as { transitionRuns: string[] }).transitionRuns.slice().sort())
  }

  const openDrawer = async (page: Page) => {
    const transitions = await recordTransitions(page, ['drawer__blur-bg', 'drawer__content'])
    await openShowcase(page)
    await page.locator('.relationship-add-new__add-button').click()
    await page.locator('.drawer--is-open .drawer__content').waitFor()
    return transitions
  }

  const menus = ['popup__content', 'popup__hidden-content', 'rs__menu']
  const moreOptions = (page: Page) => page.getByRole('button', { name: 'More options' }).first()
  const select = (page: Page) => page.locator('.field-type.select .rs__control').first()

  test('drawers fade and slide in', async ({ page }) => {
    const transitions = await openDrawer(page)

    await expect.poll(transitions).toEqual(['drawer__blur-bg opacity', 'drawer__content opacity', 'drawer__content translate'])
  })

  test('popups scale in from their trigger and out, and select menus scale in', async ({ page }) => {
    const transitions = await recordTransitions(page, menus)
    await openShowcase(page)

    await moreOptions(page).click()
    await expect.poll(transitions).toEqual(['popup__content opacity', 'popup__content scale', 'popup__content translate'])
    const popup = page.locator('.popup__content:popover-open')
    const caret = await popup.evaluate((element) => (element as HTMLElement).style.getPropertyValue('--caret-left'))
    await expect(popup).toHaveCSS('transform-origin', `${caret} 0px`)

    await page.keyboard.press('Escape')
    await expect
      .poll(transitions)
      .toEqual(
        expect.arrayContaining([
          'popup__hidden-content display',
          'popup__hidden-content opacity',
          'popup__hidden-content overlay',
          'popup__hidden-content scale'
        ])
      )

    await select(page).click()
    await expect
      .poll(transitions)
      .toEqual(expect.arrayContaining(['rs__menu opacity', 'rs__menu scale', 'rs__menu translate']))
  })

  test('loading a Studio page below 1440px runs no layout transitions', async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1268 })
    const transitions = await recordTransitions(page, ['template-default', 'template-default__wrap', 'nav'])
    await page.context().addCookies([appearance({ character: 'studio' })])
    await page.goto('/admin/collections/showcase')
    await page.locator('.template-default--nav-open').waitFor()
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))

    expect(await transitions()).toEqual([])
  })

  test('the nav slides open and closed, and the appearance panel slides in', async ({ page }) => {
    const transitions = await recordTransitions(page, ['template-default', 'payloadpack-appearance-panel__sheet'])
    await page.route('**/api/payload-preferences/nav*', (route) =>
      route.request().method() === 'POST' ? route.fulfill({ json: {} }) : route.fallback()
    )
    await page.context().addCookies([appearance({ options: { enhanced: { nav: 'hidden' } } })])
    await page.goto('/admin')

    await page.getByRole('button', { name: 'Hide sidebar' }).click()
    await expect.poll(transitions).toEqual(['template-default grid-template-columns'])

    await page.getByRole('button', { name: 'Appearance' }).click()
    await expect
      .poll(transitions)
      .toEqual(['payloadpack-appearance-panel__sheet translate', 'template-default grid-template-columns'])
  })

  for (const [name, setup] of [
    ['motion is off', (page: Page) => page.context().addCookies([appearance({ options: { enhanced: { motion: 'off' } } })])],
    ['the OS reduces motion', (page: Page) => page.emulateMedia({ reducedMotion: 'reduce' })]
  ] as const) {
    test(`drawers open at once when ${name}`, async ({ page }) => {
      await setup(page)
      const transitions = await openDrawer(page)

      await expect(page.locator('.drawer__blur-bg')).toHaveCSS('transition-duration', '0s')
      await expect(page.locator('.drawer__content')).toHaveCSS('transition-property', 'transform')
      expect(await transitions()).toEqual([])
    })

    test(`popups and select menus open and close at once when ${name}`, async ({ page }) => {
      await setup(page)
      const transitions = await recordTransitions(page, menus)
      await openShowcase(page)

      await moreOptions(page).click()
      await expect(page.locator('.popup__content')).toHaveCSS('transition-duration', '0s')
      await page.keyboard.press('Escape')
      await expect(page.locator('.popup__content')).toHaveCount(0)
      await select(page).click()
      await expect(page.locator('.rs__menu')).toHaveCSS('transition-duration', '0s')
      expect(await transitions()).toEqual([])
    })
  }

  test('popovers open in 150ms and close in 100ms, and the panel slides in over 300ms', async ({ page }) => {
    await openShowcase(page)
    const easeOut = 'cubic-bezier(0.23, 1, 0.32, 1)'

    await moreOptions(page).click()
    const popup = page.locator('.popup__content:popover-open')
    await expect(popup).toHaveCSS('transition-duration', '0.15s, 0.15s, 0.15s')
    await expect(popup).toHaveCSS('transition-timing-function', `${easeOut}, ${easeOut}, ${easeOut}`)
    await page.keyboard.press('Escape')
    await expect(page.locator('.popup__hidden-content').first()).toHaveCSS('transition-duration', '0.1s, 0.1s, 0.1s')

    const sheet = await openAppearancePanel(page)
    await expect(sheet).toHaveCSS('transition-duration', '0.3s')
    await expect(sheet).toHaveCSS('transition-timing-function', /^cubic-bezier\(0\.32, 0\.72, 0, 1\)/)
  })

  test('tooltips fade in and out', async ({ page }) => {
    const transitions = await recordTransitions(page, ['tooltip'])
    await page.goto('/admin')

    await page.getByRole('button', { name: 'Hide sidebar' }).hover()
    await expect.poll(transitions).toEqual(['tooltip opacity'])

    await page.mouse.move(700, 700)
    await expect.poll(transitions).toEqual(['tooltip opacity', 'tooltip opacity', 'tooltip visibility'])
  })
})

test.describe('Warm palette', () => {
  test("keeps Payload's own blue shades and the text color on selected nav links", async ({ page }) => {
    await page.context().addCookies([cookie('theme', 'light')])
    await page.goto('/admin/collections/showcase')

    for (const [token, value] of [
      ['--ramp-blue-200', '#e5f4ff'],
      ['--ramp-blue-500', '#0d99ff'],
      ['--ramp-pale-blue-800', '#394360']
    ]) {
      expect(await style(page, 'html', token)).toBe(value)
    }
    expect(await style(page, '.nav__link--selected', 'color')).toBe(await style(page, 'body', 'color'))
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

  test('radios share the checkbox look and focus ring', async ({ page }) => {
    await openShowcase(page)
    const featured = page.locator('.field-type.checkbox').filter({ hasText: 'Featured' })
    const checkbox = featured.locator('.checkbox-input__visuals')
    const sizes = page.locator('.radio-group').filter({ hasText: 'Size' })
    const radio = (label: string) =>
      sizes
        .locator('.radio-input')
        .filter({ hasText: new RegExp(`^${label}$`) })
        .locator('.radio-input__styled-radio')
    await expect(featured.getByRole('checkbox')).toBeEnabled()

    for (const property of ['background-color', 'border-top-color']) {
      const expected = await checkbox.evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property)
      await expect(radio('xs')).toHaveCSS(property, expected)
    }

    await radio('m').click()
    await expect(radio('m')).toHaveCSS('background-color', 'rgb(243, 242, 237)')
    expect(await radio('m').evaluate((element) => getComputedStyle(element, '::before').backgroundColor)).toBe(
      'rgba(0, 0, 0, 0.9)'
    )
    expect(await radio('m').boundingBox()).toMatchObject({ height: 18, width: 18 })

    await page.keyboard.press('ArrowRight')
    await expect(radio('l')).toHaveCSS('box-shadow', /0px 0px 0px 3px/)
    await page.keyboard.press('Shift+Tab')
    await expect(checkbox).toHaveCSS('box-shadow', /0px 0px 0px 3px/)
  })

  test('near-black dark palette', async ({ page }) => {
    await openShowcase(page)

    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(15, 15, 14)')
    await expect(page.locator('.nav')).toHaveCSS('background-color', 'rgb(10, 10, 9)')
    await expect(page.locator('body')).toHaveCSS('color', 'rgb(243, 242, 237)')
    await expect
      .poll(async () => nearColor(page, await style(page, '.field-type.text input', 'background-color'), '#181817'))
      .toBe(true)
    await expect(page.locator('.field-type.text input').first()).toHaveCSS('border-top-color', 'rgb(42, 42, 39)')
    expect(await style(page, 'html', '--accessibility-focus-color')).toBe('#f3f2ed')

    await page.getByRole('button', { name: 'More options' }).first().click()
    const popup = page.locator('.popup__content:visible').first()
    await expect(popup).toHaveCSS('border-radius', '9px')
    await expect(popup).toHaveCSS('box-shadow', /^rgb\(42, 42, 39\) 0px 0px 0px 1px,/)
  })

  test('enhanced contrast reaches radios and secondary text', async ({ page }) => {
    await page.context().addCookies([cookie('high-contrast-mode', 'true')])
    await openShowcase(page)

    await expect(page.locator('.radio-input:not(.radio-input--is-selected) .radio-input__styled-radio').first()).toHaveCSS(
      'border-top-color',
      await computedColor(page, 'var(--color-border-control)')
    )
    await expect(page.locator('.field-description').first()).toHaveCSS(
      'color',
      await computedColor(page, 'var(--ramp-white-500)')
    )

    const card = page.locator(`.${RADIO_CARDS} .radio-input`).first()
    await card.click()
    await expect(card).toHaveCSS('border-top-color', await computedColor(page, 'var(--color-border-control)'))
  })

  test('focused fields get a soft grey ring', async ({ page }) => {
    await openShowcase(page)
    const title = page.locator('#field-title')
    await title.click()

    await expect(title).toHaveCSS('border-top-color', 'rgb(114, 113, 107)')
    await expect(title).toHaveCSS('box-shadow', /0px 0px 0px 3px/)
  })

  test('toasts match the dropdowns and color only the icon', async ({ page }) => {
    await page.goto('/admin/toasts')
    await page.getByRole('button', { name: 'Error', exact: true }).click()
    const error = page.locator('.payload-toast-item[data-type="error"]')

    await expect(error).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(error).toHaveCSS('border-radius', '9px')
    await expect(error.locator('.payload-toast-close-button')).toHaveCSS('color', 'rgb(26, 26, 26)')
    const lightTint = await computedColor(page, await style(page, '.toast-error', '--payloadpack-toast-icon'))
    await expect(error.locator('.toast-icon .icon')).toHaveCSS('color', lightTint)
    expect(await style(page, '.toast-error .toast-icon svg', '--payloadpack-icon')).toContain('octagon-x')

    await page.getByRole('button', { name: 'With action' }).click()
    await expect(page.locator('.payload-toast-item [data-button]')).toHaveCSS('height', '24px')

    await page.context().addCookies([cookie('theme', 'dark')])
    await page.reload()
    await page.getByRole('button', { name: 'Success', exact: true }).click()
    const success = page.locator('.payload-toast-item[data-type="success"]')

    await expect.poll(async () => nearColor(page, await style(page, '.toast-success', 'background-color'), '#181817')).toBe(true)
    const darkTint = await computedColor(page, await style(page, '.toast-success', '--payloadpack-toast-icon'))
    await expect(success.locator('.toast-icon .icon')).toHaveCSS('color', darkTint)
    expect(darkTint).not.toBe(lightTint)
  })
})

test.describe('Every palette but Payload', () => {
  for (const palette of ['warm', 'studio']) {
    test.describe(palette, () => {
      test.beforeEach(({ page }) => page.context().addCookies([appearance({ palette })]))

      test('one toggle border token reaches checkboxes and radios', async ({ page }) => {
        await openShowcase(page)
        await page.addStyleTag({ content: 'html { --payloadpack-toggle-border: rgb(255, 0, 0); }' })

        await expect(page.locator('.field-type.checkbox .checkbox-input__visuals').first()).toHaveCSS(
          'border-top-color',
          'rgb(255, 0, 0)'
        )
        await expect(page.locator('.radio-input:not(.radio-input--is-selected) .radio-input__styled-radio').first()).toHaveCSS(
          'border-top-color',
          'rgb(255, 0, 0)'
        )
      })

      test('disabled and read-only fields fade to half the field colors', async ({ page }) => {
        await openShowcase(page)
        const half = (token: string) => computedColor(page, `color-mix(in srgb, var(${token}) 50%, transparent)`)
        const reference = page.locator('.field-type.text').filter({ hasText: 'Reference' }).locator('input')
        await expect(page.locator('#field-title')).toBeEnabled()
        await expect(reference).toBeDisabled()

        for (const field of [reference, page.locator('.slug-field-component__input-container')]) {
          await expect(field).toHaveCSS('background-color', await half('--field-color-bg'))
          await expect(field).toHaveCSS('border-top-color', await half('--field-color-border'))
        }
        await expect(page.locator('.slug-field-component__input')).toHaveCSS(
          'color',
          await computedColor(page, 'var(--color-text-secondary)')
        )
      })

      test('every field draws the same border', async ({ page }) => {
        await openShowcase(page)
        const border = await computedColor(page, 'var(--color-border)')

        for (const field of [
          page.locator('#field-title'),
          page.locator('.field-type.select .rs__control').first(),
          page.locator('.date-time-picker input').first()
        ]) {
          await expect(field).toHaveCSS('border-top-color', border)
        }
      })

      test('dark selections step clearly above their surroundings', async ({ page }) => {
        await page.context().addCookies([cookie('theme', 'dark')])
        await page.goto('/admin/collections/showcase')
        const lightness = async (selector: string, pseudo?: string) =>
          (await channels(page, 'oklab', await style(page, selector, 'background-color', pseudo)))[0]

        expect((await lightness('.nav__link--selected', '::before')) - (await lightness('.nav'))).toBeGreaterThan(0.08)
        expect((await lightness('.sidebar-tabs__tab--active')) - (await lightness('.sidebar-tabs__tabs'))).toBeGreaterThan(0.08)

        await openAppearancePanel(page)
        expect(
          (await lightness('.payloadpack-appearance-panel__segments button[aria-pressed="true"]')) -
            (await lightness('.payloadpack-appearance-panel__segments'))
        ).toBeGreaterThan(0.08)
      })
    })
  }
})

test.describe('Payload palette', () => {
  test("Stock keeps Payload's own backgrounds and blue", async ({ page }) => {
    await page.context().addCookies([appearance({ character: 'stock', palette: 'payload' })])
    await openShowcase(page)

    await expect(page.locator('html')).toHaveAttribute('data-palette', 'payload')
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(44, 44, 44)')
    await expect(page.locator('.nav')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    expect(await style(page, 'html', '--ramp-blue-400')).toBe('#80caff')

    await page.context().addCookies([cookie('theme', 'light')])
    await page.reload()
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  })

  test('Stock applies no theme stylesheet', async ({ page }) => {
    await page.context().addCookies([appearance({ character: 'stock', palette: 'payload' })])
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
          .filter((selector) =>
            [...document.querySelectorAll(elementSelector(selector))].some(
              (element) => !element.closest('.payloadpack-appearance-panel__halves')
            )
          ),
        total: rules.length
      }
    })

    expect(total).toBeGreaterThan(0)
    const ownClasses = [
      `.${VERTICAL_TABS}`,
      `.${RADIO_CARDS}`,
      `.${SWITCH}`,
      '.payloadpack-appearance-panel'
    ]
    for (const scope of ownClasses) {
      expect(
        applied.some((selector) => selector.startsWith(scope)),
        scope
      ).toBe(true)
    }
    expect(applied.filter((selector) => !ownClasses.some((scope) => selector.startsWith(scope)))).toEqual([])
  })
})

test.describe('Custom palette', () => {
  const field = (sheet: Locator, half: string, name: string) => sheet.getByRole('group', { name: half }).getByLabel(name)
  const custom = (accent: string, theme = 'light') => [
    appearance({ custom: customPalette(accent), palette: 'custom' }),
    cookie('theme', theme)
  ]

  test('New palette starts from the current palette, applies each color at once and keeps it through a reload', async ({ page }) => {
    await page.context().addCookies([cookie('theme', 'light')])
    await page.goto('/admin/collections/showcase')
    const html = page.locator('html')
    const header = page.locator('.nav__header')
    const sheet = await openAppearancePanel(page)

    await pickAndSave(page, sheet.getByRole('button', { name: 'New palette' }))
    await expect(html).toHaveAttribute('data-palette', 'custom')
    await expect(sheet.getByRole('group', { name: 'Palette' }).getByRole('button', { name: 'Custom' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await expect(field(sheet, 'Light', 'Background')).toHaveValue('#ffffff')
    await expect(field(sheet, 'Dark', 'Background')).toHaveValue('#0a0a09')
    await expect(field(sheet, 'Dark', 'Text')).toHaveValue('#f3f2ed')
    await expect(sheet.getByLabel('Accent')).toHaveValue('#0d99ff')

    await Promise.all([saved(page), field(sheet, 'Light', 'Background').fill('#eae6df')])
    await expect(header).toHaveCSS('background-color', 'rgb(234, 230, 223)')
    await page.reload()
    await expect(header).toHaveCSS('background-color', 'rgb(234, 230, 223)')
  })

  test('stays in the setup while another palette is picked', async ({ page }) => {
    await page.context().addCookies(custom('#c2410c'))
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    const palettes = sheet.getByRole('group', { name: 'Palette' })

    await pickAndSave(page, palettes.getByRole('button', { name: 'Warm' }))
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'warm')
    await expect(sheet.getByRole('button', { name: 'New palette' })).toHaveCount(0)
    await pickAndSave(page, palettes.getByRole('button', { name: 'Custom' }))
    await expect(sheet.getByLabel('Accent')).toHaveValue('#c2410c')
  })

  test('Copy as CSS copies the same block the page renders', async ({ context, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.context().addCookies(custom('#c2410c'))
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)

    await sheet.getByRole('button', { name: 'Copy as CSS' }).click()
    await expect(sheet.getByRole('button', { name: 'Copied' })).toBeVisible()
    const css = await page.evaluate(() => navigator.clipboard.readText())
    expect(css).toContain('--payloadpack-accent: #c2410c;')
    const rendered = await page.evaluate(() =>
      [...document.querySelectorAll('style')].map((element) => element.textContent).find((text) => text?.includes("[data-palette='custom']"))
    )
    expect(rendered).toBe(css)
  })

  test("the palette's accent recolors primary buttons in light and dark", async ({ page }) => {
    await page.context().addCookies(custom('#c2410c'))
    await page.goto('/admin/collections/showcase')
    const primary = page.locator('.btn--style-primary:visible').first()

    await expect(primary).toHaveCSS('background-color', 'rgb(194, 65, 12)')
    await page.context().addCookies([cookie('theme', 'dark')])
    await page.reload()
    await expect(primary).toHaveCSS('background-color', 'rgb(194, 65, 12)')
  })

  test('text on the accent stays readable, dark on a light accent and white on a dark one', async ({ page }) => {
    const primary = page.locator('.btn--style-primary:visible').first()

    await page.context().addCookies(custom('#ffffff'))
    await page.goto('/admin/collections/showcase')
    await expect(primary).toHaveCSS('color', 'oklch(0 0 0)')

    await page.context().addCookies(custom('#c2410c'))
    await page.reload()
    await expect(primary).toHaveCSS('color', 'oklch(1 0 0)')
  })

  test('selected text takes an ink of the accent in light mode, and the selected nav link stays neutral', async ({ page }) => {
    await page.context().addCookies(custom('#c2410c'))
    await page.goto('/admin/collections/showcase')
    const [, , accentHue] = await channels(page, 'oklch', '#c2410c')
    const [inkLightness, , inkHue] = await channels(page, 'oklch', await computedColor(page, 'var(--color-text-selected)'))

    expect(inkLightness).toBeLessThan(0.45)
    expect(Math.abs(inkHue - accentHue)).toBeLessThan(5)
    expect(await style(page, '.nav__link--selected', 'color')).toBe(await style(page, 'body', 'color'))
    expect(await style(page, '.nav__link--selected', 'background-color', '::before')).toBe(
      await computedColor(page, 'var(--color-bg-tertiary)')
    )
  })

  test('a white accent keeps selected items and primary buttons visible in light mode', async ({ page }) => {
    await page.context().addCookies(custom('#ffffff'))
    await page.goto('/admin/collections/showcase')
    const oklab = async (selector: string, property: string, pseudo?: string) =>
      channels(page, 'oklab', await style(page, selector, property, pseudo))

    expect((await channels(page, 'oklab', await computedColor(page, 'var(--color-bg-selected)')))[0]).toBeLessThan(0.95)
    expect((await channels(page, 'oklab', await computedColor(page, 'var(--color-text-selected)')))[0]).toBeLessThan(0.45)
    await expect.poll(async () => (await oklab('.btn--style-primary:visible', 'border-top-color'))[3]).toBeGreaterThan(0)
  })

  test('dark selection mixes the accent into the palette background', async ({ page }) => {
    await page.context().addCookies(custom('#c2410c', 'dark'))
    await page.goto('/admin/collections/showcase')
    const surface = await channels(page, 'oklab', await style(page, 'html', 'background-color'))
    const fill = await channels(page, 'oklab', await computedColor(page, 'var(--color-bg-selected)'))
    const accent = await channels(page, 'oklab', '#c2410c')
    const share = (fill[0] - surface[0]) / (accent[0] - surface[0])

    expect(share).toBeGreaterThan(0.2)
    expect(share).toBeLessThan(0.5)
    for (const channel of [1, 2]) {
      expect(fill[channel]).toBeCloseTo(surface[channel] + share * (accent[channel] - surface[channel]), 2)
    }
  })
})

test.describe('Rail', () => {
  const collapsed = cookie('nav-rail', 'true')
  const navWidth = (page: Page) => page.locator('.nav').evaluate((nav) => nav.getBoundingClientRect().width)
  const afterNextFrame = (page: Page) =>
    page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))

  test.beforeEach(({ page }) =>
    page.route('**/api/payload-preferences/nav*', (route) =>
      route.request().method() === 'POST' ? route.fulfill({ json: {} }) : route.fallback()
    )
  )

  test('collapses the nav into a 64px rail of Lucide icons without labels', async ({ page }) => {
    await page.context().addCookies([appearance({ options: { enhanced: { icons: 'payload' } } })])
    await page.goto('/admin')
    await page.getByRole('button', { name: 'Hide sidebar' }).click()

    await expect(page.getByRole('button', { name: 'Show sidebar' })).toHaveAttribute('aria-expanded', 'false')
    await expect.poll(() => navWidth(page)).toBe(64)
    await expect(page.locator('.nav-group__toggle').first()).toBeHidden()
    for (const link of await page.locator('.nav__link').all()) {
      expect(await link.evaluate((element) => getComputedStyle(element, '::after').maskImage)).toContain('data:image/svg+xml')
      await expect(link.locator('.nav__link-label')).toHaveCSS('opacity', '0')
    }
  })

  test('hides the sidebar tabs, and shows them only to switch back from another tab', async ({ page }) => {
    await page.goto('/admin')
    await page.getByRole('tab').nth(1).click()
    await page.getByRole('button', { name: 'Hide sidebar' }).click()

    await expect(page.getByRole('tablist')).toBeVisible()
    await expect(page.locator('.sidebar-tabs__content > [role="tabpanel"]').nth(1)).toBeHidden()

    await page.getByRole('tab').first().click()
    await expect(page.getByRole('tablist')).toBeHidden()
    await expect(page.locator('#nav-showcase')).toBeVisible()
  })

  test('renders the collapsed rail on the server and keeps it through a reload', async ({ page }) => {
    await page.goto('/admin')
    await page.getByRole('button', { name: 'Hide sidebar' }).click()

    expect(await (await page.request.get('/admin')).text()).toContain('"nav":"icons","rail":""')

    await page.route(nextScripts, (route) => route.abort())
    await page.reload()
    expect(await navWidth(page)).toBe(64)

    await page.unroute(nextScripts)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Show sidebar' })).toBeVisible()
    expect(await navWidth(page)).toBe(64)
  })

  test('reaches the toggle and the rail icons by keyboard, with a tooltip on focus', async ({ page }) => {
    await page.context().addCookies([collapsed])
    await page.goto('/admin')
    await page.getByRole('button', { name: 'Show sidebar' }).focus()
    await expect(page.locator('.payloadpack-rail-toggle .sidebar-toggle')).toHaveCSS('outline-style', 'solid')
    await expect(page.locator('.payloadpack-rail-toggle .sidebar-toggle')).toHaveCSS('outline-width', '2px')

    const showcase = page.locator('#nav-showcase')
    await page.locator('#nav-users').focus()
    await page.keyboard.press('Tab')
    await expect(showcase).toBeFocused()
    expect(await showcase.evaluate((link) => getComputedStyle(link, '::before').outlineStyle)).toBe('solid')

    const label = showcase.locator('.nav__link-label')
    await expect(label).toHaveCSS('opacity', '1')
    const [link, tooltip] = await Promise.all([showcase.boundingBox(), label.boundingBox()])
    expect(tooltip!.x).toBeGreaterThanOrEqual(link!.x + link!.width)
    expect(tooltip!.y + tooltip!.height / 2).toBeCloseTo(link!.y + link!.height / 2, 0)

    await page.addStyleTag({ content: '.nav__link-label { pointer-events: auto; }' })
    await settled(label)
    expect(
      await label.evaluate((element) => {
        const box = element.getBoundingClientRect()
        return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
      })
    ).toBe(true)
  })

  test('shows rail tooltips above the sticky document header', async ({ page }) => {
    await page.context().addCookies([collapsed])
    await page.goto('/admin/collections/showcase/1')
    await page.mouse.wheel(0, 600)
    const showcase = page.locator('#nav-showcase')
    const label = showcase.locator('.nav__link-label')
    await page.locator('.doc-controls').evaluate((controls, link) => {
      controls.style.marginTop = `${link!.getBoundingClientRect().top - controls.getBoundingClientRect().top}px`
    }, await showcase.elementHandle())
    await page.addStyleTag({ content: '.nav__link-label { pointer-events: auto; }' })
    await showcase.hover()

    await expect(label).toHaveCSS('opacity', '1')
    await settled(label)
    expect(
      await label.evaluate((element) => {
        const box = element.getBoundingClientRect()
        return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
      })
    ).toBe(true)
  })

  test('shows a collapsed group as a chevron that opens it', async ({ page }) => {
    await page.goto('/admin')
    await page.getByRole('button', { name: 'Previews' }).click()
    await page.getByRole('button', { name: 'Hide sidebar' }).click()

    const group = page.getByRole('button', { name: 'Previews' })
    await group.hover()
    await expect(group.locator('.nav-group__indicator')).toHaveCSS('opacity', '1')
    await expect(group.locator('.nav-group__label')).toHaveCSS('opacity', '1')

    await group.click()
    await expect(page.getByRole('link', { name: 'Toasts' })).toBeVisible()
    await expect(group).toBeHidden()
  })

  test("nav: 'hidden' keeps Payload's own close button", async ({ page }) => {
    await page.context().addCookies([appearance({ options: { enhanced: { nav: 'hidden' } } }), collapsed])
    await page.goto('/admin')

    await expect(page.locator('html')).not.toHaveAttribute('data-rail')
    await expect(page.locator('.payloadpack-rail-toggle')).toHaveCount(0)
    await page.locator('.nav__close').click()
    await expect(page.locator('.nav')).toHaveAttribute('inert', '')
    await expect.poll(async () => (await page.locator('.template-default__wrap').boundingBox())?.x).toBe(0)
  })

  for (const { nav, name, closes } of [
    { closes: false, name: "keeps Payload's nav open", nav: 'icons' },
    { closes: true, name: 'lets Payload close the nav', nav: 'hidden' }
  ] as const) {
    test(`nav: '${nav}' ${name} when the window shrinks past 1440px`, async ({ page }) => {
      await page.context().addCookies([appearance({ options: { enhanced: { nav } } })])
      await page.setViewportSize({ height: 900, width: 1500 })
      await page.goto('/admin')
      await expect(page.locator('.nav')).toHaveClass(/nav--nav-hydrated/)
      await expect(page.locator('.nav')).not.toHaveAttribute('inert')

      await page.setViewportSize({ height: 900, width: 1300 })
      await expect.poll(() => style(page, 'html', '--vw')).toBe('13px')
      await afterNextFrame(page)
      expect(await page.locator('.nav').evaluate((nav) => (nav as HTMLElement).inert)).toBe(closes)
    })
  }

  test("at 768px wide the nav is Payload's drawer", async ({ page }) => {
    await page.context().addCookies([collapsed])
    await page.setViewportSize({ height: 900, width: 768 })
    await page.goto('/admin')

    await expect(page.locator('.payloadpack-rail-toggle')).toBeHidden()
    await page.locator('.app-header__sidebar-toggle').click()
    expect(await navWidth(page)).toBe(768)
    await expect(page.locator('.nav__close')).toBeVisible()
    await expect(page.locator('#nav-showcase .nav__link-label')).toHaveCSS('opacity', '1')
  })
})

test.describe('Studio character', () => {
  const studio = (options: object = {}) => appearance({ character: 'studio', options: { studio: options } })

  const openList = async (page: Page) => {
    await page.goto('/admin/collections/showcase')
    await page.locator('table').waitFor()
  }

  test('renders its attributes and puts each view in a card on the field', async ({ page }) => {
    await page.context().addCookies([studio()])
    await openList(page)
    const html = page.locator('html')
    const card = page.locator('.template-default__wrap')
    const defaults = {
      radius: 'lg',
      font: 'geist',
      frame: 'boxed',
      width: 'centered',
      density: 'comfortable',
      icons: 'lucide',
      motion: 'on',
      nav: 'icons'
    }

    for (const [name, value] of Object.entries(defaults)) {
      await expect(html).toHaveAttribute(`data-${name}`, value)
    }
    await expect(card).toHaveCSS('border-top-width', '1px')
    await expect(card).toHaveCSS('border-top-color', await computedColor(page, 'var(--color-border)'))
    await expect(card).toHaveCSS('border-radius', '26px')
    await expect(card).toHaveCSS('overflow', 'clip')
    await expect(card).toHaveCSS('margin', '12px 12px 12px 0px')
    await expect(page.locator('.nav')).toHaveCSS('border-right-width', '0px')
  })

  test('collapses into a rail beside the card, keeping the toggle in its row at the top', async ({ page }) => {
    await page.context().addCookies([studio()])
    await openList(page)
    const toggle = page.locator('.payloadpack-rail-toggle')
    const open = (await toggle.boundingBox())!
    await page.getByRole('button', { name: 'Hide sidebar' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-rail', '')
    await settled(page.locator('.template-default'))

    const [nav, card, rail] = await Promise.all(
      ['.nav', '.template-default__wrap', '.payloadpack-rail-toggle'].map(
        async (selector) => (await page.locator(selector).boundingBox())!
      )
    )
    expect(nav.width).toBe(64)
    expect(card.x).toBe(64)
    expect(open.x + open.width / 2).toBe(24)
    expect(rail.x + rail.width / 2).toBe(32)
    expect(rail.y).toBe(open.y)
    expect((await page.locator('#nav-showcase').boundingBox())!.y).toBeGreaterThan(rail.y + rail.height)
    await expect(page.locator('.nav .user-menu')).toBeHidden()
  })

  test("nav: 'hidden' hides the nav and lets the card fill the field", async ({ page }) => {
    await page.context().addCookies([studio({ nav: 'hidden' })])
    await openList(page)
    const card = page.locator('.template-default__wrap')

    const toggleNav = (toggle: string) =>
      Promise.all([
        page.waitForResponse(
          (response) => response.url().endsWith('/api/payload-preferences/nav') && response.request().method() === 'POST'
        ),
        page.locator(toggle).click()
      ])

    await toggleNav('.nav__close')
    await expect(card).toHaveCSS('margin-left', '12px')
    await expect(page.locator('.nav')).toHaveCSS('visibility', 'hidden')
    await toggleNav('.app-header__sidebar-toggle')
    await expect(card).toHaveCSS('margin-left', '0px')
  })

  test('flat drops the card', async ({ page }) => {
    await page.context().addCookies([studio({ frame: 'flat' })])
    await openList(page)
    const card = page.locator('.template-default__wrap')

    await expect(card).toHaveCSS('border-top-width', '0px')
    await expect(card).toHaveCSS('border-radius', '0px')
    await expect(card).toHaveCSS('margin', '0px')
    await expect(page.locator('.nav')).toHaveCSS('border-right-width', '1px')
  })

  test('centered caps the content width and full does not', async ({ page }) => {
    await page.context().addCookies([studio()])
    await openList(page)

    const insets = await page.locator('.collection-list').evaluate((list) => {
      const inner = list.getBoundingClientRect()
      const outer = list.parentElement!.getBoundingClientRect()
      return { left: inner.left - outer.left, right: outer.right - inner.right, width: inner.width }
    })
    expect(insets.width).toBe(880)
    expect(insets.left).toBeGreaterThan(0)
    expect(insets.left).toBeCloseTo(insets.right, 0)

    await page.context().addCookies([studio({ width: 'full' })])
    await page.reload()
    await page.locator('table').waitFor()
    const wrapWidth = await page.locator('.template-default__wrap').evaluate((element) => element.clientWidth)
    expect(await size(page, '.collection-list')).toMatchObject({ width: wrapWidth })
  })

  test('moves the user menu to the bottom of the nav and opens its menu upward', async ({ page }) => {
    await page.context().addCookies([studio()])
    await openList(page)
    const nav = await page.locator('.nav').boundingBox()
    const trigger = page.locator('.user-menu__trigger')
    const menu = await trigger.boundingBox()

    expect((nav?.y ?? 0) + (nav?.height ?? 0) - ((menu?.y ?? 0) + (menu?.height ?? 0))).toBeLessThanOrEqual(12)
    expect(menu?.y).toBeGreaterThan((await page.locator('.nav-group').last().boundingBox())?.y ?? Infinity)

    await trigger.click()
    const popup = page.locator('.user-menu .popup__content')
    await expect(popup).toBeVisible()
    expect(((await popup.boundingBox())?.y ?? 0) + ((await popup.boundingBox())?.height ?? 0)).toBeLessThanOrEqual(menu?.y ?? 0)
  })

  test('loads Geist for the body font and switches to Payload or the system font', async ({ page }) => {
    await page.context().addCookies([studio()])
    await openList(page)
    const body = page.locator('body')

    await expect(body).toHaveCSS('font-family', /^Geist, "Geist Fallback"/)
    expect(
      await page.evaluate(async () => {
        await document.fonts.ready
        return [...document.fonts].some((font) => font.family === 'Geist' && font.status === 'loaded')
      })
    ).toBe(true)

    await page.context().addCookies([studio({ font: 'payload' })])
    await page.reload()
    await expect(body).toHaveCSS('font-family', /^Inter, "Inter Fallback"/)

    await page.context().addCookies([studio({ font: 'system' })])
    await page.reload()
    await expect(body).toHaveCSS('font-family', /^system-ui,/)
  })

  test('leaves Stock and Enhanced in their own layout and font', async ({ page }) => {
    for (const character of ['enhanced', 'stock']) {
      await page.context().addCookies([appearance({ character })])
      await openList(page)

      await expect(page.locator('html')).not.toHaveAttribute('data-frame')
      await expect(page.locator('.template-default__wrap')).toHaveCSS('margin', '0px')
      await expect(page.locator('.template-default__wrap')).toHaveCSS('border-top-width', '0px')
      await expect(page.locator('.nav__header')).toHaveCSS('display', 'flex')
      expect((await page.locator('.user-menu').boundingBox())?.y).toBeLessThan(60)
      await expect(page.locator('body')).toHaveCSS('font-family', /^Inter, "Inter Fallback"/)
    }
  })
})

test.describe('Studio palette', () => {
  test('tints the field from the accent in light and dark, with cards on top', async ({ page }) => {
    await page.context().addCookies([appearance({ character: 'studio', palette: 'studio' }), cookie('theme', 'light')])
    await page.goto('/admin/collections/showcase')
    const field = page.locator('.template-default')
    const card = page.locator('.template-default__wrap')

    await expect(field).toHaveCSS('background-color', await computedColor(page, 'color-mix(in oklab, #c2410c 3%, #f1f0ec)'))
    await expect(card).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(page.locator('.nav')).toHaveCSS('background-color', await computedColor(page, 'color-mix(in oklab, #c2410c 3%, #f1f0ec)'))

    await page.context().addCookies([appearance({ character: 'studio', palette: 'studio' }), cookie('theme', 'dark')])
    await page.reload()
    await expect(field).toHaveCSS('background-color', await computedColor(page, 'color-mix(in oklab, #c2410c 5%, #131312)'))
    await expect(card).toHaveCSS('background-color', await computedColor(page, 'color-mix(in oklab, #c2410c 2%, #1c1c1b)'))
    expect(await computedColor(page, 'var(--color-bg-selected)')).toBe(
      await computedColor(page, 'color-mix(in oklab, #c2410c 40%, color-mix(in oklab, #c2410c 2%, #1c1c1b))')
    )
  })

  test('tints the nav under Enhanced too', async ({ page }) => {
    await page.context().addCookies([appearance({ palette: 'studio' }), cookie('theme', 'light')])
    await page.goto('/admin/collections/showcase')

    await expect(page.locator('.nav__header')).toHaveCSS(
      'background-color',
      await computedColor(page, 'color-mix(in oklab, #c2410c 3%, #f1f0ec)')
    )
    await expect(page.locator('.template-default__wrap')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  })
})
