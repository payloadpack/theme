import { RADIO_CARDS, SWITCH, VERTICAL_TABS } from '@payloadpack/theme'
import { expect, type Page, test } from '@playwright/test'

import { appearance, authFile, baseURL, clearSetup, cookie, findShowcase, openAppearancePanel, pickAndSave } from './demo'

test.beforeEach(async ({ page }) => {
  await clearSetup(page)
})

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

const style = (page: Page, selector: string, property: string, pseudoElement?: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element, [name, pseudo]) => getComputedStyle(element, pseudo).getPropertyValue(name).trim(), [
      property,
      pseudoElement
    ] as const)

const backgrounds = (page: Page) =>
  page.evaluate(() => [document.documentElement, document.body].map((element) => getComputedStyle(element).backgroundColor))

test.describe('Logged out', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('defaults to Enhanced and Warm with comfortable density and Lucide icons', async ({ page }) => {
    await page.context().addCookies([cookie('theme', 'dark')])
    await page.goto('/admin/login')

    await expect(page.locator('html')).toHaveAttribute('data-character', 'enhanced')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'comfortable')
    await expect(page.locator('html')).toHaveAttribute('data-icons', 'lucide')
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
      `<script>Object.assign(document.documentElement.dataset,{"character":"stock","palette":"warm"});document.documentElement.style.setProperty('--payloadpack-accent',"#0d99ff")</script>`
    )

    await page.goto('/admin')
    await expect(page.locator('html')).toHaveAttribute('data-character', 'stock')
    await expect(page.locator('html')).not.toHaveAttribute('data-density')
    await expect(page.locator('html')).not.toHaveAttribute('data-icons')
  })

  test('paints the dashboard in the theme before hydration', async ({ page }) => {
    const nextScripts = '**/_next/static/**/*.js'
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
    await page.context().addCookies([appearance({ accent: { payload: '#be185d' }, character: 'stock', palette: 'payload' })])
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

    await expect(cards.first()).toHaveCSS('background-color', 'rgb(32, 32, 30)')
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
    await expect(track).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.2)')
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

  test('sidebar tabs sit 3px inside their track', async ({ page }) => {
    await page.goto('/admin')
    const inset = await page.locator('.sidebar-tabs__tabs').evaluate((track) => {
      const outer = track.getBoundingClientRect()
      const inner = track.querySelector('.sidebar-tabs__tab--active')!.getBoundingClientRect()
      return [inner.top - outer.top, outer.bottom - inner.bottom, inner.left - outer.left]
    })

    expect(inset).toEqual([3, 3, 3])
    await expect(page.locator('.sidebar-tabs__tabs')).toHaveCSS('height', '38px')
    await expect(page.locator('.sidebar-tabs__tabs')).toHaveCSS('border-radius', '8px')
    await expect(page.locator('.sidebar-tabs__tab--active')).toHaveCSS('border-radius', '5px')
  })

  test('hide sidebar button shows the focus ring', async ({ page }) => {
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

test.describe('Warm palette', () => {
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

  test('near-black dark palette', async ({ page }) => {
    await openShowcase(page)

    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(15, 15, 14)')
    await expect(page.locator('.nav')).toHaveCSS('background-color', 'rgb(10, 10, 9)')
    await expect(page.locator('body')).toHaveCSS('color', 'rgb(243, 242, 237)')
    await expect(page.locator('.field-type.text input').first()).toHaveCSS('background-color', 'rgb(24, 24, 23)')
    await expect(page.locator('.field-type.text input').first()).toHaveCSS('border-top-color', 'rgb(42, 42, 39)')
    expect(await style(page, 'html', '--accessibility-focus-color')).toBe('#f3f2ed')

    await page.getByRole('button', { name: 'More options' }).first().click()
    const popup = page.locator('.popup__content:visible').first()
    await expect(popup).toHaveCSS('border-radius', '9px')
    await expect(popup).toHaveCSS('box-shadow', /^rgb\(42, 42, 39\) 0px 0px 0px 1px,/)
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
    await expect(error.locator('.payload-toast-close-button')).toHaveCSS('color', 'rgba(0, 0, 0, 0.9)')
    const lightTint = await computedColor(page, await style(page, '.toast-error', '--payloadpack-toast-icon'))
    await expect(error.locator('.toast-icon .icon')).toHaveCSS('color', lightTint)
    expect(await style(page, '.toast-error .toast-icon svg', '--payloadpack-icon')).toContain('octagon-x')

    await page.getByRole('button', { name: 'With action' }).click()
    await expect(page.locator('.payload-toast-item [data-button]')).toHaveCSS('height', '24px')

    await page.context().addCookies([cookie('theme', 'dark')])
    await page.reload()
    await page.getByRole('button', { name: 'Success', exact: true }).click()
    const success = page.locator('.payload-toast-item[data-type="success"]')

    await expect(success).toHaveCSS('background-color', 'rgb(24, 24, 23)')
    const darkTint = await computedColor(page, await style(page, '.toast-success', '--payloadpack-toast-icon'))
    await expect(success.locator('.toast-icon .icon')).toHaveCSS('color', darkTint)
    expect(darkTint).not.toBe(lightTint)
  })
})

test.describe('Payload palette', () => {
  test("Stock keeps Payload's own backgrounds and blue", async ({ page }) => {
    await page.context().addCookies([appearance({ character: 'stock', palette: 'payload' })])
    await openShowcase(page)

    await expect(page.locator('html')).toHaveAttribute('data-palette', 'payload')
    await expect(page.locator('html')).not.toHaveAttribute('data-accent')
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
          .filter((selector) => document.querySelectorAll(elementSelector(selector)).length > 0),
        total: rules.length
      }
    })

    expect(total).toBeGreaterThan(0)
    const ownClasses = [`.${VERTICAL_TABS}`, `.${RADIO_CARDS}`, `.${SWITCH}`, '.payloadpack-appearance-panel']
    for (const scope of ownClasses) {
      expect(
        applied.some((selector) => selector.startsWith(scope)),
        scope
      ).toBe(true)
    }
    expect(applied.filter((selector) => !ownClasses.some((scope) => selector.startsWith(scope)))).toEqual([])
  })
})

