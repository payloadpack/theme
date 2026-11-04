import { RADIO_CARDS, SWITCH, VERTICAL_TABS } from '@payloadpack/theme'
import { expect, type Locator, type Page, test } from '@playwright/test'

import { demoUser } from '../src/seed'
import {
  appearance,
  authFile,
  baseURL,
  choice,
  clearSetup,
  cookie,
  customPalette,
  findShowcase,
  hydrated,
  label,
  openAppearancePanel,
  openFineTune,
  pickAndSave,
  reloadWith,
  saved,
  saveSetup,
  settled,
  share
} from './demo'

test.beforeEach(async ({ page }) => {
  await clearSetup(page)
})

const nextScripts = '**/_next/static/**/*.js'

const openShowcase = async (page: Page) => {
  await page.context().addCookies([cookie('theme', 'dark')])
  await page.goto((await findShowcase(page)).path)
  await page.locator('.collapsible__toggle-wrap').first().waitFor()
  await hydrated(page)
}

const size = async (page: Page, selector: string) => {
  const box = await page.locator(selector).first().boundingBox()
  return box && { height: box.height, width: box.width }
}

const computedColor = (page: Page, color: string, theme?: string) =>
  page.evaluate(
    ([value, mode]) => {
      const probe = document.createElement('div')
      if (mode) {
        probe.dataset.theme = mode
      }
      probe.style.color = value
      document.body.append(probe)
      const computed = getComputedStyle(probe).color
      probe.remove()
      return computed
    },
    [color, theme] as const
  )

const hex = (rgb: string) =>
  `#${(rgb.match(/\d+/g) ?? [])
    .slice(0, 3)
    .map((channel) => Number(channel).toString(16).padStart(2, '0'))
    .join('')}`

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

const middle = async (locator: Locator) => {
  const box = (await locator.boundingBox())!
  return box.y + box.height / 2
}

const backgrounds = (page: Page) =>
  page.evaluate(() => [document.documentElement, document.body].map((element) => getComputedStyle(element).backgroundColor))

test.describe('Logged out', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("defaults to Enhanced and Neutral with Enhanced's starting values", async ({ page }) => {
    await page.context().addCookies([cookie('theme', 'dark')])
    await page.goto('/admin/login')
    const defaults = {
      character: 'enhanced',
      density: 'comfortable',
      font: 'inter',
      frame: 'flat',
      icons: 'lucide',
      motion: 'auto',
      nav: 'rail',
      palette: 'neutral',
      radius: 'md'
    }

    for (const [name, value] of Object.entries(defaults)) {
      await expect(page.locator('html')).toHaveAttribute(`data-${name}`, value)
    }
    await expect(page.locator('html')).toHaveCSS('background-color', await computedColor(page, 'var(--payloadpack-surface)'))
  })

  test('ignores unknown cookie values', async ({ page }) => {
    await page.context().addCookies([appearance({ character: 'constructor', options: { enhanced: { density: '</script>' } } })])
    await page.goto('/admin/login')

    await expect(page.locator('html')).toHaveAttribute('data-character', 'enhanced')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'comfortable')
  })

  test('signing in brings back the saved appearance and its panel without a reload', async ({ page, playwright }) => {
    const signedIn = await playwright.request.newContext({ baseURL, storageState: authFile })
    await saveSetup(signedIn, { character: 'studio' })
    await page.goto('/admin/login')
    await page.fill('#field-email', demoUser.email)
    await page.fill('#field-password', demoUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin')

    await expect(page.locator('html')).toHaveAttribute('data-character', 'studio')
    const sheet = await openAppearancePanel(page)
    await expect(choice(sheet, 'Style', 'Studio')).toBeChecked()
    await saveSetup(signedIn, {})
    await signedIn.dispose()
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

  test('renders the appearance cookie on the server, with no option attributes under Payload', async ({ page }) => {
    await page.context().addCookies([appearance({ character: 'payload', options: { enhanced: { density: 'compact' } } })])

    const html = await (await page.request.get('/admin')).text()
    expect(html).toContain(
      `<script>Object.assign(document.documentElement.dataset,{"character":"payload","palette":"neutral"})</script>`
    )

    await page.goto('/admin')
    await expect(page.locator('html')).toHaveAttribute('data-character', 'payload')
    for (const option of ['radius', 'font', 'frame', 'density', 'icons', 'motion', 'nav']) {
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
  test('opens from the header as a full-height sheet on the right, or from the bottom on a phone, and closes', async ({
    page
  }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)

    expect(await sheet.boundingBox()).toEqual({ height: 900, width: 360, x: 1080, y: 0 })

    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()

    await page.setViewportSize({ height: 800, width: 375 })
    await openAppearancePanel(page)

    expect(await sheet.boundingBox()).toEqual({ height: 560, width: 375, x: 0, y: 240 })

    await sheet.getByRole('button', { name: 'Close' }).click()
    await expect(sheet).toBeHidden()
  })

  test('picks Payload with nothing to fine-tune and no option attributes, and keeps it after a reload', async ({ page }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    const payload = choice(sheet, 'Style', 'Payload')

    await pickAndSave(page, label(payload))

    await expect(payload).toBeChecked()
    await expect(sheet.getByText("Payload's own look. Nothing to fine-tune.")).toBeVisible()
    await expect(sheet.locator('summary')).toHaveCount(0)
    await expect(page.locator('html')).toHaveAttribute('data-character', 'payload')
    await expect(page.locator('html')).not.toHaveAttribute('data-density')

    await page.reload()

    await expect(page.locator('html')).toHaveAttribute('data-character', 'payload')
    await expect(page.locator('html')).not.toHaveAttribute('data-density')
  })

  test('carries density, motion and nav to every style, and keeps the rest of the look per style', async ({ page }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    const html = page.locator('html')

    await openFineTune(sheet)
    await label(choice(sheet, 'Density', 'Compact')).click()
    await label(choice(sheet, 'Corners', 'Small')).click()
    await expect(html).toHaveAttribute('data-density', 'compact')
    await expect(html).toHaveAttribute('data-radius', 'sm')

    await label(choice(sheet, 'Style', 'Studio')).click()
    await expect(html).toHaveAttribute('data-density', 'compact')
    await expect(html).toHaveAttribute('data-radius', 'lg')
    await expect(choice(sheet, 'Density', 'Compact')).toBeChecked()

    await label(choice(sheet, 'Style', 'Enhanced')).click()
    await expect(html).toHaveAttribute('data-radius', 'sm')

    await label(choice(sheet, 'Style', 'Payload')).click()
    await label(choice(sheet, 'Style', 'Enhanced')).click()
    await expect(html).toHaveAttribute('data-density', 'compact')
  })

  test('Fine-tune opens on demand and counts changes, Reset puts them back, and Undo restores only those', async ({ page }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    const html = page.locator('html')
    const reset = sheet.getByRole('button', { name: 'Reset Enhanced' })
    const status = sheet.getByRole('status')

    await expect(sheet.getByRole('radiogroup', { name: 'Density' })).toBeHidden()
    await openFineTune(sheet)
    await expect(sheet.getByRole('radiogroup', { name: 'Density' })).toBeVisible()
    await expect(reset).toBeDisabled()

    await label(choice(sheet, 'Density', 'Compact')).click()
    await pickAndSave(page, label(choice(sheet, 'Corners', 'Small')))
    await expect(sheet.locator('summary')).toContainText('2 changed')

    await pickAndSave(page, reset)
    await expect(html).toHaveAttribute('data-density', 'comfortable')
    await expect(html).toHaveAttribute('data-radius', 'md')
    await expect(reset).toBeDisabled()
    await expect(status).toContainText('Enhanced is back to its defaults.')
    await pickAndSave(page, label(choice(sheet, 'Palette', 'Warm')))

    await pickAndSave(page, status.getByRole('button', { name: 'Undo' }))
    await expect(html).toHaveAttribute('data-density', 'compact')
    await expect(html).toHaveAttribute('data-radius', 'sm')
    await expect(html).toHaveAttribute('data-palette', 'warm')
    await expect(status).toBeEmpty()

    await page.reload()
    await expect(html).toHaveAttribute('data-radius', 'sm')
  })

  test('saves the setup in Payload preferences, so it follows the editor to a new browser', async ({ browser, page }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)

    await openFineTune(sheet)
    await pickAndSave(page, label(choice(sheet, 'Density', 'Compact')))

    const elsewhere = await browser.newContext({ baseURL, storageState: authFile })
    expect((await elsewhere.cookies()).map(({ name }) => name)).not.toContain('theme-demo-appearance')
    const other = await elsewhere.newPage()
    await other.goto('/admin')

    await expect(other.locator('html')).toHaveAttribute('data-density', 'compact')
    await elsewhere.close()
  })

  test('copies the setup in one browser and pastes it in another', async ({ browser, context, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.context().addCookies([appearance({ character: 'payload', custom: customPalette('#be185d'), palette: 'custom' })])
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)

    await (await share(sheet, 'Copy setup')).click()
    await expect(sheet.getByRole('status')).toHaveText('Setup copied. Paste it in another browser to get the same look.')
    const setup = await page.evaluate(() => navigator.clipboard.readText())
    const attributes = await page.locator('html').evaluate((html) => ({ ...html.dataset }))

    const elsewhere = await browser.newContext({ baseURL, storageState: authFile })
    await elsewhere.grantPermissions(['clipboard-read', 'clipboard-write'])
    const other = await elsewhere.newPage()
    await other.goto('/admin')
    const otherSheet = await openAppearancePanel(other)
    const status = otherSheet.getByRole('status')
    const writeClipboard = (text: string) => other.evaluate((value) => navigator.clipboard.writeText(value), text)

    await writeClipboard('not a setup')
    await (await share(otherSheet, 'Paste setup')).click()
    await expect(status).toHaveText('There is no appearance setup on the clipboard.')
    await expect(status).toHaveAttribute('data-tone', 'error')
    await expect(other.locator('html')).toHaveAttribute('data-character', 'enhanced')

    await writeClipboard(setup)
    await pickAndSave(other, await share(otherSheet, 'Paste setup'))
    await expect(status).toHaveText('Setup applied.')
    expect(await other.locator('html').evaluate((html) => ({ ...html.dataset }))).toEqual(attributes)
    await elsewhere.close()
  })

  test('keeps Share setup centred beside a status line that wraps', async ({ page }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    const status = sheet.getByRole('status')

    await status.evaluate((element) => {
      element.textContent = 'A status message long enough to wrap onto three lines beside the Share setup button.'
    })

    expect((await status.boundingBox())!.height).toBeGreaterThan(48)
    expect(await middle(sheet.getByRole('button', { name: 'Share setup' }))).toBeCloseTo(await middle(status), 0)
  })

  test('says the browser blocked the clipboard when it refuses or is missing', async ({ page }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    const status = sheet.getByRole('status')

    await (await share(sheet, 'Paste setup')).click()
    await expect(status).toHaveText('The browser blocked the clipboard.')
    await expect(status).toHaveAttribute('data-tone', 'error')
    await expect(status).toBeEmpty()

    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined }))
    await (await share(sheet, 'Copy setup')).click()
    await expect(status).toHaveText('The browser blocked the clipboard.')
    await expect(status).toBeEmpty()
    await (await share(sheet, 'Paste setup')).click()
    await expect(status).toHaveText('The browser blocked the clipboard.')
  })

  test("shows each icon set's logo", async ({ page }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    const logo = (name: string) => label(choice(sheet, 'Icons', name)).locator('.payloadpack-appearance-panel__logo svg')

    await openFineTune(sheet)

    await expect(logo('Payload')).toHaveClass(/graphic-icon/)
    await expect(logo('Lucide')).toBeVisible()
    await expect(logo('Lucide')).not.toHaveClass(/graphic-icon/)
  })

  test('moves through a group with the arrow keys, one Tab stop per group', async ({ page }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    const dark = choice(sheet, 'Theme', 'Dark')

    await choice(sheet, 'Theme', 'Light').focus()
    await page.keyboard.press('ArrowRight')
    await expect(dark).toBeChecked()
    await expect(dark).toBeFocused()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await page.keyboard.press('Tab')
    await expect(choice(sheet, 'Palette', 'Neutral')).toBeFocused()
  })

  test('keeps its own size and typeface whatever the density and typeface', async ({ page }) => {
    const look = async () =>
      (await openAppearancePanel(page))
        .getByRole('radiogroup', { name: 'Theme' })
        .evaluate((group) => ({ font: getComputedStyle(group).fontFamily, height: group.getBoundingClientRect().height }))

    await page.goto('/admin')
    const enhanced = await look()

    await page
      .context()
      .addCookies([appearance({ character: 'studio', options: { studio: { density: 'compact', font: 'system' } } })])
    await page.reload()

    await expect(page.locator('body')).toHaveCSS('font-family', /^system-ui,/)
    expect(await look()).toEqual(enhanced)
  })

  test('sits left of the nav toggle under Enhanced, right of it under Studio, and in the header when the nav is closed or Payload', async ({
    page
  }) => {
    const button = page.getByRole('button', { name: 'Appearance' })
    const beside = async () => {
      const [trigger, toggle] = [(await button.boundingBox())!, (await page.locator('.payloadpack-rail-toggle').boundingBox())!]
      expect(trigger.y).toBe(toggle.y)
      return trigger.x < toggle.x ? 'left' : 'right'
    }

    await page.goto('/admin')
    expect(await beside()).toBe('left')

    await reloadWith(page, [appearance({ character: 'studio' })])
    expect(await beside()).toBe('right')

    await page.route('**/api/payload-preferences/nav*', (route) =>
      route.request().method() === 'POST' ? route.fulfill({ json: {} }) : route.fallback()
    )
    await reloadWith(page, [appearance({ options: { enhanced: { nav: 'hidden' } } })])
    await page.getByRole('button', { name: 'Hide sidebar' }).click()
    await expect(page.locator('.app-header').getByRole('button', { name: 'Appearance' })).toBeVisible()

    await reloadWith(page, [appearance({ character: 'payload' })])
    await expect(page.locator('.app-header').getByRole('button', { name: 'Appearance' })).toBeVisible()
  })

  for (const theme of ['light', 'dark']) {
    test(`the nav toggle, the Appearance button, nav links and group headings share one hover in ${theme} mode`, async ({
      page
    }) => {
      await page.context().addCookies([cookie('theme', theme)])
      await page.goto('/admin')
      const hovered = async (locator: Locator, pseudo?: string) => {
        await locator.hover()
        return locator.evaluate((element, pseudoElement) => {
          const style = getComputedStyle(element, pseudoElement)
          return { background: style.backgroundColor, radius: style.borderTopLeftRadius }
        }, pseudo)
      }
      const toggle = page.locator('.payloadpack-rail-toggle .sidebar-toggle')
      const button = page.locator('.payloadpack-appearance-panel--nav .payloadpack-appearance-panel__trigger')
      const iconColor = (locator: Locator) => locator.evaluate((element) => getComputedStyle(element).color)

      expect(await iconColor(button)).toBe(await iconColor(toggle))
      const hover = await hovered(toggle)
      expect(await hovered(button)).toEqual(hover)
      expect(await hovered(page.locator('a.nav__link:not(.nav__link--selected)').first(), '::before')).toEqual(hover)
      expect(await hovered(page.locator('.nav-group__toggle').first(), '::before')).toEqual(hover)
    })
  }

  for (const character of ['enhanced', 'studio']) {
    test(`${character} draws the nav toggle's and the Appearance button's focus rings alike`, async ({ page }) => {
      await page.context().addCookies([appearance({ character })])
      await page.goto('/admin')
      const ring = async (focus: string, ringed: string) => {
        await page.locator(focus).focus()
        return page.locator(ringed).evaluate((element) => {
          const style = getComputedStyle(element)
          const { height, width } = element.getBoundingClientRect()
          return { height, offset: style.outlineOffset, outline: style.outlineWidth, radius: style.borderTopLeftRadius, width }
        })
      }
      const trigger = '.payloadpack-appearance-panel--nav .payloadpack-appearance-panel__trigger'

      expect(await ring(trigger, trigger)).toEqual(
        await ring('.payloadpack-rail-toggle', '.payloadpack-rail-toggle .sidebar-toggle')
      )
      expect((await ring(trigger, trigger)).outline).toBe('2px')
    })
  }

  test("keeps Payload's header height under the Payload style", async ({ page }) => {
    await page.context().addCookies([appearance({ character: 'payload' })])
    await page.goto('/admin')
    const height = async () => (await page.locator('.app-header').boundingBox())?.height
    const withButton = await height()

    await page.addStyleTag({ content: '.app-header .payloadpack-appearance-panel { display: none; }' })

    expect(await height()).toBe(withButton)
  })

  test('opens from the nav on a custom view, which renders no header actions', async ({ page }) => {
    await page.goto('/admin/toasts')
    await page.locator('.payloadpack-appearance-panel--nav .payloadpack-appearance-panel__trigger').click()

    await expect(page.getByRole('dialog', { name: 'Appearance' })).toBeVisible()
  })

  test('draws the bundled Lucide palette icon on the header button', async ({ page }) => {
    await page.goto('/admin')

    expect(await style(page, '.payloadpack-appearance-panel__palette-icon', 'mask-image')).toContain('data:image/svg+xml')
  })

  test('segments sit 3px inside a bordered track', async ({ page }) => {
    await page.goto('/admin')
    const track = (await openAppearancePanel(page)).getByRole('radiogroup', { name: 'Theme' })
    const inset = await track.evaluate((element) => {
      const outer = element.getBoundingClientRect()
      const inner = element.querySelector('label:has(:checked)')!.getBoundingClientRect()
      return [inner.top - outer.top, outer.bottom - inner.bottom, outer.right - inner.right]
    })

    expect(inset).toEqual([4, 4, 4])
    await expect(track).toHaveCSS('border-top-width', '1px')
    await expect(track).toHaveCSS('border-radius', '8px')
  })

  test("switches Payload's theme", async ({ page }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    const themeCookie = async () => (await page.context().cookies()).find(({ name }) => name === 'theme-demo-theme')?.value

    await expect(choice(sheet, 'Theme', 'Automatic')).toBeChecked()

    await label(choice(sheet, 'Theme', 'Dark')).click()

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(choice(sheet, 'Theme', 'Dark')).toBeChecked()
    expect(await themeCookie()).toBe('dark')

    await label(choice(sheet, 'Theme', 'Automatic')).click()

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

    await expect(cards.first()).toHaveCSS('background-color', await computedColor(page, 'var(--color-bg-secondary)'))
    await expect(cards.nth(1)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(cards.first().locator('.radio-input__label > :last-child')).toHaveCSS(
      'color',
      await computedColor(page, 'var(--color-text-secondary)')
    )
    await expect(cards.first()).toHaveCSS('border-radius', await style(page, '.field-type.text input', 'border-radius'))
  })

  test('switches slide a light thumb and line the description up with the label', async ({ page }) => {
    await openShowcase(page)
    const field = page.locator(`.${SWITCH}`)
    const track = field.locator('.checkbox-input__visuals')

    const box = await size(page, `.${SWITCH} .checkbox-input__visuals`)
    expect(box?.height).toBe(24)
    expect(box?.width).toBeCloseTo(41.2, 1)
    await expect(track).toHaveCSS('grid-template-columns', /^0px 17\.\d+px 17\.\d+px$/)
    await expect(track).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)')
    await expect(track).toHaveCSS('background-color', await computedColor(page, 'var(--payloadpack-toggle-border)'))
    expect(await style(page, `.${SWITCH} .checkbox-input__visuals`, 'background-color', '::before')).toBe(
      await computedColor(page, 'var(--ramp-white-1000)')
    )

    await field.getByText('Notify subscribers').click()
    await expect(field.getByRole('checkbox')).toBeChecked()
    await expect(track).toHaveCSS('grid-template-columns', /^17\.\d+px 17\.\d+px 0px$/)
    await expect(track).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)')
    await expect(track).toHaveCSS('background-color', await computedColor(page, 'var(--payloadpack-toggle-checked-bg)'))
    expect(await style(page, `.${SWITCH} .checkbox-input__visuals`, 'background-color', '::before')).toBe(
      await computedColor(page, 'var(--payloadpack-toggle-mark)')
    )

    const indent = await field.evaluate((root) => {
      const description = root.querySelector('.field-description') as HTMLElement
      const label = root.querySelector('.field-label') as HTMLElement
      return {
        description: description.getBoundingClientRect().left + parseFloat(getComputedStyle(description).paddingInlineStart),
        label: label.getBoundingClientRect().left
      }
    })
    expect(indent.description).toBeCloseTo(indent.label, 1)

    await field.getByText('Notify subscribers').click()
    await page.evaluate(() => (document.documentElement.dataset.theme = 'light'))
    expect(await style(page, `.${SWITCH} .checkbox-input__visuals`, 'background-color', '::before')).toBe(
      await computedColor(page, 'var(--ramp-white-1000)')
    )
  })

  test('Payload icons keep the Payload tick without its halo', async ({ page }) => {
    await page.context().addCookies([appearance({ options: { enhanced: { icons: 'payload' } } })])
    await openShowcase(page)
    const featured = page.locator('.field-type.checkbox').filter({ hasText: 'Featured' })
    await featured.getByRole('checkbox').check()

    await expect(featured.locator('.checkbox-input__check .checkbox-input__mark')).toHaveCSS('stroke', 'oklch(0 0 0)')
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
        const read = (locator: Locator, properties: string[]) =>
          locator.evaluate(
            (element, names) => Object.fromEntries(names.map((name) => [name, getComputedStyle(element).getPropertyValue(name)])),
            properties
          )
        const look = async (locator: Locator) => ({
          height: (await locator.boundingBox())?.height,
          ...(await read(locator, [
            'border-top-width',
            'border-top-color',
            'border-top-left-radius',
            'background-color',
            'box-shadow',
            'color'
          ]))
        })
        const inset = ['padding-top', 'padding-left', 'gap']

        expect(await read(page.locator('.sidebar-tabs__tabs'), inset)).toEqual(await read(segments, inset))
        for (const [tab, segment] of [
          ['.sidebar-tabs__tabs', segments],
          ['.sidebar-tabs__tab--active', segments.locator('label:has(:checked)')],
          ['.sidebar-tabs__tab:not(.sidebar-tabs__tab--active)', segments.locator('label:not(:has(:checked))').first()]
        ] as const) {
          expect(await look(page.locator(tab).first()), tab).toEqual(await look(segment))
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

  for (const character of ['enhanced', 'studio']) {
    test(`${character} widens the nav and lines it up on one gutter, with the group chevron inside its ring`, async ({
      page
    }) => {
      await page.context().addCookies([appearance({ character })])
      await page.goto('/admin')
      const group = page.locator('.nav-group__toggle').first()
      await group.hover()
      const nav = await page.evaluate(() => {
        const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect()
        const link = document.querySelector('.nav__link')!
        const ring = getComputedStyle(link, '::before')
        const [row, tabs, chevron, toggle] = [
          link.getBoundingClientRect(),
          box('.sidebar-tabs__tabs'),
          box('.nav-group__indicator'),
          box('.nav-group__toggle')
        ]
        return {
          chevron: toggle.right - chevron.right,
          highlight: [row.left + parseFloat(ring.left), row.right - parseFloat(ring.right)],
          tabs: [tabs.left, tabs.right],
          width: box('.nav').width
        }
      })

      expect(nav.width).toBe(288)
      expect(nav.highlight).toEqual(nav.tabs)
      expect(nav.chevron).toBe(20)
      expect(await style(page, '.nav-group__toggle', 'font-size')).toBe('12px')
      expect(await style(page, '.nav-group:not(:first-child)', 'margin-left', '::before')).toBe('12px')
      expect(await style(page, '.nav-group__toggle', 'inset', '::before')).toBe(
        await style(page, '.nav__link', 'inset', '::before')
      )
    })
  }

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

    await page.context().addCookies([appearance({ character: 'payload' })])
    await openShowcase(page)
    const payload = await radii()

    await page.context().addCookies([appearance({})])
    await openShowcase(page)

    await expect(page.locator('html')).toHaveAttribute('data-radius', 'md')
    expect(await radii()).toEqual(payload)
  })

  test('none squares buttons, fields, the switch, the sidebar tabs and popups', async ({ page }) => {
    await page.context().addCookies([appearance({ options: { enhanced: { radius: 'none' } } })])
    await openShowcase(page)
    const track = page.locator(`.${SWITCH} .checkbox-input__visuals`)

    await expect(page.locator(button).first()).toHaveCSS('border-radius', '0px')
    await expect(page.locator(field).first()).toHaveCSS('border-radius', '0px')
    await expect(track).toHaveCSS('border-radius', '0px')
    expect(await style(page, `.${SWITCH} .checkbox-input__visuals`, 'border-radius', '::before')).toBe('0px')
    await expect(page.locator('.sidebar-tabs__tabs')).toHaveCSS('border-radius', '0px')

    await page.getByRole('button', { name: 'More options' }).first().click()
    await expect(page.locator('.popup__content:visible').first()).toHaveCSS('border-radius', '0px')
  })

  test('full makes buttons, fields, tabs and menus pills without doming collapsibles', async ({ page }) => {
    await page.context().addCookies([appearance({ options: { enhanced: { radius: 'full' } } })])
    await openShowcase(page)

    await expect(page.locator(button).first()).toHaveCSS('border-radius', '18px')
    await expect(page.locator(field).first()).toHaveCSS('border-radius', '18px')
    await expect(page.locator('.sidebar-tabs__tab').first()).toHaveCSS('border-radius', '18px')
    await expect(page.locator('.collapsible__toggle-wrap').first()).toHaveCSS('border-top-left-radius', '18px')

    await page.getByRole('button', { name: 'More options' }).first().click()
    await expect(page.locator('.popup__content:visible').first()).toHaveCSS('border-radius', '22px')
  })

  test("studio's large menus, slash menu and toasts follow their items, not the card tier", async ({ page }) => {
    await page.context().addCookies([appearance({ character: 'studio' })])
    await openShowcase(page)

    await page.getByRole('button', { name: 'More options' }).first().click()
    await expect(page.locator('.popup__content:visible').first()).toHaveCSS('border-radius', '12px')
    await page.keyboard.press('Escape')

    await page.locator('[data-lexical-editor="true"]').first().click()
    await page.keyboard.type('/')
    await expect(page.locator('.slash-menu-popup')).toHaveCSS('border-radius', '12px')
    await page.keyboard.press('Escape')

    await page.locator('.toolbar-popup__dropdown').first().click()
    await expect(page.locator('.toolbar-popup__dropdown-items').first()).toHaveCSS('border-radius', '12px')

    await page.goto('/admin/toasts')
    await page.getByRole('button', { name: 'Error', exact: true }).click()
    await expect(page.locator('.payload-toast-item[data-type="error"]')).toHaveCSS('border-radius', '12px')
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

  test('drawers open at once, because Payload unmounts them on close', async ({ page }) => {
    const transitions = await openDrawer(page)

    await expect(page.locator('.drawer__blur-bg')).toHaveCSS('transition-duration', '0s')
    await expect(page.locator('.drawer__content')).toHaveCSS('transition-property', 'transform')
    expect(await transitions()).toEqual([])
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
    await expect.poll(transitions).toEqual(expect.arrayContaining(['rs__menu opacity', 'rs__menu scale', 'rs__menu translate']))
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

  test('every field eases its focus ring with motion on, and none does with it off', async ({ page }) => {
    const fields = [
      '.field-type.text .form-input',
      '.field-type.checkbox:not(.payloadpack-switch) .checkbox-input__visuals',
      '.radio-input__styled-radio',
      `.${SWITCH} .checkbox-input__visuals`
    ]
    const ringDurations = () =>
      Promise.all(
        fields.map((selector) =>
          page
            .locator(selector)
            .first()
            .evaluate((element) => {
              const style = getComputedStyle(element)
              const [properties, durations] = [style.transitionProperty.split(', '), style.transitionDuration.split(', ')]
              const index = properties.indexOf('box-shadow')
              return index === -1 ? 'none' : durations[index % durations.length]
            })
        )
      )

    await openShowcase(page)
    expect(await ringDurations()).toEqual(fields.map(() => '0.1s'))

    await reloadWith(page, [appearance({ options: { enhanced: { motion: 'off' } } })])
    expect(await ringDurations()).toEqual(fields.map(() => 'none'))
    await expect(page.locator('.radio-input__styled-radio').first()).toHaveCSS('transition-duration', '0s')
  })

  test('nav groups turn their chevron and open and close at once', async ({ page }) => {
    await page.route('**/api/payload-preferences/nav*', (route) =>
      route.request().method() === 'POST' ? route.fulfill({ json: {} }) : route.fallback()
    )
    const transitions = await recordTransitions(page, ['nav-group__content', 'icon--chevron'])
    await page.goto('/admin')
    const group = page.getByRole('button', { name: 'Previews' })

    await group.click()
    await expect.poll(transitions).toEqual(['icon--chevron transform'])

    await group.click()
    await expect.poll(transitions).toEqual(['icon--chevron transform', 'icon--chevron transform'])
  })
})

test.describe('Neutral palette', () => {
  test('takes its text color as primary and accent, so no blue is left in light or dark', async ({ page }) => {
    for (const theme of ['light', 'dark']) {
      await page.context().addCookies([cookie('theme', theme)])
      await page.goto('/admin/collections/showcase')

      for (const token of [
        '--color-bg-selected',
        '--color-text-selected',
        '--color-icon-brand',
        '--color-text-brand',
        '--ramp-blue-500'
      ]) {
        const [, chroma] = await channels(page, 'oklch', await computedColor(page, `var(${token})`))
        expect(chroma, `${theme} ${token}`).toBeLessThan(0.02)
      }
      expect(await style(page, '.nav__link--selected', 'color')).toBe(await style(page, 'body', 'color'))
    }
  })

  test('checked checkboxes fill with the text color and use the Lucide tick', async ({ page }) => {
    await openShowcase(page)
    const featured = page.locator('.field-type.checkbox').filter({ hasText: 'Featured' })
    await featured.getByRole('checkbox').check()
    await page.mouse.move(0, 0)

    await expect(featured.locator('.checkbox-input__visuals')).toHaveCSS(
      'background-color',
      await computedColor(page, 'var(--payloadpack-text)')
    )
    await expect(featured.locator('.checkbox-input__check')).toHaveCSS(
      'background-color',
      await computedColor(page, 'var(--payloadpack-toggle-mark)')
    )
    expect(await style(page, '.field-type.checkbox .checkbox-input__check', 'mask-image')).toContain('data:image/svg+xml')
    expect(await size(page, '.field-type.checkbox .checkbox-input__input')).toEqual({ height: 18, width: 18 })
    expect(await size(page, '.field-type.checkbox .checkbox-input__check')).toEqual({ height: 18, width: 18 })
    await expect(featured.locator('.field-description')).toHaveCSS('padding-left', '26px')

    expect(await middle(featured.locator('.checkbox-input__input'))).toBe(await middle(featured.locator('.field-label')))
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

    await expect(visuals).toHaveCSS('background-color', await computedColor(page, 'var(--payloadpack-text)'))
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
    await expect(radio('m')).toHaveCSS('background-color', await computedColor(page, 'var(--payloadpack-text)'))
    expect(await radio('m').evaluate((element) => getComputedStyle(element, '::before').backgroundColor)).toBe(
      await computedColor(page, 'var(--payloadpack-toggle-mark)')
    )
    expect(await radio('m').boundingBox()).toMatchObject({ height: 18, width: 18 })

    await page.keyboard.press('ArrowRight')
    await expect(radio('l')).toHaveCSS('box-shadow', /0px 0px 0px 3px/)
    await page.keyboard.press('Shift+Tab')
    await expect(checkbox).toHaveCSS('box-shadow', /0px 0px 0px 3px/)
  })

  test('near-black dark palette, with the nav a step below the page', async ({ page }) => {
    await openShowcase(page)
    const [surface, background] = [
      await computedColor(page, 'var(--payloadpack-surface)'),
      await computedColor(page, 'var(--payloadpack-background)')
    ]
    const [[surfaceLightness], [backgroundLightness]] = [
      await channels(page, 'oklab', surface),
      await channels(page, 'oklab', background)
    ]

    expect(surfaceLightness).toBeLessThan(0.2)
    expect(backgroundLightness).toBeLessThan(surfaceLightness)
    await expect(page.locator('html')).toHaveCSS('background-color', surface)
    await expect(page.locator('.nav')).toHaveCSS('background-color', background)
    await expect(page.locator('body')).toHaveCSS('color', await computedColor(page, 'var(--payloadpack-text)'))
    await expect
      .poll(async () =>
        nearColor(
          page,
          await style(page, '.field-type.text input', 'background-color'),
          await computedColor(page, 'var(--color-bg-elevated)')
        )
      )
      .toBe(true)
    await expect(page.locator('.field-type.text input').first()).toHaveCSS(
      'border-top-color',
      await computedColor(page, 'var(--color-border)')
    )
    expect(
      await nearColor(
        page,
        await computedColor(page, 'var(--accessibility-focus-color)'),
        await computedColor(page, 'var(--payloadpack-text)')
      )
    ).toBe(true)

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

  test('focused fields get a soft grey ring, lighter in light mode', async ({ page }) => {
    await openShowcase(page)
    const title = page.locator('#field-title')
    const ring = async () => {
      await title.click()
      await settled(title)
      await expect(title).toHaveCSS('box-shadow', /0px 0px 0px 3px/)
      return channels(page, 'oklch', await style(page, '#field-title', 'border-top-color'))
    }

    const [dark, darkChroma] = await ring()
    expect(dark).toBeCloseTo(0.55, 2)
    expect(darkChroma).toBeLessThan(0.02)

    await page.context().addCookies([cookie('theme', 'light')])
    await page.reload()
    await page.locator('.collapsible__toggle-wrap').first().waitFor()
    const [light, lightChroma] = await ring()
    expect(light).toBeGreaterThan(dark)
    expect(lightChroma).toBeLessThan(0.02)
  })

  test('toasts match the dropdowns and color only the icon', async ({ page }) => {
    await page.goto('/admin/toasts')
    await page.getByRole('button', { name: 'Error', exact: true }).click()
    const error = page.locator('.payload-toast-item[data-type="error"]')

    await expect(error).toHaveCSS('background-color', await computedColor(page, 'var(--payloadpack-surface)'))
    await expect(error).toHaveCSS('border-radius', '9px')
    await expect(error.locator('.payload-toast-close-button')).toHaveCSS(
      'color',
      await computedColor(page, 'var(--payloadpack-text)')
    )
    const lightTint = await computedColor(page, await style(page, '.toast-error', '--payloadpack-toast-icon'))
    await expect(error.locator('.toast-icon .icon')).toHaveCSS('color', lightTint)
    expect(await style(page, '.toast-error .toast-icon svg', '--payloadpack-icon')).toContain('octagon-x')

    await page.getByRole('button', { name: 'With action' }).click()
    await expect(page.locator('.payload-toast-item [data-button]')).toHaveCSS('height', '24px')

    await page.context().addCookies([cookie('theme', 'dark')])
    await page.reload()
    await page.getByRole('button', { name: 'Success', exact: true }).click()
    const success = page.locator('.payload-toast-item[data-type="success"]')

    await expect(page.locator('.toast-success')).toHaveCSS(
      'background-color',
      await computedColor(page, 'var(--color-bg-elevated)')
    )
    const darkTint = await computedColor(page, await style(page, '.toast-success', '--payloadpack-toast-icon'))
    await expect(success.locator('.toast-icon .icon')).toHaveCSS('color', darkTint)
    expect(darkTint).not.toBe(lightTint)
  })
})

test.describe('Every palette but Payload', () => {
  for (const palette of ['neutral', 'studio']) {
    test.describe(palette, () => {
      test.beforeEach(({ page }) => page.context().addCookies([appearance({ palette })]))

      for (const theme of ['light', 'dark']) {
        test(`menu items light up neutral and visible against the menu, icon and background at once, in ${theme} mode`, async ({
          page
        }) => {
          await page.context().addCookies([cookie('theme', theme)])
          await page.goto((await findShowcase(page)).path)
          await page.getByRole('button', { name: 'More options' }).first().click()
          const item = page.locator('#action-duplicate')
          await item.hover()

          const colors = await item.evaluate((element) => {
            const [style, icon, menu] = [
              getComputedStyle(element),
              getComputedStyle(element, '::before'),
              getComputedStyle(element.closest('.popup__content')!)
            ]
            const probe = document.createElement('div')
            probe.style.color = 'var(--color-text)'
            element.append(probe)
            const text = getComputedStyle(probe).color
            probe.remove()
            return { color: style.color, hovered: style.backgroundColor, icon: icon.opacity, menu: menu.backgroundColor, text }
          })
          const [[hoveredLightness, hoveredChroma], [menuLightness]] = [
            await channels(page, 'oklch', colors.hovered),
            await channels(page, 'oklch', colors.menu)
          ]

          expect(Math.abs(hoveredLightness - menuLightness)).toBeGreaterThan(0.04)
          expect(hoveredChroma).toBeLessThan(0.02)
          expect(colors.color).toBe(colors.text)
          expect(colors.icon).toBe('1')
        })
      }

      test('the selected nav link is a white pill lifted by a shadow, and the other links are muted', async ({ page }) => {
        await page.context().addCookies([cookie('theme', 'light')])
        await page.goto('/admin/collections/showcase')

        expect(await style(page, '.nav__link--selected', 'background-color', '::before')).toBe(
          await computedColor(page, 'var(--color-bg-elevated)')
        )
        expect(await style(page, '.nav__link--selected', 'box-shadow', '::before')).not.toBe('none')
        expect(await style(page, '.nav__link:not(.nav__link--selected)', 'color')).toBe(
          await computedColor(page, 'var(--color-text-secondary)')
        )
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
          (await lightness('.payloadpack-appearance-panel__segments label:has(:checked)')) -
            (await lightness('.payloadpack-appearance-panel__segments'))
        ).toBeGreaterThan(0.08)
      })
    })
  }
})

test.describe('Payload palette', () => {
  test("Payload keeps Payload's own backgrounds and blue", async ({ page }) => {
    await page.context().addCookies([appearance({ character: 'payload', palette: 'payload' })])
    await openShowcase(page)

    await expect(page.locator('html')).toHaveAttribute('data-palette', 'payload')
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(44, 44, 44)')
    await expect(page.locator('.nav')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    expect(await style(page, 'html', '--ramp-blue-400')).toBe('#80caff')

    await page.context().addCookies([cookie('theme', 'light')])
    await page.reload()
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  })

  test('Payload applies no theme stylesheet', async ({ page }) => {
    await page.context().addCookies([appearance({ character: 'payload', palette: 'payload' })])
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

test.describe('Custom palette', () => {
  const field = (sheet: Locator, half: string, name: string) => sheet.getByLabel(`${name}, ${half}`, { exact: true })
  const accent = (sheet: Locator) => sheet.getByLabel('Accent, Both modes', { exact: true })
  const custom = (accent: string, { primary, theme = 'light' }: { primary?: string; theme?: string } = {}) => [
    appearance({ custom: customPalette(accent, primary), palette: 'custom' }),
    cookie('theme', theme)
  ]

  test('Custom colors start from the current palette, apply each color at once and keep it through a reload', async ({
    page
  }) => {
    await page.context().addCookies([cookie('theme', 'light')])
    await page.goto('/admin/collections/showcase')
    const html = page.locator('html')
    const header = page.locator('.nav__header')
    const sheet = await openAppearancePanel(page)
    const neutral = async (token: string, theme?: string) => hex(await computedColor(page, `var(${token})`, theme))
    const expected = {
      accent: await neutral('--payloadpack-accent'),
      darkBackground: await neutral('--payloadpack-background', 'dark'),
      darkPrimary: await neutral('--payloadpack-primary', 'dark'),
      darkText: await neutral('--payloadpack-text', 'dark'),
      lightBackground: await neutral('--payloadpack-background'),
      lightPrimary: await neutral('--payloadpack-primary')
    }

    await pickAndSave(page, sheet.getByRole('button', { name: 'Custom colors' }))
    await expect(html).toHaveAttribute('data-palette', 'custom')
    await expect(choice(sheet, 'Palette', 'Custom')).toBeChecked()
    await expect(field(sheet, 'Light', 'Background')).toHaveValue(expected.lightBackground)
    await expect(field(sheet, 'Light', 'Primary')).toHaveValue(expected.lightPrimary)
    await expect(field(sheet, 'Dark', 'Primary')).toHaveValue(expected.darkPrimary)
    await expect(field(sheet, 'Dark', 'Background')).toHaveValue(expected.darkBackground)
    await expect(field(sheet, 'Dark', 'Text')).toHaveValue(expected.darkText)
    await expect(accent(sheet)).toHaveValue(expected.accent)

    await Promise.all([saved(page), field(sheet, 'Light', 'Background').fill('#eae6df')])
    await expect(header).toHaveCSS('background-color', 'rgb(234, 230, 223)')
    await page.reload()
    await expect(header).toHaveCSS('background-color', 'rgb(234, 230, 223)')
  })

  test('saves a dragged color once, when the picker commits', async ({ page }) => {
    await page.context().addCookies(custom('#c2410c'))
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    const saves: string[] = []
    page.on('request', (request) => {
      if (request.url().endsWith('/api/payload-preferences/payloadpack-appearance') && request.method() === 'POST') {
        saves.push(request.url())
      }
    })

    await field(sheet, 'Light', 'Background').evaluate((input: HTMLInputElement) => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      for (const value of ['#101010', '#202020', '#303030']) {
        setValue.call(input, value)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    await expect(page.locator('.nav__header')).toHaveCSS('background-color', 'rgb(48, 48, 48)')
    await expect.poll(() => saves.length).toBe(1)
    await page.waitForLoadState('networkidle')
    expect(saves).toHaveLength(1)
  })

  test("pasting a setup keeps your own palette and your other styles' options", async ({ context, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.context().addCookies([
      appearance({
        character: 'studio',
        custom: customPalette('#be185d'),
        options: { studio: { font: 'inter' } },
        palette: 'neutral'
      })
    ])
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)

    await page.evaluate(() => navigator.clipboard.writeText(JSON.stringify({ character: 'enhanced', palette: 'warm' })))
    await pickAndSave(page, await share(sheet, 'Paste setup'))
    await expect(page.locator('html')).toHaveAttribute('data-character', 'enhanced')
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'warm')
    await expect(choice(sheet, 'Palette', 'Custom')).toBeAttached()

    await pickAndSave(page, label(choice(sheet, 'Style', 'Studio')))
    await expect(page.locator('html')).toHaveAttribute('data-font', 'inter')
  })

  test('stays in the setup while another palette is picked', async ({ page }) => {
    await page.context().addCookies(custom('#c2410c'))
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)

    await pickAndSave(page, label(choice(sheet, 'Palette', 'Neutral')))
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'neutral')
    await expect(sheet.getByRole('button', { name: 'Custom colors' })).toHaveCount(0)
    await pickAndSave(page, label(choice(sheet, 'Palette', 'Custom')))
    await expect(accent(sheet)).toHaveValue('#c2410c')
  })

  test('Copy as CSS copies the same block the page renders', async ({ context, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.context().addCookies(custom('#c2410c'))
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)

    await sheet.getByRole('button', { name: 'Copy as CSS' }).click()
    await expect(sheet.getByRole('status')).toHaveText('CSS copied')
    const css = await page.evaluate(() => navigator.clipboard.readText())
    expect(css).toContain('--payloadpack-accent: #c2410c;')
    const rendered = await page.evaluate(() =>
      [...document.querySelectorAll('style')]
        .map((element) => element.textContent)
        .find((text) => text?.includes("[data-palette='custom']"))
    )
    expect(rendered).toBe(css)
  })

  test("the palette's primary fills primary buttons and checked toggles in light and dark, apart from the accent", async ({
    page
  }) => {
    await page.context().addCookies(custom('#c2410c', { primary: '#2563eb' }))
    await page.goto('/admin/collections/showcase')
    const primary = page.locator('.btn--style-primary:visible').first()

    for (const theme of ['light', 'dark']) {
      await page.context().addCookies([cookie('theme', theme)])
      await page.reload()
      await expect(primary).toHaveCSS('background-color', 'rgb(37, 99, 235)')
      expect(await computedColor(page, 'var(--payloadpack-toggle-checked-bg)')).toBe('rgb(37, 99, 235)')
      expect(await computedColor(page, 'var(--ramp-blue-500)')).toBe('rgb(194, 65, 12)')
    }
  })

  test('text on the primary stays readable, dark on a light primary and white on a dark one', async ({ page }) => {
    const primary = page.locator('.btn--style-primary:visible').first()

    await page.context().addCookies(custom('#c2410c', { primary: '#ffffff' }))
    await page.goto('/admin/collections/showcase')
    await expect(primary).toHaveCSS('color', 'oklch(0 0 0)')

    await reloadWith(page, custom('#ffffff', { primary: '#c2410c' }))
    await expect(primary).toHaveCSS('color', 'oklch(1 0 0)')
  })

  test('selection stays neutral whatever the accent, a grey fill under the text color, in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark']) {
      await page.context().addCookies(custom('#c2410c', { theme }))
      await page.goto('/admin/collections/showcase')
      const text = await style(page, 'body', 'color')

      expect(await computedColor(page, 'var(--color-bg-selected)'), theme).toBe(
        await computedColor(page, 'var(--color-bg-tertiary)')
      )
      expect(await computedColor(page, 'var(--color-text-selected)'), theme).toBe(text)
      expect(await computedColor(page, 'var(--color-icon-selected)'), theme).toBe(await computedColor(page, 'var(--color-icon)'))
    }
  })

  test('solid selections take the primary, and an open submenu looks like a hovered menu item', async ({ page }) => {
    await page.context().addCookies(custom('#c2410c', { primary: '#2563eb' }))
    await page.goto('/admin/collections/showcase')
    const background = (locator: Locator) => locator.evaluate((element) => getComputedStyle(element).backgroundColor)

    expect(await computedColor(page, 'var(--color-bg-selected-strong)')).toBe('rgb(37, 99, 235)')

    await page.locator('.user-menu__trigger').click()
    const submenu = page.locator('.popup-button-list__submenu-trigger')
    await submenu.hover()
    await page.locator('.popup-button-list__button', { hasText: 'Dark' }).hover()
    await settled(submenu)
    const open = await background(submenu)
    const logOut = page.locator('.popup-button-list__button', { hasText: 'Log out' })
    await logOut.hover()
    await settled(logOut)

    expect(await background(logOut)).toBe(open)
  })

  test('marks like the active tab bar take the accent itself, darkened only when it is too light', async ({ page }) => {
    const bar = async (accent: string) => {
      await page.context().addCookies(custom(accent))
      await page.goto((await findShowcase(page)).path)
      await hydrated(page)
      return page
        .locator('.tabs__tab-button--active')
        .first()
        .evaluate((element) => getComputedStyle(element, '::after').backgroundColor)
    }

    expect(await nearColor(page, await bar('#c2410c'), '#c2410c')).toBe(true)
    expect((await channels(page, 'oklch', await bar('#ffffff')))[0]).toBeCloseTo(0.6, 2)
  })

  test('a white primary keeps its button edge in light mode', async ({ page }) => {
    await page.context().addCookies(custom('#c2410c', { primary: '#ffffff' }))
    await page.goto('/admin/collections/showcase')

    await expect
      .poll(async () => (await channels(page, 'oklab', await style(page, '.btn--style-primary:visible', 'border-top-color')))[3])
      .toBeGreaterThan(0)
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

  test('keeps the hidden tab track at full width while the nav closes, so it never overflows', async ({ page }) => {
    await page.goto('/admin')
    const track = page.locator('.sidebar-tabs__tabs')
    const open = await track.evaluate((element) => element.getBoundingClientRect().width)

    const closing = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          document.querySelector<HTMLElement>('.payloadpack-rail-toggle')!.click()
          requestAnimationFrame(() =>
            requestAnimationFrame(() => resolve(document.querySelector('.sidebar-tabs__tabs')!.getBoundingClientRect().width))
          )
        })
    )
    expect(closing).toBeGreaterThanOrEqual(open)
  })

  test('never scrolls the rail sideways', async ({ page }) => {
    await page.goto('/admin')
    await page.getByRole('button', { name: 'Hide sidebar' }).click()
    await expect.poll(() => navWidth(page)).toBe(64)

    const scroller = page.locator('.nav__scroll')
    const box = (await scroller.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + 200)
    await page.mouse.wheel(200, 0)
    await afterNextFrame(page)
    expect(await scroller.evaluate((element) => element.scrollLeft)).toBe(0)
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

    expect(await (await page.request.get('/admin')).text()).toContain('"nav":"rail","rail":""')

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
    expect(await middle(label)).toBeCloseTo(await middle(showcase), 0)

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
    await page.locator('.doc-controls').evaluate(
      (controls, link) => {
        controls.style.marginTop = `${link!.getBoundingClientRect().top - controls.getBoundingClientRect().top}px`
      },
      await showcase.elementHandle()
    )
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
    await expect.poll(() => navWidth(page)).toBe(64)

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
    { closes: false, name: "keeps Payload's nav open", nav: 'rail' },
    { closes: true, name: 'lets Payload close the nav', nav: 'hidden' }
  ] as const) {
    test(`nav: '${nav}' ${name} when the window shrinks past 1440px`, async ({ page }) => {
      await page.context().addCookies([appearance({ options: { enhanced: { nav } } })])
      await page.setViewportSize({ height: 900, width: 1500 })
      await page.goto('/admin')
      await hydrated(page)
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
    await hydrated(page)
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
      density: 'comfortable',
      icons: 'lucide',
      motion: 'auto',
      nav: 'rail'
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
    expect(open.x + open.width / 2).toBe(28)
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

  test("loads the bundled Geist for the body font and Payload's widgets, and switches to Inter or the system font", async ({
    page
  }) => {
    const fonts: string[] = []
    page.on('request', (request) => {
      if (request.resourceType() === 'font') {
        fonts.push(new URL(request.url()).hostname)
      }
    })
    await page.context().addCookies([studio()])
    await openList(page)
    const body = page.locator('body')

    await expect(body).toHaveCSS('font-family', /^payloadpack-geist, payloadpack-geist-fallback,/)
    await page.goto('/admin')
    await expect(page.locator('.activity-widget__tab').first()).toHaveCSS('font-family', /^payloadpack-geist,/)
    expect(
      await page.evaluate(async () => {
        await document.fonts.ready
        return [...document.fonts].some((font) => font.family === 'payloadpack-geist' && font.status === 'loaded')
      })
    ).toBe(true)
    expect(fonts.every((hostname) => hostname === 'localhost')).toBe(true)

    await reloadWith(page, [studio({ font: 'inter' })])
    await expect(body).toHaveCSS('font-family', /^Inter, "?Inter Fallback"?/)

    await reloadWith(page, [studio({ font: 'system' })])
    await expect(body).toHaveCSS('font-family', /^system-ui,/)
  })

  test("sets text in Geist's fallback at Geist's width, so nothing shifts when it loads", async ({ page }) => {
    await page.context().addCookies([studio()])
    await openList(page)
    const fallback = await page.evaluate(() =>
      document.fonts.load('14px payloadpack-geist-fallback').then(
        (faces) => faces.length,
        () => undefined
      )
    )
    test.skip(fallback === undefined, 'the fallback face needs Arial, Arimo or Liberation Sans, which this machine does not have')
    expect(fallback).toBe(1)

    const [geist, metricFallback] = await page.evaluate(async () => {
      await document.fonts.load('14px payloadpack-geist')
      return ['payloadpack-geist', 'payloadpack-geist-fallback'].map((family) => {
        const text = document.body.appendChild(document.createElement('span'))
        text.style.font = `14px ${family}`
        text.textContent = 'Published documents need a title and a slug'
        const { width } = text.getBoundingClientRect()
        text.remove()
        return width
      })
    })
    expect(Math.abs(metricFallback / geist - 1)).toBeLessThan(0.03)
  })

  test('leaves Payload and Enhanced in their own layout and font', async ({ page }) => {
    for (const character of ['enhanced', 'payload']) {
      await page.context().addCookies([appearance({ character })])
      await openList(page)

      await expect(page.locator('.template-default__wrap')).toHaveCSS('margin', '0px')
      await expect(page.locator('.template-default__wrap')).toHaveCSS('border-top-width', '0px')
      await expect(page.locator('.nav__header')).toHaveCSS('display', 'flex')
      expect((await page.locator('.user-menu').boundingBox())?.y).toBeLessThan(60)
      await expect(page.locator('body')).toHaveCSS('font-family', /^Inter, "?Inter Fallback"?/)
    }
  })
})

test.describe('Warm palette', () => {
  test('fills primary buttons with the copper accent in light and dark, and marks in light', async ({ page }) => {
    for (const theme of ['light', 'dark']) {
      await page.context().addCookies([appearance({ character: 'studio', palette: 'warm' }), cookie('theme', theme)])
      await page.goto((await findShowcase(page)).path)

      await expect(page.locator('.btn--style-primary:visible').first()).toHaveCSS('background-color', 'rgb(194, 65, 12)')
    }
    await page.context().addCookies([cookie('theme', 'light')])
    await page.reload()
    const bar = await page
      .locator('.tabs__tab-button--active')
      .first()
      .evaluate((element) => getComputedStyle(element, '::after').backgroundColor)
    expect(await nearColor(page, bar, await computedColor(page, 'var(--payloadpack-accent)'))).toBe(true)
  })

  test('tints the field from the accent in light and dark, with cards on top', async ({ page }) => {
    await page.context().addCookies([appearance({ character: 'studio', palette: 'warm' }), cookie('theme', 'light')])
    await page.goto('/admin/collections/showcase')
    const field = page.locator('.template-default')
    const card = page.locator('.template-default__wrap')
    const followsAccent = async (read: () => Promise<string>) => {
      const before = await read()
      await page.evaluate(() => document.documentElement.style.setProperty('--payloadpack-accent', '#0057ff'))
      const after = await read()
      await page.evaluate(() => document.documentElement.style.removeProperty('--payloadpack-accent'))
      return before !== after
    }

    for (const theme of ['light', 'dark']) {
      await page.context().addCookies([appearance({ character: 'studio', palette: 'warm' }), cookie('theme', theme)])
      await page.reload()
      const [background, surface] = [
        await computedColor(page, 'var(--payloadpack-background)'),
        await computedColor(page, 'var(--payloadpack-surface)')
      ]

      await expect(field).toHaveCSS('background-color', background)
      await expect(page.locator('.nav')).toHaveCSS('background-color', background)
      await expect(card).toHaveCSS('background-color', surface)
      expect(await followsAccent(() => style(page, '.template-default', 'background-color')), theme).toBe(true)
      expect((await channels(page, 'oklab', surface))[0]).toBeGreaterThan((await channels(page, 'oklab', background))[0])
    }
    expect(await followsAccent(() => computedColor(page, 'var(--color-bg-selected)'))).toBe(true)
  })

  test('tints the nav under Enhanced too', async ({ page }) => {
    await page.context().addCookies([appearance({ palette: 'warm' }), cookie('theme', 'light')])
    await page.goto('/admin/collections/showcase')

    await expect(page.locator('.nav__header')).toHaveCSS(
      'background-color',
      await computedColor(page, 'var(--payloadpack-background)')
    )
    await expect(page.locator('.template-default__wrap')).toHaveCSS(
      'background-color',
      await computedColor(page, 'var(--payloadpack-surface)')
    )
  })
})