test.describe('Accent', () => {
  test('picking an accent recolors primary buttons in light and dark', async ({ page }) => {
    await page.goto('/admin/collections/showcase')
    const primary = page.locator('.btn--style-primary:visible').first()
    await expect(primary).toHaveCSS('background-color', 'rgb(13, 153, 255)')

    const sheet = await openAppearancePanel(page)
    await pickAndSave(page, sheet.getByRole('button', { name: '#c2410c' }))
    await page.keyboard.press('Escape')

    await expect(page.locator('html')).toHaveAttribute('data-accent', '#c2410c')
    await expect(primary).toHaveCSS('background-color', 'rgb(194, 65, 12)')

    await page.context().addCookies([cookie('theme', 'dark')])
    await page.reload()
    await expect(primary).toHaveCSS('background-color', 'rgb(194, 65, 12)')
  })

  test('text on the accent stays readable, dark on a light accent and white on a dark one', async ({ page }) => {
    const primary = page.locator('.btn--style-primary:visible').first()

    await page.context().addCookies([appearance({ accent: { warm: '#ffffff' } })])
    await page.goto('/admin/collections/showcase')
    await expect(primary).toHaveCSS('color', 'oklch(0 0 0)')

    await page.context().addCookies([appearance({ accent: { warm: '#c2410c' } })])
    await page.reload()
    await expect(primary).toHaveCSS('color', 'oklch(1 0 0)')
  })

  test('each palette keeps its own accent, and the hex field applies only valid colors', async ({ page }) => {
    await page.goto('/admin')
    const html = page.locator('html')
    const sheet = await openAppearancePanel(page)
    const palettes = sheet.getByRole('group', { name: 'Palette' })
    const hex = sheet.getByRole('textbox', { name: 'Accent hex color' })

    await palettes.getByRole('button', { name: 'Payload' }).click()
    await hex.fill('#BE185D')
    await expect(html).toHaveAttribute('data-accent', '#be185d')
    await hex.fill('#be18')
    await expect(html).toHaveAttribute('data-accent', '#be185d')

    await palettes.getByRole('button', { name: 'Warm' }).click()
    await expect(html).toHaveAttribute('data-palette', 'warm')
    await expect(html).not.toHaveAttribute('data-accent')
    await expect(hex).toHaveValue('#0d99ff')

    await pickAndSave(page, palettes.getByRole('button', { name: 'Payload' }))
    await expect(html).toHaveAttribute('data-palette', 'payload')
    await expect(html).toHaveAttribute('data-accent', '#be185d')
  })
})
