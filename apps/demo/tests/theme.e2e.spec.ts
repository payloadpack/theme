import { RADIO_CARDS, SWITCH, type ThemePluginConfig, VERTICAL_TABS } from '@payloadpack/theme'
import { expect, type Locator, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'

import {
  baseURL,
  buildCustomPalette,
  clickAndWaitForSave,
  deleteSavedAppearance,
  demoCookie,
  findShowcase,
  NOTIFY_SWITCH_SELECTOR,
  openAppearancePanel,
  openFineTune,
  openShareMenuItem,
  radioInGroup,
  radioLabel,
  saveAppearanceAndReload,
  saveAppearancePreference,
  test,
  waitForAnimations,
  waitForAppearanceSave,
  waitForHydration
} from './demo'

const NEXT_SCRIPTS_GLOB = '**/_next/static/**/*.js'

const openShowcase = async (page: Page) => {
  await page.context().addCookies([demoCookie('theme', 'dark')])
  await page.goto((await findShowcase(page)).path)
  await waitForHydration(page)
}

const elementSize = async (page: Page, selector: string) => {
  const box = await page.locator(selector).first().boundingBox()
  return box && { height: box.height, width: box.width }
}

const computedColor = (page: Page, color: string, theme?: string) =>
  page.evaluate(
    ([value, mode]) => {
      const probe = document.createElement('div')
      if (mode) {
        probe.dataset.palette = document.documentElement.dataset.palette
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

const rgbToHex = (rgb: string) =>
  `#${(rgb.match(/\d+/g) ?? [])
    .slice(0, 3)
    .map((channel) => Number(channel).toString(16).padStart(2, '0'))
    .join('')}`

const isNearColor = async (page: Page, actual: string, expected: string) => {
  const [a, b] = [await colorChannels(page, 'oklab', actual), await colorChannels(page, 'oklab', expected)]
  return a.length === b.length && a.every((value, index) => Math.abs(value - b[index]) < 0.004)
}

const computedStyleValue = (page: Page, selector: string, property: string, pseudoElement?: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element, [name, pseudo]) => getComputedStyle(element, pseudo).getPropertyValue(name).trim(), [
      property,
      pseudoElement
    ] as const)

const colorChannels = async (page: Page, space: 'oklab' | 'oklch', color: string) =>
  (await computedColor(page, `${space}(from ${color} ${space === 'oklab' ? 'l a b' : 'l c h'})`))
    .match(/-?[\d.]+/g)
    ?.map(Number) ?? []

const verticalCenter = async (locator: Locator) => {
  const box = (await locator.boundingBox())!
  return box.y + box.height / 2
}

const signIn = async (page: Page, { email, password }: { email: string; password: string }) => {
  await page.goto('/admin/login')
  await page.fill('#field-email', email)
  await page.fill('#field-password', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/admin')
}

const signOut = async (page: Page) => {
  await page.goto('/admin/logout')
  await page.waitForURL(/\/admin\/login/)
}

const htmlAndBodyBackgrounds = (page: Page) =>
  page.evaluate(() => [document.documentElement, document.body].map((element) => getComputedStyle(element).backgroundColor))

test.describe('Logged out', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("defaults to Enhanced and Neutral with Enhanced's starting values", async ({ page }) => {
    await page.context().addCookies([demoCookie('theme', 'dark')])
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
    await expect(page.locator('html')).toHaveCSS('background-color', await computedColor(page, 'var(--payloadpack-bg-surface)'))
  })

  test('each editor gets their own look on a shared browser, and signing out shows the site default', async ({
    editor,
    page,
    playwright
  }) => {
    const editorRequest = await playwright.request.newContext({ baseURL, storageState: editor.authFile })
    const otherUser = { email: `other-${randomUUID()}@payloadpack.com`, password: 'other' }
    const { doc: other } = await (await editorRequest.post('/api/users', { data: otherUser })).json()
    const html = page.locator('html')

    try {
      await signIn(page, editor.credentials)
      const sheet = await openAppearancePanel(page)
      await clickAndWaitForSave(page, radioLabel(radioInGroup(sheet, 'Style', 'Studio')))
      await clickAndWaitForSave(page, radioLabel(radioInGroup(sheet, 'Palette', 'Warm')))

      await signOut(page)
      await expect(html).toHaveAttribute('data-character', 'enhanced')
      await expect(html).toHaveAttribute('data-palette', 'neutral')

      await signIn(page, otherUser)
      await expect(html).toHaveAttribute('data-character', 'enhanced')
      await expect(html).toHaveAttribute('data-palette', 'neutral')
      await expect(radioInGroup(await openAppearancePanel(page), 'Style', 'Enhanced')).toBeChecked()

      await signOut(page)
      await signIn(page, editor.credentials)
      await expect(html).toHaveAttribute('data-character', 'studio')
      await expect(html).toHaveAttribute('data-palette', 'warm')
    } finally {
      await editorRequest.delete(`/api/users/${other.id}`)
      await editorRequest.dispose()
    }
  })

  test('signing in brings back the saved appearance and its panel without a reload', async ({ editor, page, playwright }) => {
    const editorRequest = await playwright.request.newContext({ baseURL, storageState: editor.authFile })
    await saveAppearancePreference(editorRequest, { character: 'studio' })
    await signIn(page, editor.credentials)

    await expect(page.locator('html')).toHaveAttribute('data-character', 'studio')
    const sheet = await openAppearancePanel(page)
    await expect(radioInGroup(sheet, 'Style', 'Studio')).toBeChecked()
    await editorRequest.dispose()
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

    await saveAppearancePreference(page.request, { options: { enhanced: { density: 'compact' } } })
    await page.reload()
    await expect(code).toHaveCSS('font-size', '11px')
    await expect(smallCode).toHaveCSS('font-size', '10px')
  })

  test('ignores unknown values in a saved setup', async ({ page }) => {
    await saveAppearancePreference(page.request, { character: 'constructor', options: { enhanced: { density: '</script>' } } })
    await page.goto('/admin')

    await expect(page.locator('html')).toHaveAttribute('data-character', 'enhanced')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'comfortable')
  })

  test('renders the saved setup on the server, with no option attributes under Payload', async ({ page }) => {
    await saveAppearancePreference(page.request, { character: 'payload', options: { enhanced: { density: 'compact' } } })

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
    await page.context().addCookies([demoCookie('theme', 'dark')])

    await page.route(NEXT_SCRIPTS_GLOB, (route) => route.abort())
    await page.goto('/admin')
    const beforeHydration = await htmlAndBodyBackgrounds(page)

    await page.unroute(NEXT_SCRIPTS_GLOB)
    await page.goto('/admin', { waitUntil: 'networkidle' })

    expect(beforeHydration).toEqual(await htmlAndBodyBackgrounds(page))
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
    await expect(page.locator('.nav')).toHaveAttribute('inert')
    await waitForAnimations(page.locator('.template-default'))
    expect(await page.locator('#payloadpack-appearance').evaluate((element) => getComputedStyle(element).translate)).toBe(
      '0px 100%'
    )
    await openAppearancePanel(page)

    expect(await sheet.boundingBox()).toEqual({ height: 560, width: 375, x: 0, y: 240 })

    await sheet.getByRole('button', { name: 'Close' }).click()
    await expect(sheet).toBeHidden()
  })

  test('treats 768px as a phone, and rounds the phone sheet with the style corners', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 768 })
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)

    expect(await sheet.boundingBox()).toEqual({ height: 560, width: 768, x: 0, y: 240 })
    await expect(sheet).toHaveCSS('border-top-left-radius', '13px')
    await openFineTune(sheet)
    await expect(sheet.locator('[data-option="nav"]')).toBeHidden()

    await saveAppearanceAndReload(page, { options: { enhanced: { radius: 'none' } } })
    await expect(page.locator('html')).toHaveAttribute('data-radius', 'none')
    await expect(await openAppearancePanel(page)).toHaveCSS('border-top-left-radius', '0px')
  })

  test('picks Payload with nothing to fine-tune and no option attributes, and keeps it after a reload', async ({ page }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    const payload = radioInGroup(sheet, 'Style', 'Payload')

    await clickAndWaitForSave(page, radioLabel(payload))

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
    await radioLabel(radioInGroup(sheet, 'Density', 'Compact')).click()
    await radioLabel(radioInGroup(sheet, 'Corners', 'Small')).click()
    await expect(html).toHaveAttribute('data-density', 'compact')
    await expect(html).toHaveAttribute('data-radius', 'sm')

    await radioLabel(radioInGroup(sheet, 'Style', 'Studio')).click()
    await expect(html).toHaveAttribute('data-density', 'compact')
    await expect(html).toHaveAttribute('data-radius', 'lg')
    await expect(radioInGroup(sheet, 'Density', 'Compact')).toBeChecked()

    await radioLabel(radioInGroup(sheet, 'Style', 'Enhanced')).click()
    await expect(html).toHaveAttribute('data-radius', 'sm')

    await radioLabel(radioInGroup(sheet, 'Style', 'Payload')).click()
    await radioLabel(radioInGroup(sheet, 'Style', 'Enhanced')).click()
    await expect(html).toHaveAttribute('data-density', 'compact')
  })

  test('Fine-tune opens on demand and counts changes, Reset puts them back, and Undo keeps picks made since', async ({
    page
  }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    const html = page.locator('html')
    const reset = sheet.getByRole('button', { name: 'Reset Enhanced' })
    const status = sheet.getByRole('status')

    await expect(sheet.getByRole('radiogroup', { name: 'Density' })).toBeHidden()
    await openFineTune(sheet)
    await expect(sheet.getByRole('radiogroup', { name: 'Density' })).toBeVisible()
    await expect(reset).toBeDisabled()

    await radioLabel(radioInGroup(sheet, 'Density', 'Compact')).click()
    await clickAndWaitForSave(page, radioLabel(radioInGroup(sheet, 'Corners', 'Small')))
    await expect(sheet.locator('summary')).toContainText('2 changed')

    await clickAndWaitForSave(page, reset)
    await expect(html).toHaveAttribute('data-density', 'comfortable')
    await expect(html).toHaveAttribute('data-radius', 'md')
    await expect(reset).toBeDisabled()
    await expect(status).toContainText('Enhanced is back to its defaults.')
    await clickAndWaitForSave(page, radioLabel(radioInGroup(sheet, 'Palette', 'Warm')))
    await clickAndWaitForSave(page, radioLabel(radioInGroup(sheet, 'Corners', 'Large')))

    await clickAndWaitForSave(page, status.getByRole('button', { name: 'Undo' }))
    await expect(html).toHaveAttribute('data-density', 'compact')
    await expect(html).toHaveAttribute('data-radius', 'lg')
    await expect(html).toHaveAttribute('data-palette', 'warm')
    await expect(status).toBeEmpty()

    await page.reload()
    await expect(html).toHaveAttribute('data-density', 'compact')
    await expect(html).toHaveAttribute('data-radius', 'lg')
  })

  test('saves the setup in Payload preferences, so it follows the editor to a new browser', async ({ browser, editor, page }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)

    await openFineTune(sheet)
    await clickAndWaitForSave(page, radioLabel(radioInGroup(sheet, 'Density', 'Compact')))

    const elsewhere = await browser.newContext({ baseURL, storageState: editor.authFile })
    const other = await elsewhere.newPage()
    await other.goto('/admin')

    await expect(other.locator('html')).toHaveAttribute('data-density', 'compact')
    await elsewhere.close()
  })

  test('says in the panel when the server rejects a change, and saves it with the next change', async ({ page }) => {
    const appearancePreferenceGlob = '**/api/payload-preferences/payloadpack-appearance'
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    await page.route(appearancePreferenceGlob, (route) =>
      route.request().method() === 'POST' ? route.fulfill({ body: '{}', status: 500 }) : route.continue()
    )

    await radioLabel(radioInGroup(sheet, 'Palette', 'Warm')).click()

    await expect(sheet.getByRole('status')).toHaveText('Your setup could not be saved yet. Your next change tries again.')
    await expect(sheet.getByRole('status')).toHaveAttribute('data-tone', 'error')

    await page.unroute(appearancePreferenceGlob)
    await clickAndWaitForSave(page, radioLabel(radioInGroup(sheet, 'Style', 'Studio')))
    await expect(sheet.getByRole('status')).toBeEmpty()
    expect((await (await page.request.get('/api/payload-preferences/payloadpack-appearance')).json()).value).toEqual({
      character: 'studio',
      palette: 'warm'
    })
  })

  test('copies the setup in one browser and pastes it in another', async ({ browser, context, editor, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await saveAppearancePreference(page.request, {
      character: 'payload',
      custom: buildCustomPalette('#be185d'),
      palette: 'custom'
    })
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)

    await (await openShareMenuItem(sheet, 'Copy setup')).click()
    await expect(sheet.getByRole('status')).toHaveText('Setup copied. Paste it in another browser to get the same look.')
    const setup = await page.evaluate(() => navigator.clipboard.readText())
    const attributes = await page.locator('html').evaluate((html) => ({ ...html.dataset }))
    await deleteSavedAppearance(page.request)

    const elsewhere = await browser.newContext({ baseURL, storageState: editor.authFile })
    await elsewhere.grantPermissions(['clipboard-read', 'clipboard-write'])
    const other = await elsewhere.newPage()
    await other.goto('/admin')
    const otherSheet = await openAppearancePanel(other)
    const status = otherSheet.getByRole('status')
    const writeClipboard = (text: string) => other.evaluate((value) => navigator.clipboard.writeText(value), text)

    await writeClipboard('not a setup')
    await (await openShareMenuItem(otherSheet, 'Paste setup')).click()
    await expect(status).toHaveText('There is no appearance setup on the clipboard.')
    await expect(status).toHaveAttribute('data-tone', 'error')
    await expect(other.locator('html')).toHaveAttribute('data-character', 'enhanced')

    await writeClipboard(setup)
    await clickAndWaitForSave(other, await openShareMenuItem(otherSheet, 'Paste setup'))
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
    expect(await verticalCenter(sheet.getByRole('button', { name: 'Share setup' }))).toBeCloseTo(await verticalCenter(status), 0)
  })

  test('says the browser blocked the clipboard when it refuses or is missing', async ({ page }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    const status = sheet.getByRole('status')

    await (await openShareMenuItem(sheet, 'Paste setup')).click()
    await expect(status).toHaveText('The browser blocked the clipboard.')
    await expect(status).toHaveAttribute('data-tone', 'error')
    await expect(status).toBeEmpty()

    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined }))
    await (await openShareMenuItem(sheet, 'Copy setup')).click()
    await expect(status).toHaveText('The browser blocked the clipboard.')
    await expect(status).toBeEmpty()
    await (await openShareMenuItem(sheet, 'Paste setup')).click()
    await expect(status).toHaveText('The browser blocked the clipboard.')
  })

  test("shows each icon set's logo", async ({ page }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    const logo = (name: string) =>
      radioLabel(radioInGroup(sheet, 'Icons', name)).locator('.payloadpack-appearance-panel__logo svg')

    await openFineTune(sheet)

    await expect(logo('Payload')).toHaveClass(/graphic-icon/)
    await expect(logo('Lucide')).toBeVisible()
    await expect(logo('Lucide')).not.toHaveClass(/graphic-icon/)
  })

  test('moves through a group with the arrow keys, one Tab stop per group', async ({ page }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    const dark = radioInGroup(sheet, 'Theme', 'Dark')

    await radioInGroup(sheet, 'Theme', 'Light').focus()
    await page.keyboard.press('ArrowRight')
    await expect(dark).toBeChecked()
    await expect(dark).toBeFocused()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await page.keyboard.press('Tab')
    await expect(radioInGroup(sheet, 'Palette', 'Neutral')).toBeFocused()
  })

  test('keeps its own size and typeface whatever the density and typeface', async ({ page }) => {
    const look = async () =>
      (await openAppearancePanel(page))
        .getByRole('radiogroup', { name: 'Theme' })
        .evaluate((group) => ({ font: getComputedStyle(group).fontFamily, height: group.getBoundingClientRect().height }))

    await page.goto('/admin')
    const enhanced = await look()

    await saveAppearancePreference(page.request, {
      character: 'studio',
      options: { studio: { density: 'compact', font: 'system' } }
    })
    await page.reload()

    await expect(page.locator('body')).toHaveCSS('font-family', /^system-ui,/)
    expect(await look()).toEqual(enhanced)
  })

  test('sits left of the nav toggle on the user menu row under Enhanced, right of it under Studio, and in the header when the nav is closed or Payload', async ({
    page
  }) => {
    const button = page.getByRole('button', { name: 'Appearance' })
    const beside = async () => {
      const [trigger, toggle] = [(await button.boundingBox())!, (await page.locator('.payloadpack-nav-toggle').boundingBox())!]
      expect(trigger.y).toBe(toggle.y)
      return trigger.x < toggle.x ? 'left' : 'right'
    }

    await page.goto('/admin')
    await waitForHydration(page)
    expect(await beside()).toBe('left')
    const [toggle, menu] = [
      (await page.locator('.payloadpack-nav-toggle').boundingBox())!,
      (await page.locator('.nav__header .user-menu__trigger').boundingBox())!
    ]
    expect(toggle.y + toggle.height / 2).toBe(menu.y + menu.height / 2)
    expect(menu.x + menu.width).toBeLessThan((await button.boundingBox())!.x)

    await saveAppearanceAndReload(page, { character: 'studio' })
    expect(await beside()).toBe('right')

    await page.route('**/api/payload-preferences/nav*', (route) =>
      route.request().method() === 'POST' ? route.fulfill({ json: {} }) : route.fallback()
    )
    await saveAppearanceAndReload(page, { options: { enhanced: { nav: 'hidden' } } })
    await page.getByRole('button', { name: 'Hide sidebar' }).click()
    await expect(page.locator('.app-header').getByRole('button', { name: 'Appearance' })).toBeVisible()

    await saveAppearanceAndReload(page, { character: 'payload' })
    const inNav = page.locator('.nav').getByRole('button', { name: 'Appearance' })
    await expect(inNav).toBeVisible()
    await expect(page.locator('.app-header').getByRole('button', { name: 'Appearance' })).toBeHidden()
    await page
      .locator('.nav__header .user-menu__trigger .btn__label')
      .evaluate((label) => (label.textContent = 'a-much-longer-address-than-most@example.com'))
    const [palette, close, email] = [
      (await inNav.boundingBox())!,
      (await page.locator('.nav__close').boundingBox())!,
      (await page.locator('.nav__header .user-menu__trigger').boundingBox())!
    ]
    expect(palette.y + palette.height / 2).toBe(close.y + close.height / 2)
    expect(palette.x + palette.width).toBeLessThan(close.x)
    expect(email.x + email.width).toBeLessThan(palette.x)
    await page.locator('.nav__close').click()
    await expect(page.locator('.app-header').getByRole('button', { name: 'Appearance' })).toBeVisible()
  })

  test('stays reachable on custom views, which have no header actions, under every style', async ({ page }) => {
    for (const character of ['payload', 'enhanced', 'studio']) {
      await saveAppearancePreference(page.request, { character })
      await page.goto('/admin/toasts')
      await expect(page.getByRole('button', { name: 'Appearance' }), character).toBeVisible()
    }
  })

  for (const theme of ['light', 'dark']) {
    test(`the nav toggle, the Appearance button, nav links and group headings share one hover in ${theme} mode`, async ({
      page
    }) => {
      await page.context().addCookies([demoCookie('theme', theme)])
      await page.goto('/admin')
      const hovered = async (locator: Locator, pseudo?: string) => {
        await locator.hover()
        return locator.evaluate((element, pseudoElement) => {
          const style = getComputedStyle(element, pseudoElement)
          return { background: style.backgroundColor, radius: style.borderTopLeftRadius }
        }, pseudo)
      }
      const toggle = page.locator('.payloadpack-nav-toggle .sidebar-toggle')
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
      await saveAppearancePreference(page.request, { character })
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
        await ring('.payloadpack-nav-toggle', '.payloadpack-nav-toggle .sidebar-toggle')
      )
      expect((await ring(trigger, trigger)).outline).toBe('2px')
    })
  }

  test("keeps Payload's header height under the Payload style", async ({ page }) => {
    await saveAppearancePreference(page.request, { character: 'payload' })
    await page.goto('/admin')
    await waitForHydration(page)
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
    await waitForHydration(page)

    expect(await computedStyleValue(page, '.payloadpack-appearance-panel__palette-icon', 'mask-image')).toContain(
      'data:image/svg+xml'
    )
  })

  test('segments sit 3px inside their track', async ({ page }) => {
    await page.goto('/admin')
    const track = (await openAppearancePanel(page)).getByRole('radiogroup', { name: 'Theme' })
    const inset = await track.evaluate((element) => {
      const outer = element.getBoundingClientRect()
      const inner = element.querySelector('label:has(:checked)')!.getBoundingClientRect()
      return [inner.top - outer.top, outer.bottom - inner.bottom, outer.right - inner.right]
    })

    expect(inset).toEqual([3, 3, 3])
    await expect(track).toHaveCSS('border-top-width', '0px')
    await expect(track).toHaveCSS('border-radius', '8px')
  })

  test("switches Payload's theme", async ({ page }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    const themeCookie = async () => (await page.context().cookies()).find(({ name }) => name === 'theme-demo-theme')?.value

    await expect(radioInGroup(sheet, 'Theme', 'Automatic')).toBeChecked()

    await radioLabel(radioInGroup(sheet, 'Theme', 'Dark')).click()

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(radioInGroup(sheet, 'Theme', 'Dark')).toBeChecked()
    expect(await themeCookie()).toBe('dark')

    await radioLabel(radioInGroup(sheet, 'Theme', 'Automatic')).click()

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    expect(await themeCookie()).toBeUndefined()
  })
})

test.describe('Theme values', () => {
  test("pads a button evenly when its icon renders nothing, and keeps Payload's padding beside an icon", async ({ page }) => {
    const { docs } = await (await page.request.get('/api/tags?limit=1&depth=0')).json()
    await page.goto(`/admin/collections/tags/${docs[0].id}`)
    const button = page.locator('.hierarchy-button')
    await expect(button).toHaveCSS('padding-inline-start', '4px')
    await expect(button).toHaveCSS('padding-inline-end', '8px')

    await button.locator('.btn__icon').evaluate((icon) => icon.replaceChildren())
    await expect(button).toHaveCSS('padding-inline-start', '8px')
    await expect(button).toHaveCSS('padding-inline-end', '8px')
    await expect(button.locator('.btn__icon')).toBeHidden()
  })

  test('makes a whole document card react: a pointer, a hover in the palette and a selected border on a click', async ({
    page
  }) => {
    await saveAppearancePreference(page.request, { character: 'studio', palette: 'warm' })
    await expect(
      await page.request.post('/api/payload-preferences/collection-pages', { data: { value: { documentLayout: 'grid' } } })
    ).toBeOK()
    await page.goto('/admin/collections/pages')
    await waitForHydration(page)
    const card = page.locator('.document-card').first()
    const thumbnail = card.locator('.document-card__thumbnail--empty')
    await expect(card).toHaveCSS('cursor', 'pointer')
    await expect(thumbnail.locator('svg.icon--document')).toHaveCSS('mask-size', 'min(100%, 26px) auto')

    const mixHalfStepOfTextOver = (background: string, step: string) =>
      computedColor(page, `color-mix(in oklab, var(--color-text) calc(var(${step}) / 2), var(${background}))`)

    await card.hover()
    await expect(card).toHaveCSS('background-color', await mixHalfStepOfTextOver('--color-bg', '--payloadpack-hover-step'))
    await expect(thumbnail).toHaveCSS(
      'background-color',
      await mixHalfStepOfTextOver('--color-bg-secondary', '--payloadpack-hover-step')
    )

    await thumbnail.hover()
    await page.mouse.down()
    await expect(card).toHaveCSS('background-color', await mixHalfStepOfTextOver('--color-bg', '--payloadpack-pressed-step'))
    await expect(thumbnail).toHaveCSS(
      'background-color',
      await mixHalfStepOfTextOver('--color-bg-secondary', '--payloadpack-pressed-step')
    )

    await page.mouse.up()
    await expect(card).toHaveAttribute('aria-pressed', 'true')
    await expect(card).toHaveCSS('border-top-color', await computedColor(page, 'var(--color-border-selected)'))
  })

  test('presses a secondary button one step past its hover in dark mode and keeps the scrollbar color', async ({ page }) => {
    await saveAppearancePreference(page.request, { character: 'studio', palette: 'neutral' })
    await page.context().addCookies([demoCookie('theme', 'dark')])
    await page.goto('/admin/collections/pages')
    await waitForHydration(page)
    const filters = page.getByRole('button', { name: 'Filters' })

    await filters.hover()
    await page.mouse.down()

    await expect(filters).toHaveCSS(
      'background-color',
      await computedColor(
        page,
        'color-mix(in oklab, var(--payloadpack-text-primary) calc(var(--payloadpack-pressed-step) - var(--payloadpack-hover-step)), var(--color-bg-secondary-hover))'
      )
    )
    expect(await computedColor(page, 'var(--scrollbar-color)')).toBe(await computedColor(page, 'var(--ramp-grey-500)'))
    await page.mouse.up()
  })

  test('keeps an open popup button pressed while the pointer is still on it', async ({ page }) => {
    await saveAppearancePreference(page.request, { character: 'studio', palette: 'warm' })
    await page.goto('/admin/collections/pages')
    await waitForHydration(page)
    const trigger = page.locator('.list-controls__popup .popup-button')

    await trigger.click()

    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(trigger).toHaveCSS('background-color', await computedColor(page, 'var(--color-bg-transparent-pressed)'))
  })

  test('gives join tables the list rows in comfortable density and leaves them condensed in compact', async ({ page }) => {
    await saveAppearancePreference(page.request, { options: { enhanced: { density: 'comfortable' } } })
    const { docs } = await (await page.request.get('/api/categories?where[name][equals]=Community&limit=1&depth=0')).json()
    const rowHeight = (row: Locator) => row.evaluate((element) => element.getBoundingClientRect().height)
    const joinRow = page.locator('.field-type.join').filter({ hasText: 'Products' }).locator('tbody tr').first()

    await page.goto('/admin/collections/products')
    const listRow = await rowHeight(page.locator('.table tbody tr').first())
    await page.goto(`/admin/collections/categories/${docs[0].id}`)
    expect(await rowHeight(joinRow)).toBe(listRow)

    await saveAppearanceAndReload(page, { options: { enhanced: { density: 'compact' } } })
    expect(await rowHeight(joinRow)).toBeLessThan(listRow)
  })

  test("comfortable density sizes an upload's file actions and centers their icons", async ({ page }) => {
    await page.goto('/admin/collections/media')
    await page.locator('table tbody tr a').first().click()
    await page.waitForURL(/\/admin\/collections\/media\/\d+/)
    const actions = page.locator('.file-toolbar__right > *')

    await expect(actions).toHaveCount(3)
    expect(await elementSize(page, '.file-toolbar__filename-btn')).toMatchObject({ height: 36 })
    for (const action of await actions.all()) {
      const [box, icon] = [await action.boundingBox(), await action.locator('svg').boundingBox()]
      expect(box).toMatchObject({ height: 36, width: 36 })
      expect(Math.abs(icon!.x + icon!.width / 2 - (box!.x + box!.width / 2))).toBeLessThan(0.5)
      expect(Math.abs(icon!.y + icon!.height / 2 - (box!.y + box!.height / 2))).toBeLessThan(0.5)
    }
  })

  test('comfortable density sizes', async ({ page }) => {
    await openShowcase(page)

    await expect(page.locator('.field-label').first()).toHaveCSS('font-size', '14px')
    await expect(page.locator('.field-type.text input').first()).toHaveCSS('font-size', '14px')
    expect(await elementSize(page, '.field-type.text input')).toMatchObject({ height: 36 })
    expect(await elementSize(page, '.doc-controls__controls .btn')).toMatchObject({ height: 36 })
    expect(await elementSize(page, '.nav__link')).toMatchObject({ height: 36 })
    expect(await elementSize(page, '.collapsible__toggle-wrap')).toMatchObject({ height: 44 })
    expect(await elementSize(page, '.collapsible__indicator')).toEqual({ height: 36, width: 36 })
    expect(await elementSize(page, '.collapsible__actions .popup-button')).toEqual({ height: 36, width: 36 })
    expect(await elementSize(page, '.slug-field-component__action-btn')).toEqual({ height: 28, width: 28 })
    expect(await computedStyleValue(page, '.slug-field-component__action-btn', 'border-radius')).toBe(
      await computedStyleValue(page, '.doc-controls__controls .btn', 'border-radius')
    )
    expect(await computedStyleValue(page, '.fixed-toolbar + .editor-container .ContentEditable__root', 'padding-top')).toBe(
      '24px'
    )

    const popupMaxHeight = await page
      .locator('.popup__scroll-container')
      .first()
      .evaluate((element) => parseFloat(getComputedStyle(element).maxHeight) === window.innerHeight - 16)
    expect(popupMaxHeight).toBe(true)

    await page.locator('.doc-controls__popup-button').click()
    await waitForAnimations(page.locator('.doc-controls__popup'))
    expect(await elementSize(page, '.doc-controls__popup .popup-button-list__button')).toMatchObject({ height: 32 })

    await page.locator('.date-time-picker input').first().click()
    await expect(page.locator('.react-datepicker__header__dropdown')).toHaveCSS('padding-left', '0px')
  })

  test('list view keeps its layout when selecting rows', async ({ page }) => {
    await page.goto('/admin/collections/showcase')
    await waitForHydration(page)
    const table = page.locator('table')

    expect(await elementSize(page, '.list-controls .dots')).toEqual({ height: 36, width: 36 })

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
    await expect(cards.first()).toHaveCSS(
      'border-radius',
      await computedStyleValue(page, '.field-type.text input', 'border-radius')
    )
  })

  test('switches slide a light thumb and line the description up with the label', async ({ page }) => {
    await openShowcase(page)
    const field = page.locator(NOTIFY_SWITCH_SELECTOR)
    const track = field.locator('.checkbox-input__visuals')

    const box = await elementSize(page, `${NOTIFY_SWITCH_SELECTOR} .checkbox-input__visuals`)
    expect(box?.height).toBe(24)
    expect(box?.width).toBeCloseTo(41.2, 1)
    await expect(track).toHaveCSS('grid-template-columns', /^0px 17\.\d+px 17\.\d+px$/)
    await expect(track).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)')
    await expect(track).toHaveCSS('background-color', await computedColor(page, 'var(--payloadpack-toggle-border)'))
    expect(
      await computedStyleValue(page, `${NOTIFY_SWITCH_SELECTOR} .checkbox-input__visuals`, 'background-color', '::before')
    ).toBe(await computedColor(page, 'var(--ramp-white-1000)'))

    await field.getByText('Notify subscribers').click()
    await expect(field.getByRole('checkbox')).toBeChecked()
    await expect(track).toHaveCSS('grid-template-columns', /^17\.\d+px 17\.\d+px 0px$/)
    await expect(track).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)')
    await expect(track).toHaveCSS('background-color', await computedColor(page, 'var(--payloadpack-toggle-checked-bg)'))
    expect(
      await computedStyleValue(page, `${NOTIFY_SWITCH_SELECTOR} .checkbox-input__visuals`, 'background-color', '::before')
    ).toBe(await computedColor(page, 'var(--payloadpack-toggle-mark)'))

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
    expect(
      await computedStyleValue(page, `${NOTIFY_SWITCH_SELECTOR} .checkbox-input__visuals`, 'background-color', '::before')
    ).toBe(await computedColor(page, 'var(--ramp-white-1000)'))
  })

  test('SWITCH_END puts the switch after its label at the end of the row, and the whole row toggles it', async ({ page }) => {
    await openShowcase(page)
    const field = page.locator('.field-type.checkbox:has(#field-pinned)')
    await field.scrollIntoViewIfNeeded()
    const [row, label, toggle] = await Promise.all(
      ['.checkbox-input__wrap', '.field-label', '.checkbox-input__input'].map(
        async (selector) => (await field.locator(selector).boundingBox())!
      )
    )

    expect(label.x).toBe(row.x)
    expect(toggle.x + toggle.width).toBe(row.x + row.width)
    await expect(field.locator('.field-description')).toHaveCSS('padding-inline-start', '0px')

    await page.mouse.click(toggle.x - 40, toggle.y + toggle.height / 2)
    await expect(field.getByRole('checkbox')).toBeChecked()
  })

  for (const { character, toggles } of [
    { character: 'enhanced', toggles: true },
    { character: 'payload', toggles: false }
  ]) {
    test(`a click at the far end of a checkbox row ${toggles ? 'toggles it' : 'leaves it alone'} under ${character}`, async ({
      page
    }) => {
      await saveAppearancePreference(page.request, { character })
      await openShowcase(page)
      const row = (await page.locator('.field-type.checkbox:has(#field-featured) .checkbox-input__wrap').boundingBox())!

      await page.mouse.click(row.x + row.width - 4, row.y + row.height / 2)
      await expect(page.locator('#field-featured')).toBeChecked({ checked: toggles })
    })
  }

  test('checkboxes and radios take clicks just outside their box: 24px in forms, 32px in list selection', async ({ page }) => {
    await openShowcase(page)
    const clickJustOutside = async (control: Locator, offset: number) => {
      const box = (await control.boundingBox())!
      await page.mouse.click(box.x + box.width / 2, box.y - offset)
    }
    const radio = page.locator('#field-size-xs')
    const featured = page.locator('#field-featured')

    expect(await elementSize(page, '.radio-input:has(#field-size-xs) .radio-input__styled-radio')).toEqual({
      height: 18,
      width: 18
    })
    await clickJustOutside(radio, 2)
    await expect(radio).toBeChecked()
    await clickJustOutside(featured, 2)
    await expect(featured).toBeChecked()

    await page.goto('/admin/collections/products')
    await waitForHydration(page)
    const rowCheckbox = page.locator('tbody .select-row input').first()
    expect(await elementSize(page, 'tbody .select-row .checkbox-input__visuals')).toEqual({ height: 18, width: 18 })
    await clickJustOutside(rowCheckbox, 6)
    await expect(rowCheckbox).toBeChecked()
  })

  test('Payload icons keep the Payload tick without its halo', async ({ page }) => {
    await saveAppearancePreference(page.request, { options: { enhanced: { icons: 'payload' } } })
    await openShowcase(page)
    const featured = page.locator('.field-type.checkbox').filter({ hasText: 'Featured' })
    await featured.getByRole('checkbox').check()

    await expect(featured.locator('.checkbox-input__check .checkbox-input__mark')).toHaveCSS('stroke', 'oklch(0 0 0)')
    await expect(featured.locator('.checkbox-input__check .checkbox-input__mark-halo')).toBeHidden()
  })

  test('large buttons on the dashboard', async ({ page }) => {
    await page.goto('/admin')
    await page.getByRole('button', { name: 'Pinned' }).click()

    expect(await elementSize(page, '.activity-widget__select-documents')).toMatchObject({ height: 36 })
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

    await expect
      .poll(() => computedStyleValue(page, '.date-time-picker svg.icon--calendar', 'mask-size'))
      .toBe('min(100%, 14px) auto')
    expect(await computedStyleValue(page, '.dropdown-indicator svg.icon--chevron', 'mask-size')).toBe('min(100%, 12px) auto')
    expect(await computedStyleValue(page, '.multi-value svg.icon--edit', 'mask-size')).toBe('min(100%, 12px) auto')
    expect(await computedStyleValue(page, '.collapsible__indicator svg.icon--chevron', 'mask-size')).toBe('min(100%, 16px) auto')
    expect(await computedStyleValue(page, '.collapsible__actions svg.icon--more', 'mask-size')).toBe('min(100%, 16px) auto')
    expect(await computedStyleValue(page, '.sidebar-tabs__tab svg.icon--align-justified', '--payloadpack-icon')).toContain(
      'data:image/svg+xml'
    )
    expect(await computedStyleValue(page, '.nav__link', 'mask-image', '::after')).toContain('data:image/svg+xml')

    await page
      .getByRole('button', { name: /^Add new/ })
      .first()
      .click()
    await expect
      .poll(() => computedStyleValue(page, '.doc-drawer__header-close svg.icon--chevron', 'mask-size'))
      .toBe('min(100%, 18px) auto')
  })

  test('lets a click on a Lucide icon reach the control under it', async ({ page }) => {
    await page.goto('/admin/collections/products')
    await waitForHydration(page)
    const clickIcon = async (name: string) => {
      const box = await page.locator(`.segmented-control__option:has(input[value="${name}"]) svg`).boundingBox()
      await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
    }

    await clickIcon('grid')
    await expect(page.getByRole('radio', { name: 'Grid' })).toBeChecked()
    await clickIcon('table')
    await expect(page.getByRole('radio', { name: 'Table' })).toBeChecked()
  })

  for (const character of ['enhanced', 'studio']) {
    for (const theme of ['light', 'dark']) {
      test(`sidebar tabs match the panel's segments under ${character} in ${theme} mode`, async ({ page }) => {
        await saveAppearancePreference(page.request, { character })
        await page.context().addCookies([demoCookie('theme', theme)])
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
    await saveAppearancePreference(page.request, { options: { enhanced: { nav: 'hidden' } } })
    await page.goto('/admin')
    await page.getByRole('button', { name: 'Hide sidebar' }).focus()

    await expect(page.locator('.payloadpack-nav-toggle .sidebar-toggle')).toHaveCSS('outline-style', 'solid')
    await expect(page.locator('.payloadpack-nav-toggle .sidebar-toggle')).toHaveCSS('outline-width', '2px')
  })

  test('the toasts preview reuses the list heading and marks its nav link', async ({ page }) => {
    await page.goto('/admin/collections/showcase')
    await waitForHydration(page)
    const listTitle = await computedStyleValue(page, '.list-header__title', 'font-size')
    await page.goto('/admin/toasts')

    await expect(page.locator('.list-header__title')).toHaveCSS('font-size', listTitle)
    await expect(page.getByRole('link', { name: 'Toasts' })).toHaveAttribute('aria-current', 'page')
  })

  test('the nav icons preview shows each match word with the icon its slug gets', async ({ page }) => {
    await page.goto('/admin/nav-icons')

    await expect(page.getByRole('link', { name: 'Nav icons' })).toHaveAttribute('aria-current', 'page')
    await expect(page.locator('#nav-icons-address')).toHaveText('address')
    expect(await computedStyleValue(page, '#nav-icons-address', '--payloadpack-icon')).toContain('map-pin-house')
    expect(await computedStyleValue(page, '#nav-icons-budget-ticket', '--payloadpack-icon')).toContain('ticket')
  })

  for (const character of ['enhanced', 'studio']) {
    test(`${character} widens the nav and lines it up on one gutter, with the group chevron inside its ring`, async ({
      page
    }) => {
      await saveAppearancePreference(page.request, { character })
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
      expect(await computedStyleValue(page, '.nav-group__toggle', 'font-size')).toBe('12px')
      expect(await computedStyleValue(page, '.nav-group:not(:first-child)', 'margin-left', '::before')).toBe('12px')
      expect(await computedStyleValue(page, '.nav-group__toggle', 'inset', '::before')).toBe(
        await computedStyleValue(page, '.nav__link', 'inset', '::before')
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
    expect(await computedStyleValue(page, `.${VERTICAL_TABS} .tabs-field__tab-button--active`, 'width', '::after')).toBe('3px')
    expect(await computedStyleValue(page, `.${VERTICAL_TABS} .tabs-field__tab-button--active`, 'height', '::after')).toBe(
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

    expect(await elementSize(page, '.collapsible__indicator')).toEqual({ height: 40, width: 40 })
    expect(await elementSize(page, '.collapsible__actions .popup-button')).toEqual({ height: 40, width: 40 })
    expect(await elementSize(page, '.collapsible__toggle-wrap')).toMatchObject({ height: 48 })
    expect(await elementSize(page, '.doc-controls__controls .btn')).toMatchObject({ height: 36 })
    expect(await elementSize(page, '.doc-header .doc-tab')).toMatchObject({ height: 36 })
  })

  test('app CSS picks the nav icon for its own collection', async ({ page }) => {
    await page.goto('/admin')
    await waitForHydration(page)
    await page.addStyleTag({ content: "#nav-showcase { --payloadpack-icon: url('/icons/chef-hat.svg'); }" })

    expect(await computedStyleValue(page, '#nav-showcase', 'mask-image', '::after')).toContain('/icons/chef-hat.svg')
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
        ...['--radius-small', '--radius-chip', '--radius-medium', '--radius-large'].map((token) =>
          computedStyleValue(page, 'html', token)
        ),
        computedStyleValue(page, button, 'border-radius'),
        computedStyleValue(page, field, 'border-radius')
      ])

    await saveAppearancePreference(page.request, { character: 'payload' })
    await openShowcase(page)
    const payload = await radii()

    await saveAppearancePreference(page.request, {})
    await openShowcase(page)

    await expect(page.locator('html')).toHaveAttribute('data-radius', 'md')
    expect(await radii()).toEqual(payload)
  })

  test('none squares buttons, fields, the switch, the sidebar tabs and popups', async ({ page }) => {
    await saveAppearancePreference(page.request, { options: { enhanced: { radius: 'none' } } })
    await openShowcase(page)
    const track = page.locator(`${NOTIFY_SWITCH_SELECTOR} .checkbox-input__visuals`)

    await expect(page.locator(button).first()).toHaveCSS('border-radius', '0px')
    await expect(page.locator(field).first()).toHaveCSS('border-radius', '0px')
    await expect(track).toHaveCSS('border-radius', '0px')
    expect(
      await computedStyleValue(page, `${NOTIFY_SWITCH_SELECTOR} .checkbox-input__visuals`, 'border-radius', '::before')
    ).toBe('0px')
    await expect(page.locator('.sidebar-tabs__tabs')).toHaveCSS('border-radius', '0px')

    await page.getByRole('button', { name: 'More options' }).first().click()
    await expect(page.locator('.popup__content:visible').first()).toHaveCSS('border-radius', '0px')
  })

  test('full makes buttons, fields, tabs and menus pills without doming collapsibles', async ({ page }) => {
    await saveAppearancePreference(page.request, { options: { enhanced: { radius: 'full' } } })
    await openShowcase(page)

    await expect(page.locator(button).first()).toHaveCSS('border-radius', '18px')
    await expect(page.locator(field).first()).toHaveCSS('border-radius', '18px')
    await expect(page.locator('.sidebar-tabs__tab').first()).toHaveCSS('border-radius', '18px')
    await expect(page.locator('.collapsible__toggle-wrap').first()).toHaveCSS('border-top-left-radius', '18px')

    await page.getByRole('button', { name: 'More options' }).first().click()
    await expect(page.locator('.popup__content:visible').first()).toHaveCSS('border-radius', '22px')
  })

  test("studio's large menus, slash menu and toasts follow their items, not the card tier", async ({ page }) => {
    await saveAppearancePreference(page.request, { character: 'studio' })
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

  test("morphs Studio's user menu into its initial and back without the letter jumping", async ({ page }) => {
    await saveAppearancePreference(page.request, { character: 'studio' })
    const transitions = await recordTransitions(page, ['user-menu__trigger', 'btn__label'])
    await page.goto('/admin')
    await waitForHydration(page)
    await page.addStyleTag({ content: 'html { --payloadpack-motion-panel-duration: 1s !important; }' })
    const morph = () =>
      page.evaluate(async () => {
        const label = document.querySelector<HTMLElement>('.user-menu__trigger .btn__label')!
        const letter = () => {
          const range = document.createRange()
          range.setStart(label.firstChild!, 0)
          range.setEnd(label.firstChild!, 1)
          return range.getBoundingClientRect()
        }
        const blur = () => parseFloat(getComputedStyle(label).filter.replace('blur(', ''))
        const opacity = () => parseFloat(getComputedStyle(label).opacity)
        const boxes = [letter()]
        const blurs = [blur()]
        const opacities = [opacity()]
        document.querySelector<HTMLElement>('.payloadpack-nav-toggle')!.click()
        const end = performance.now() + 1300
        while (performance.now() < end) {
          await new Promise(requestAnimationFrame)
          boxes.push(letter())
          blurs.push(blur())
          opacities.push(opacity())
        }
        return {
          largestStep: Math.max(
            ...boxes
              .slice(1)
              .map(({ x, y }, index) =>
                opacities[index] >= 0.3 && opacities[index + 1] >= 0.3
                  ? Math.max(Math.abs(x - boxes[index].x), Math.abs(y - boxes[index].y))
                  : 0
              )
          ),
          peakBlur: Math.max(...blurs),
          lowestOpacity: Math.min(...opacities),
          settled: { blur: blurs.at(-1), opacity: getComputedStyle(label).opacity }
        }
      })
    const settled = { blur: 0, opacity: '1' }

    const collapse = await morph()
    expect(collapse.largestStep).toBeLessThanOrEqual(1)
    expect(collapse.peakBlur).toBeGreaterThan(1)
    expect(collapse.lowestOpacity).toBeLessThan(0.1)
    expect(collapse.settled).toEqual(settled)
    await expect(page.locator('html')).toHaveAttribute('data-rail', '')
    expect(await transitions()).toEqual(
      expect.arrayContaining([
        'btn__label --payloadpack-avatar',
        'btn__label font-size',
        'btn__label text-transform',
        'user-menu__trigger box-shadow'
      ])
    )
    expect((await page.locator('.user-menu__trigger').boundingBox())?.width).toBe(32)

    const expand = await morph()
    expect(expand.largestStep).toBeLessThanOrEqual(1)
    expect(expand.peakBlur).toBeGreaterThan(1)
    expect(expand.lowestOpacity).toBeLessThan(0.1)
    expect(expand.settled).toEqual(settled)
    await expect(page.locator('html')).not.toHaveAttribute('data-rail')
  })

  for (const [character, besideToggle] of [
    ['studio', 36],
    ['enhanced', -36]
  ] as const) {
    test(`slides ${character}'s Appearance button below the nav toggle and back without jumping`, async ({ page }) => {
      await page.route('**/api/payload-preferences/nav*', (route) =>
        route.request().method() === 'POST' ? route.fulfill({ json: {} }) : route.fallback()
      )
      await saveAppearancePreference(page.request, { character })
      await page.goto('/admin')
      await waitForHydration(page)
      await page.addStyleTag({ content: 'html { --payloadpack-motion-panel-duration: 1s; }' })
      const slide = () =>
        page.evaluate(async () => {
          const toggle = document.querySelector<HTMLElement>('.payloadpack-nav-toggle')!
          const toggleIcon = toggle.querySelector('.sidebar-toggle')!
          const button = document.querySelector('.payloadpack-nav-bar > .payloadpack-appearance-panel--nav')!
          const offsetFrom = (anchor: Element, element: Element) => {
            const [anchorBox, elementBox] = [anchor.getBoundingClientRect(), element.getBoundingClientRect()]
            return { x: elementBox.x - anchorBox.x, y: elementBox.y - anchorBox.y }
          }
          const frames = [{ button: offsetFrom(toggleIcon, button), toggleIcon: offsetFrom(toggle, toggleIcon) }]
          toggle.click()
          const end = performance.now() + 1300
          while (performance.now() < end) {
            await new Promise(requestAnimationFrame)
            frames.push({ button: offsetFrom(toggleIcon, button), toggleIcon: offsetFrom(toggle, toggleIcon) })
          }
          const largestStep = (part: 'button' | 'toggleIcon') =>
            Math.max(
              ...frames
                .slice(1)
                .map((frame, index) =>
                  Math.max(Math.abs(frame[part].x - frames[index][part].x), Math.abs(frame[part].y - frames[index][part].y))
                )
            )
          return { buttonStep: largestStep('button'), settled: frames.at(-1)!.button, toggleIconStep: largestStep('toggleIcon') }
        })

      const collapse = await slide()
      await expect(page.locator('html')).toHaveAttribute('data-rail', '')
      expect(collapse.buttonStep).toBeLessThanOrEqual(6)
      expect(collapse.toggleIconStep).toBe(0)
      expect(collapse.settled).toEqual({ x: 0, y: 36 })

      const expand = await slide()
      await expect(page.locator('html')).not.toHaveAttribute('data-rail')
      expect(expand.buttonStep).toBeLessThanOrEqual(6)
      expect(expand.toggleIconStep).toBe(0)
      expect(expand.settled).toEqual({ x: besideToggle, y: 0 })
    })
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

  test('popups fade in from their trigger at full size and scale out, and select menus scale in', async ({ page }) => {
    const transitions = await recordTransitions(page, menus)
    await openShowcase(page)

    await moreOptions(page).click()
    await expect.poll(transitions).toEqual(['popup__content opacity', 'popup__content translate'])
    const popup = page.locator('.popup__content:popover-open')
    const caret = await popup.evaluate((element) => (element as HTMLElement).style.getPropertyValue('--caret-left'))
    await expect(popup).toHaveCSS('transform-origin', `${caret} 0px`)
    await expect(popup).toHaveCSS('opacity', '1')

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
    await saveAppearancePreference(page.request, { character: 'studio' })
    await page.goto('/admin/collections/showcase')
    await waitForHydration(page)
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))

    expect(await transitions()).toEqual([])
  })

  for (const [name, width, nav, open] of [
    ['on a phone', 768, 'rail', true],
    ['below 1440px with the nav hidden and closed', 1024, 'hidden', false]
  ] as const) {
    test(`loading a page ${name} runs no layout transitions`, async ({ page }) => {
      await page.setViewportSize({ height: 800, width })
      await saveAppearancePreference(page.request, { options: { enhanced: { nav } } })
      await page.request.post('/api/payload-preferences/nav', { data: { value: { open } } })
      const transitions = await recordTransitions(page, ['template-default', 'template-default__wrap', 'nav'])
      await page.goto('/admin')
      await waitForHydration(page)
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))

      expect(await transitions()).toEqual([])
    })
  }

  test('the nav slides open and closed, and the appearance panel slides in', async ({ page }) => {
    const transitions = await recordTransitions(page, ['template-default', 'payloadpack-appearance-panel__sheet'])
    await page.route('**/api/payload-preferences/nav*', (route) =>
      route.request().method() === 'POST' ? route.fulfill({ json: {} }) : route.fallback()
    )
    await saveAppearancePreference(page.request, { options: { enhanced: { nav: 'hidden' } } })
    await page.goto('/admin')

    await page.getByRole('button', { name: 'Hide sidebar' }).click()
    await expect.poll(transitions).toEqual(['template-default grid-template-columns'])

    await page.getByRole('button', { name: 'Appearance' }).click()
    await expect
      .poll(transitions)
      .toEqual(['payloadpack-appearance-panel__sheet translate', 'template-default grid-template-columns'])
  })

  for (const [name, setup] of [
    ['motion is off', (page: Page) => saveAppearancePreference(page.request, { options: { enhanced: { motion: 'off' } } })],
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
    const hidden = page.locator('.popup__hidden-content').first()
    await expect(hidden).toHaveCSS('transition-duration', '0s, 0.1s, 0.1s')
    await expect(hidden).toHaveCSS('transition-delay', '0.1s, 0s, 0s')

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

  test('switching between light and dark changes field, select and button colors at once, and focus still eases the ring', async ({
    page
  }) => {
    const transitions = await recordTransitions(page, ['form-input', 'rs__control', 'btn', 'card'])
    await openShowcase(page)
    const beforeSwitch = await transitions()

    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'light'
    })
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    expect(await transitions()).toEqual(beforeSwitch)

    await page.locator('.field-type.text .form-input').first().focus()
    await expect.poll(transitions).toContain('form-input box-shadow')
  })

  test('every field eases its focus ring with motion on, and none does with it off', async ({ page }) => {
    const fields = [
      '.field-type.text .form-input',
      '.field-type.checkbox:not(.payloadpack-switch) .checkbox-input__visuals',
      '.radio-input__styled-radio',
      `${NOTIFY_SWITCH_SELECTOR} .checkbox-input__visuals`
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

    await saveAppearanceAndReload(page, { options: { enhanced: { motion: 'off' } } })
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
  test('has no blue left in light or dark', async ({ page }) => {
    for (const theme of ['light', 'dark']) {
      await page.context().addCookies([demoCookie('theme', theme)])
      await page.goto('/admin/collections/showcase')

      for (const token of [
        '--color-bg-selected',
        '--color-text-selected',
        '--color-icon-brand',
        '--color-text-brand',
        '--ramp-blue-500'
      ]) {
        const [, chroma] = await colorChannels(page, 'oklch', await computedColor(page, `var(${token})`))
        expect(chroma, `${theme} ${token}`).toBeLessThan(0.02)
      }
      expect(await computedStyleValue(page, '.nav__link--selected', 'color')).toBe(
        await computedStyleValue(page, 'body', 'color')
      )
    }
  })

  test('checked checkboxes fill with the primary and use the Lucide tick', async ({ page }) => {
    await openShowcase(page)
    const featured = page.locator('.field-type.checkbox').filter({ hasText: 'Featured' })
    await featured.getByRole('checkbox').check()
    await page.mouse.move(0, 0)

    await expect(featured.locator('.checkbox-input__visuals')).toHaveCSS(
      'background-color',
      await computedColor(page, 'var(--payloadpack-action-primary)')
    )
    await expect(featured.locator('.checkbox-input__check')).toHaveCSS(
      'background-color',
      await computedColor(page, 'var(--payloadpack-toggle-mark)')
    )
    expect(await computedStyleValue(page, '.field-type.checkbox .checkbox-input__check', 'mask-image')).toContain(
      'data:image/svg+xml'
    )
    expect(await elementSize(page, '.field-type.checkbox .checkbox-input__input')).toEqual({ height: 18, width: 18 })
    expect(await elementSize(page, '.field-type.checkbox .checkbox-input__check')).toEqual({ height: 18, width: 18 })
    await expect(featured.locator('.field-description')).toHaveCSS('padding-left', '26px')

    expect(await verticalCenter(featured.locator('.checkbox-input__input'))).toBe(
      await verticalCenter(featured.locator('.field-label'))
    )
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

    await expect(visuals).toHaveCSS('background-color', await computedColor(page, 'var(--payloadpack-action-primary)'))
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
    await expect(radio('m')).toHaveCSS('background-color', await computedColor(page, 'var(--payloadpack-action-primary)'))
    expect(await radio('m').evaluate((element) => getComputedStyle(element, '::before').backgroundColor)).toBe(
      await computedColor(page, 'var(--payloadpack-toggle-mark)')
    )
    expect(await radio('m').boundingBox()).toMatchObject({ height: 18, width: 18 })

    await page.keyboard.press('ArrowRight')
    await expect(radio('l')).toHaveCSS('box-shadow', /0px 0px 0px 3px/)
    await page.keyboard.press('Shift+Tab')
    await expect(checkbox).toHaveCSS('box-shadow', /0px 0px 0px 3px/)
  })

  test('near-black dark palette, with the nav a step above the page', async ({ page }) => {
    await openShowcase(page)
    const [surface, background] = [
      await computedColor(page, 'var(--payloadpack-bg-surface)'),
      await computedColor(page, 'var(--payloadpack-bg-app)')
    ]
    const [[surfaceLightness], [backgroundLightness]] = [
      await colorChannels(page, 'oklab', surface),
      await colorChannels(page, 'oklab', background)
    ]

    expect(surfaceLightness).toBeLessThan(0.2)
    expect(backgroundLightness).toBeGreaterThan(surfaceLightness)
    await expect(page.locator('html')).toHaveCSS('background-color', surface)
    await expect(page.locator('.nav')).toHaveCSS('background-color', background)
    await expect(page.locator('body')).toHaveCSS('color', await computedColor(page, 'var(--payloadpack-text-primary)'))
    await expect
      .poll(async () =>
        isNearColor(
          page,
          await computedStyleValue(page, '.field-type.text input', 'background-color'),
          await computedColor(page, 'var(--color-bg-elevated)')
        )
      )
      .toBe(true)
    await expect(page.locator('.field-type.text input').first()).toHaveCSS(
      'border-top-color',
      await computedColor(page, 'var(--color-border)')
    )
    expect(
      await isNearColor(
        page,
        await computedColor(page, 'var(--accessibility-focus-color)'),
        await computedColor(page, 'var(--payloadpack-action-primary)')
      )
    ).toBe(true)

    await page.getByRole('button', { name: 'More options' }).first().click()
    const popup = page.locator('.popup__content:visible').first()
    await expect(popup).toHaveCSS('border-radius', '9px')
    expect(await computedStyleValue(page, '.popup__content:popover-open', 'box-shadow')).toContain(
      `${await computedColor(page, 'var(--color-border)')} 0px 0px 0px 1px,`
    )
  })

  test('enhanced contrast reaches radios and secondary text', async ({ page }) => {
    await page.context().addCookies([demoCookie('high-contrast-mode', 'true')])
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
      await waitForAnimations(title)
      await expect(title).toHaveCSS('box-shadow', /0px 0px 0px 3px/)
      return colorChannels(page, 'oklch', await computedStyleValue(page, '#field-title', 'border-top-color'))
    }

    const [dark, darkChroma] = await ring()
    expect(dark).toBeCloseTo(0.55, 2)
    expect(darkChroma).toBeLessThan(0.02)

    await page.context().addCookies([demoCookie('theme', 'light')])
    await page.reload()
    const [light, lightChroma] = await ring()
    expect(light).toBeGreaterThan(dark)
    expect(lightChroma).toBeLessThan(0.02)
  })

  test('toasts match the dropdowns and color only the icon', async ({ page }) => {
    await page.goto('/admin/toasts')
    await page.getByRole('button', { name: 'Error', exact: true }).click()
    const error = page.locator('.payload-toast-item[data-type="error"]')

    await expect(error).toHaveCSS('background-color', await computedColor(page, 'var(--payloadpack-bg-surface)'))
    await expect(error).toHaveCSS('border-radius', '9px')
    await expect(error.locator('.payload-toast-close-button')).toHaveCSS(
      'color',
      await computedColor(page, 'var(--payloadpack-text-primary)')
    )
    const lightTint = await computedColor(page, await computedStyleValue(page, '.toast-error', '--payloadpack-toast-icon'))
    await expect(error.locator('.toast-icon .icon')).toHaveCSS('color', lightTint)
    expect(await computedStyleValue(page, '.toast-error .toast-icon svg', '--payloadpack-icon')).toContain('octagon-x')

    await page.getByRole('button', { name: 'With action' }).click()
    await expect(page.locator('.payload-toast-item [data-button]')).toHaveCSS('height', '24px')

    await page.context().addCookies([demoCookie('theme', 'dark')])
    await page.reload()
    await page.getByRole('button', { name: 'Success', exact: true }).click()
    const success = page.locator('.payload-toast-item[data-type="success"]')

    await expect(page.locator('.toast-success')).toHaveCSS(
      'background-color',
      await computedColor(page, 'var(--color-bg-elevated)')
    )
    const darkTint = await computedColor(page, await computedStyleValue(page, '.toast-success', '--payloadpack-toast-icon'))
    await expect(success.locator('.toast-icon .icon')).toHaveCSS('color', darkTint)
    expect(darkTint).not.toBe(lightTint)
  })
})

test.describe('Every palette but Payload', () => {
  for (const palette of ['neutral', 'warm', 'soft'] satisfies NonNullable<ThemePluginConfig['palette']>[]) {
    test.describe(palette, () => {
      test.beforeEach(({ page }) => saveAppearancePreference(page.request, { palette }))

      for (const theme of ['light', 'dark']) {
        test(`menu items light up neutral and visible against the menu, icon and background at once, in ${theme} mode`, async ({
          page
        }) => {
          await page.context().addCookies([demoCookie('theme', theme)])
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
            await colorChannels(page, 'oklch', colors.hovered),
            await colorChannels(page, 'oklch', colors.menu)
          ]

          expect(Math.abs(hoveredLightness - menuLightness)).toBeGreaterThan(0.04)
          expect(hoveredChroma).toBeLessThan(0.02)
          expect(colors.color).toBe(colors.text)
          expect(colors.icon).toBe('1')
        })

        test(`a field error draws its border, tooltip and caret in one red with readable text, in ${theme} mode`, async ({
          page
        }) => {
          await page.context().addCookies([demoCookie('theme', theme)])
          const { path } = await findShowcase(page)
          await page.goto(path)
          await waitForHydration(page)
          await Promise.all([
            page.waitForResponse(
              (response) => new URL(response.url()).pathname === path && response.request().method() === 'POST'
            ),
            page.locator('#field-title').fill('')
          ])
          await page.getByRole('button', { name: 'Publish changes' }).click()
          const tooltip = page.locator('.field-error.tooltip')
          await expect(tooltip).toBeVisible()

          const border = await computedStyleValue(page, '#field-title', 'border-top-color')
          await expect(tooltip).toHaveCSS('background-color', border)
          await expect(tooltip.locator('.tooltip__caret-fill')).toHaveCSS('fill', border)
          const textContrast = await tooltip.evaluate((element) => {
            const context = document.createElement('canvas').getContext('2d')!
            const paint = (color: string) => {
              context.fillStyle = color
              context.fillRect(0, 0, 1, 1)
              return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)]
            }
            const luminance = (rgb: number[]) =>
              rgb
                .map((channel) => channel / 255)
                .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
                .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
            const style = getComputedStyle(element)
            const [text, ground] = [luminance(paint(style.color)), luminance(paint(style.backgroundColor))]
            return (Math.max(text, ground) + 0.05) / (Math.min(text, ground) + 0.05)
          })
          expect(textContrast).toBeGreaterThanOrEqual(4.5)

          if (palette === 'soft') {
            await expect(page.locator('.field-type.text').filter({ hasText: 'Title' }).locator('.required')).toHaveCSS(
              'color',
              theme === 'dark' ? 'rgb(243, 97, 87)' : 'rgb(224, 55, 58)'
            )
          }
        })
      }

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

      test('dark tabs and segments set the active one clearly apart from its track', async ({ page }) => {
        await page.context().addCookies([demoCookie('theme', 'dark')])
        await page.goto('/admin/collections/showcase')
        await waitForHydration(page)
        const lightness = async (selector: string) =>
          (await colorChannels(page, 'oklab', await computedStyleValue(page, selector, 'background-color')))[0]

        expect((await lightness('.sidebar-tabs__tabs')) - (await lightness('.sidebar-tabs__tab--active'))).toBeGreaterThan(0.05)

        await openAppearancePanel(page)
        expect(
          (await lightness('.payloadpack-appearance-panel__segments')) -
            (await lightness('.payloadpack-appearance-panel__segments label:has(:checked)'))
        ).toBeGreaterThan(0.05)
      })
    })
  }
})

test.describe('Raised nav pill', () => {
  for (const palette of ['neutral', 'warm'] satisfies NonNullable<ThemePluginConfig['palette']>[]) {
    test.describe(palette, () => {
      test.beforeEach(({ page }) => saveAppearancePreference(page.request, { palette }))

      test('the selected nav link is a white pill lifted by a shadow, and the other links are muted', async ({ page }) => {
        await page.context().addCookies([demoCookie('theme', 'light')])
        await page.goto('/admin/collections/showcase')
        await waitForHydration(page)

        expect(await computedStyleValue(page, '.nav__link--selected', 'background-color', '::before')).toBe(
          await computedColor(page, 'var(--color-bg-elevated)')
        )
        expect(await computedStyleValue(page, '.nav__link--selected', 'box-shadow', '::before')).not.toBe('none')
        expect(await computedStyleValue(page, '.nav__link:not(.nav__link--selected)', 'color')).toBe(
          await computedColor(page, 'var(--color-text-secondary)')
        )
      })

      test('the dark selected nav link steps clearly above the nav', async ({ page }) => {
        await page.context().addCookies([demoCookie('theme', 'dark')])
        await page.goto('/admin/collections/showcase')
        await waitForHydration(page)
        const lightness = async (selector: string, pseudo?: string) =>
          (await colorChannels(page, 'oklab', await computedStyleValue(page, selector, 'background-color', pseudo)))[0]

        expect((await lightness('.nav__link--selected', '::before')) - (await lightness('.nav'))).toBeGreaterThan(0.08)
      })
    })
  }
})

test.describe('Payload palette', () => {
  test("Payload keeps Payload's own backgrounds and blue", async ({ page }) => {
    await saveAppearancePreference(page.request, { character: 'payload', palette: 'payload' })
    await openShowcase(page)

    await expect(page.locator('html')).toHaveAttribute('data-palette', 'payload')
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(44, 44, 44)')
    await expect(page.locator('.nav')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    expect(await computedStyleValue(page, 'html', '--ramp-blue-400')).toBe('#80caff')

    await page.context().addCookies([demoCookie('theme', 'light')])
    await page.reload()
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  })

  test("Payload applies no theme stylesheet to Payload's own elements, apart from room for the nav's Appearance button", async ({
    page
  }) => {
    await saveAppearancePreference(page.request, { character: 'payload', palette: 'payload' })
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
      const elementSelector = (selector: string) => selector.replace(/(^|[\s>+~(,])::[\w-]+/g, '$1*').replace(/::[\w-]+/g, '')
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
    expect(
      applied.filter(
        (selector) => !ownClasses.some((scope) => selector.startsWith(scope)) && !/\.payloadpack-[\w-]+$/.test(selector)
      )
    ).toEqual([expect.stringMatching(/\.nav__header \.user-menu$/)])
  })
})

test.describe('App palettes', () => {
  test("offers the app's own palette under its label, drawn from the app's CSS in both modes", async ({ page }) => {
    await page.context().addCookies([demoCookie('theme', 'light')])
    await page.goto('/admin/collections/showcase')
    const sheet = await openAppearancePanel(page)

    await clickAndWaitForSave(page, radioLabel(radioInGroup(sheet, 'Palette', 'Indigo')))
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'indigo')
    expect(rgbToHex(await computedColor(page, 'var(--color-bg-brand)'))).toBe('#4f46e5')
    expect(rgbToHex(await computedColor(page, 'var(--color-bg-brand)', 'dark'))).toBe('#818cf8')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'indigo')
  })
})

test.describe('Floating surfaces', () => {
  const edge = (surface: Locator) =>
    surface.evaluate((element) => {
      const context = document.createElement('canvas').getContext('2d')!
      const paint = (...colors: string[]) => {
        for (const color of colors) {
          context.fillStyle = color
          context.fillRect(0, 0, 1, 1)
        }
        return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)]
      }
      const luminance = (rgb: number[]) =>
        rgb
          .map((channel) => channel / 255)
          .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
          .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
      const style = getComputedStyle(element)
      const ring = style.boxShadow.match(/^([a-z]+\([^)]*\)) 0px 0px 0px ([\d.]+)px/)
      if (!ring) {
        return { border: style.borderTopWidth, contrast: 1 }
      }
      const [line, fill] = [luminance(paint(style.backgroundColor, ring[1])), luminance(paint(style.backgroundColor))]
      return { border: style.borderTopWidth, contrast: (Math.max(line, fill) + 0.05) / (Math.min(line, fill) + 0.05) }
    })

  const outlined = async (surface: Locator, name: string) => {
    const { border, contrast } = await edge(surface)
    expect(border, `${name} border`).toBe('0px')
    expect(contrast, `${name} ring`).toBeGreaterThan(1.1)
  }

  for (const palette of ['neutral', 'warm', 'soft'] as const) {
    for (const theme of ['light', 'dark'] as const) {
      test(`edges toasts, menus, select lists and the date picker with one 1px ring on ${palette} in ${theme} mode`, async ({
        page
      }) => {
        await saveAppearancePreference(page.request, { character: 'studio', palette })
        await page.context().addCookies([demoCookie('theme', theme)])
        await page.goto('/admin/toasts')
        await page.getByRole('button', { name: 'Success' }).click()
        await outlined(page.locator('.payload-toast-item').first(), 'toast')

        await page.goto((await findShowcase(page)).path)
        await page.getByRole('button', { name: 'More options' }).first().click()
        await outlined(page.locator('.popup__content'), 'menu')
        await page.keyboard.press('Escape')

        await page.locator('.field-type.select .rs__control').first().click()
        await outlined(page.locator('.rs__menu'), 'select list')
        await page.keyboard.press('Escape')

        await page.locator('.react-datepicker__input-container input').first().click()
        await outlined(page.locator('.react-datepicker'), 'date picker')
      })
    }
  }
})

test.describe('Custom palette', () => {
  const field = (sheet: Locator, half: string, name: string) => sheet.getByLabel(`${name}, ${half}`, { exact: true })
  const accent = (sheet: Locator) => sheet.getByLabel('Accent, Both modes', { exact: true })
  const saveCustom = async (
    page: Page,
    accent: string,
    { primary, theme = 'light' }: { primary?: string; theme?: string } = {}
  ) => {
    await page.context().addCookies([demoCookie('theme', theme)])
    await saveAppearancePreference(page.request, { custom: buildCustomPalette(accent, primary), palette: 'custom' })
  }

  test('lays the palettes out three per row and ends them with a dashed Custom tile', async ({ page }) => {
    await page.goto('/admin/collections/showcase')
    const sheet = await openAppearancePanel(page)
    const grid = sheet.locator('.payloadpack-appearance-panel__cards:has(.payloadpack-appearance-panel__add)')
    const tile = grid.getByRole('button', { name: 'Custom colors' })

    await expect(grid).toHaveCSS('grid-template-columns', /^[\d.]+px [\d.]+px [\d.]+px$/)
    await expect(sheet.getByRole('radiogroup', { name: 'Palette' }).getByRole('button')).toHaveCount(0)
    await expect(tile).toHaveCSS('border-top-style', 'dashed')
    await expect(tile).toHaveText('Custom')
    const [card, add] = [await grid.locator('label').first().boundingBox(), await tile.boundingBox()]
    expect(add!.y).toBeGreaterThan(card!.y + card!.height)
    expect(add!.height).toBe(card!.height)
  })

  test('Custom colors start from the current palette, apply each color at once and keep it through a reload', async ({
    page
  }) => {
    await page.context().addCookies([demoCookie('theme', 'light')])
    await page.goto('/admin/collections/showcase')
    const html = page.locator('html')
    const header = page.locator('.nav__header')
    const sheet = await openAppearancePanel(page)
    const neutral = async (token: string, theme?: string) => rgbToHex(await computedColor(page, `var(${token})`, theme))
    const expected = {
      accent: await neutral('--payloadpack-accent'),
      darkBackground: await neutral('--payloadpack-bg-app', 'dark'),
      darkPrimary: await neutral('--payloadpack-action-primary', 'dark'),
      darkText: await neutral('--payloadpack-text-primary', 'dark'),
      lightBackground: await neutral('--payloadpack-bg-app'),
      lightPrimary: await neutral('--payloadpack-action-primary')
    }

    await clickAndWaitForSave(page, sheet.getByRole('button', { name: 'Custom colors' }))
    await expect(html).toHaveAttribute('data-palette', 'custom')
    await expect(radioInGroup(sheet, 'Palette', 'Custom')).toBeChecked()
    await expect(field(sheet, 'Light', 'Background')).toHaveValue(expected.lightBackground)
    await expect(field(sheet, 'Light', 'Primary')).toHaveValue(expected.lightPrimary)
    await expect(field(sheet, 'Dark', 'Primary')).toHaveValue(expected.darkPrimary)
    await expect(field(sheet, 'Dark', 'Background')).toHaveValue(expected.darkBackground)
    await expect(field(sheet, 'Dark', 'Text')).toHaveValue(expected.darkText)
    await expect(accent(sheet)).toHaveValue(expected.accent)
    const secondaryContrast = await page.evaluate(() => {
      const context = document.createElement('canvas').getContext('2d')!
      const paint = (...colors: string[]) => {
        for (const color of colors) {
          context.fillStyle = color
          context.fillRect(0, 0, 1, 1)
        }
        return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)]
      }
      const luminance = (rgb: number[]) =>
        rgb
          .map((channel) => channel / 255)
          .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
          .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
      const background = getComputedStyle(document.querySelector('.nav')!).backgroundColor
      const link = getComputedStyle(document.querySelector('.nav__link:not(.nav__link--selected)')!).color
      const [text, ground] = [luminance(paint(background, link)), luminance(paint(background))]
      return (Math.max(text, ground) + 0.05) / (Math.min(text, ground) + 0.05)
    })
    expect(secondaryContrast).toBeGreaterThanOrEqual(4.5)

    await Promise.all([waitForAppearanceSave(page), field(sheet, 'Light', 'Background').fill('#eae6df')])
    await expect(header).toHaveCSS('background-color', 'rgb(234, 230, 223)')
    await page.reload()
    await expect(header).toHaveCSS('background-color', 'rgb(234, 230, 223)')
  })

  test('keeps focus in a hex field after Enter, and saves nothing for a field left as it was or mistyped', async ({ page }) => {
    await saveCustom(page, '#c2410c')
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    const hex = sheet.getByLabel('Background, Light hex', { exact: true })
    const saves: string[] = []
    page.on('request', (request) => {
      if (request.url().endsWith('/api/payload-preferences/payloadpack-appearance') && request.method() === 'POST') {
        saves.push(request.url())
      }
    })

    await hex.focus()
    await page.keyboard.press('Tab')
    await page.waitForLoadState('networkidle')
    expect(saves).toHaveLength(0)

    await hex.fill('112233')
    await Promise.all([waitForAppearanceSave(page), hex.press('Enter')])
    await expect(hex).toBeFocused()
    await expect(hex).toHaveValue('#112233')
    await expect(page.locator('.nav__header')).toHaveCSS('background-color', 'rgb(17, 34, 51)')

    await hex.fill('nope')
    await hex.press('Enter')
    await expect(hex).toHaveValue('#112233')
    await page.waitForLoadState('networkidle')
    expect(saves).toHaveLength(1)
  })

  test('saves a dragged color once, when the picker commits', async ({ page }) => {
    await saveCustom(page, '#c2410c')
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    const saves: string[] = []
    page.on('request', (request) => {
      if (request.url().endsWith('/api/payload-preferences/payloadpack-appearance') && request.method() === 'POST') {
        saves.push(request.url())
      }
    })

    const background = field(sheet, 'Light', 'Background')
    await background.evaluate((input: HTMLInputElement) => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      for (const value of ['#101010', '#202020', '#303030']) {
        setValue.call(input, value)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })

    await expect(page.locator('.nav__header')).toHaveCSS('background-color', 'rgb(48, 48, 48)')

    await background.evaluate((input: HTMLInputElement) => input.dispatchEvent(new Event('change', { bubbles: true })))
    await expect.poll(() => saves.length).toBe(1)
    await page.waitForLoadState('networkidle')
    expect(saves).toHaveLength(1)
  })

  test("pasting a setup keeps your own palette and your other styles' options", async ({ context, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await saveAppearancePreference(page.request, {
      character: 'studio',
      custom: buildCustomPalette('#be185d'),
      options: { studio: { font: 'inter' } },
      palette: 'neutral'
    })
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)

    await page.evaluate(() => navigator.clipboard.writeText(JSON.stringify({ character: 'enhanced', palette: 'warm' })))
    await (await openShareMenuItem(sheet, 'Paste setup')).click()
    await expect(page.locator('html')).toHaveAttribute('data-character', 'enhanced')
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'warm')
    await expect(radioInGroup(sheet, 'Palette', 'Custom')).toBeAttached()

    await radioLabel(radioInGroup(sheet, 'Style', 'Studio')).click()
    await expect(page.locator('html')).toHaveAttribute('data-font', 'inter')
  })

  test('lines the Share menu up with its button, and docks the sheet on the inline end in right-to-left layouts', async ({
    page
  }) => {
    await page.goto('/admin')
    const ltrSheet = await openAppearancePanel(page)
    await ltrSheet.getByRole('button', { name: 'Share setup' }).click()
    const start = async (selector: string) => Math.round((await page.locator(selector).boundingBox())!.x)
    await expect
      .poll(() => start('.payloadpack-appearance-panel__menu'))
      .toBe(await start('.payloadpack-appearance-panel__share'))

    await page.reload()
    await page.evaluate(() => (document.documentElement.dir = 'rtl'))
    const sheet = await openAppearancePanel(page)
    await expect.poll(async () => (await page.locator('.payloadpack-appearance-panel__sheet').boundingBox())?.x).toBe(0)

    await sheet.getByRole('button', { name: 'Share setup' }).click()
    const edge = async (selector: string) => {
      const box = (await page.locator(selector).boundingBox())!
      return Math.round(box.x + box.width)
    }
    await expect.poll(() => edge('.payloadpack-appearance-panel__menu')).toBe(await edge('.payloadpack-appearance-panel__share'))
  })

  test('keeps the focus in the panel after Remove custom colors, Reset and Undo', async ({ page }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    await sheet.getByRole('button', { name: 'Custom colors' }).click()
    await sheet.getByRole('button', { name: 'Remove custom colors' }).click()
    await expect(sheet.getByRole('button', { name: 'Custom colors' })).toBeFocused()

    await openFineTune(sheet)
    await radioLabel(radioInGroup(sheet, 'Density', 'Compact')).click()
    await sheet.getByRole('button', { name: 'Reset Enhanced' }).click()
    const undo = sheet.getByRole('button', { name: 'Undo' })
    await expect(undo).toBeFocused()
    await undo.click()
    await expect(sheet.locator('summary')).toBeFocused()
  })

  test('keeps the focus in the palettes when the arrow keys come back to Custom', async ({ page }) => {
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)
    await sheet.getByRole('button', { name: 'Custom colors' }).click()
    const mine = radioInGroup(sheet, 'Palette', 'Custom')

    await mine.focus()
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowRight')
    await expect(mine).toBeChecked()
    await expect(mine).toBeFocused()
  })

  test('stays in the setup while another palette is picked', async ({ page }) => {
    await saveCustom(page, '#c2410c')
    await page.goto('/admin')
    const sheet = await openAppearancePanel(page)

    await radioLabel(radioInGroup(sheet, 'Palette', 'Neutral')).click()
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'neutral')
    await expect(sheet.getByRole('button', { name: 'Custom colors' })).toHaveCount(0)
    await radioLabel(radioInGroup(sheet, 'Palette', 'Custom')).click()
    await expect(accent(sheet)).toHaveValue('#c2410c')
  })

  test('Copy as CSS copies the same block the page renders', async ({ context, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await saveCustom(page, '#c2410c')
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
    await saveCustom(page, '#c2410c', { primary: '#2563eb' })
    await page.goto('/admin/collections/showcase')
    const primary = page.locator('.btn--style-primary:visible').first()

    for (const theme of ['light', 'dark']) {
      await page.context().addCookies([demoCookie('theme', theme)])
      await page.reload()
      await expect(primary).toHaveCSS('background-color', 'rgb(37, 99, 235)')
      expect(await computedColor(page, 'var(--payloadpack-toggle-checked-bg)')).toBe('rgb(37, 99, 235)')
      expect(await computedColor(page, 'var(--ramp-blue-500)')).toBe('rgb(194, 65, 12)')
    }
  })

  test('text on the primary stays readable, dark on a light primary and white on a dark one', async ({ page }) => {
    const primary = page.locator('.btn--style-primary:visible').first()

    await saveCustom(page, '#c2410c', { primary: '#ffffff' })
    await page.goto('/admin/collections/showcase')
    await expect(primary).toHaveCSS('color', 'oklch(0 0 0)')

    await saveAppearanceAndReload(page, { custom: buildCustomPalette('#ffffff', '#c2410c'), palette: 'custom' })
    await expect(primary).toHaveCSS('color', 'oklch(1 0 0)')
  })

  test('selection stays neutral whatever the accent, a grey fill under the text color, in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark']) {
      await saveCustom(page, '#c2410c', { theme })
      await page.goto('/admin/collections/showcase')
      const text = await computedStyleValue(page, 'body', 'color')

      expect(await computedColor(page, 'var(--color-bg-selected)'), theme).toBe(
        await computedColor(page, 'var(--color-bg-tertiary)')
      )
      expect(await computedColor(page, 'var(--color-text-selected)'), theme).toBe(text)
      expect(await computedColor(page, 'var(--color-icon-selected)'), theme).toBe(await computedColor(page, 'var(--color-icon)'))
    }
  })

  test('solid selections take the primary, and an open submenu looks like a hovered menu item', async ({ page }) => {
    await saveCustom(page, '#c2410c', { primary: '#2563eb' })
    await page.goto('/admin/collections/showcase')
    await waitForHydration(page)
    const background = (locator: Locator) => locator.evaluate((element) => getComputedStyle(element).backgroundColor)

    expect(await computedColor(page, 'var(--color-bg-selected-strong)')).toBe('rgb(37, 99, 235)')

    await page.locator('.user-menu__trigger').click()
    const submenu = page.locator('.popup-button-list__submenu-trigger')
    await submenu.hover()
    await page.locator('.popup-button-list__button', { hasText: 'Dark' }).hover()
    await waitForAnimations(submenu)
    const open = await background(submenu)
    const logOut = page.locator('.popup-button-list__button', { hasText: 'Log out' })
    await logOut.hover()
    await waitForAnimations(logOut)

    expect(await background(logOut)).toBe(open)
  })

  test('the active tab bar takes the primary, not the accent', async ({ page }) => {
    await saveCustom(page, '#c2410c', { primary: '#1d4ed8' })
    await page.goto((await findShowcase(page)).path)
    await waitForHydration(page)
    const bar = await page
      .locator('.tabs__tab-button--active')
      .first()
      .evaluate((element) => getComputedStyle(element, '::after').backgroundColor)

    expect(await isNearColor(page, bar, '#1d4ed8')).toBe(true)
  })

  test('a white primary keeps its button edge in light mode', async ({ page }) => {
    await saveCustom(page, '#c2410c', { primary: '#ffffff' })
    await page.goto('/admin/collections/showcase')

    await expect
      .poll(
        async () =>
          (
            await colorChannels(page, 'oklab', await computedStyleValue(page, '.btn--style-primary:visible', 'border-top-color'))
          )[3]
      )
      .toBeGreaterThan(0)
  })
})

test.describe('Rail', () => {
  const collapsed = demoCookie('nav-rail', 'true')
  const navWidth = (page: Page) => page.locator('.nav').evaluate((nav) => nav.getBoundingClientRect().width)
  const afterNextFrame = (page: Page) =>
    page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))

  test.beforeEach(({ page }) =>
    page.route('**/api/payload-preferences/nav*', (route) =>
      route.request().method() === 'POST' ? route.fulfill({ json: {} }) : route.fallback()
    )
  )

  for (const icons of ['payload', 'lucide'] as const) {
    test(`with ${icons} icons, closing to the rail fades the icons in without moving the labels`, async ({ page }) => {
      await saveAppearancePreference(page.request, { options: { enhanced: { icons } } })
      await page.goto('/admin')
      await waitForHydration(page)
      const link = page.locator('.nav__link').first()
      const labelOffset = () =>
        link.evaluate((element) =>
          Math.round(
            element.querySelector('.nav__link-label')!.getBoundingClientRect().left -
              element.getBoundingClientRect().left -
              parseFloat(getComputedStyle(element).paddingInlineStart)
          )
        )
      const openLabelOffset = await labelOffset()

      await page.getByRole('button', { name: 'Hide sidebar' }).click()
      await expect(page.locator('html')).toHaveAttribute('data-rail', '')
      await page.evaluate(() =>
        document.getAnimations().forEach((animation) => {
          animation.pause()
          animation.currentTime = 100
        })
      )
      expect(await labelOffset()).toBeCloseTo(openLabelOffset, 0)
    })
  }

  test('collapses the nav into a 56px rail of Lucide icons without labels', async ({ page }) => {
    await saveAppearancePreference(page.request, { options: { enhanced: { icons: 'payload' } } })
    await page.goto('/admin')
    await page.getByRole('button', { name: 'Hide sidebar' }).click()

    await expect(page.getByRole('button', { name: 'Show sidebar' })).toHaveAttribute('aria-expanded', 'false')
    await expect.poll(() => navWidth(page)).toBe(56)
    await expect(page.locator('.nav-group__toggle').first()).toBeHidden()
    await expect(page.locator('.nav__header .user-menu')).toBeHidden()
    for (const link of await page.locator('.nav__link').all()) {
      expect(await link.evaluate((element) => getComputedStyle(element, '::after').maskImage)).toContain('data:image/svg+xml')
      await expect(link.locator('.nav__link-label')).toHaveCSS('opacity', '0')
    }
  })

  test('keeps the hidden tab track at full width while the nav closes, so it never overflows', async ({ page }) => {
    await page.goto('/admin')
    await waitForHydration(page)
    const track = page.locator('.sidebar-tabs__tabs')
    const open = await track.evaluate((element) => element.getBoundingClientRect().width)

    const closing = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          document.querySelector<HTMLElement>('.payloadpack-nav-toggle')!.click()
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
    await expect.poll(() => navWidth(page)).toBe(56)

    const scroller = page.locator('.nav__scroll')
    const box = (await scroller.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + 200)
    await page.mouse.wheel(200, 0)
    await afterNextFrame(page)
    expect(await scroller.evaluate((element) => element.scrollLeft)).toBe(0)
  })

  test('switches to the first sidebar tab when the nav closes', async ({ page }) => {
    await page.goto('/admin')
    await page.getByRole('tab').nth(1).click()
    await page.getByRole('button', { name: 'Hide sidebar' }).click()

    await expect(page.locator('.sidebar-tabs__tab').first()).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tablist')).toBeHidden()
    await expect(page.locator('#nav-showcase')).toBeVisible()
  })

  test('hides the sidebar tabs, and shows them only to switch back from another tab', async ({ page }) => {
    await page.goto('/admin')
    await page.getByRole('button', { name: 'Hide sidebar' }).click()
    await expect(page.getByRole('tablist')).toBeHidden()
    await page
      .locator('.sidebar-tabs__tab')
      .nth(1)
      .evaluate((tab: HTMLElement) => tab.click())

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

    await page.route(NEXT_SCRIPTS_GLOB, (route) => route.abort())
    await page.reload()
    expect(await navWidth(page)).toBe(56)

    await page.unroute(NEXT_SCRIPTS_GLOB)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Show sidebar' })).toBeVisible()
    expect(await navWidth(page)).toBe(56)
  })

  for (const palette of ['payload', 'neutral', 'warm', 'soft'] as const) {
    test(`draws every rail icon at 3:1 or more against the nav on ${palette}, in light and dark`, async ({ page }) => {
      for (const theme of ['light', 'dark']) {
        await saveAppearancePreference(page.request, { palette })
        await page.context().addCookies([demoCookie('theme', theme), collapsed])
        await page.goto('/admin')
        await waitForHydration(page)
        const contrast = await page
          .locator('.nav__link:not(.nav__link--selected)')
          .first()
          .evaluate((link) => {
            const context = document.createElement('canvas').getContext('2d')!
            const paint = (color: string, alpha = 1) => {
              context.globalAlpha = alpha
              context.fillStyle = color
              context.fillRect(0, 0, 1, 1)
              return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)]
            }
            const luminance = (rgb: number[]) =>
              rgb
                .map((channel) => channel / 255)
                .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
                .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
            paint(getComputedStyle(document.documentElement).backgroundColor)
            const ground = luminance(paint(getComputedStyle(document.querySelector('.nav')!).backgroundColor))
            const icon = getComputedStyle(link, '::after')
            const ink = luminance(paint(icon.backgroundColor, Number(icon.opacity)))
            return (Math.max(ink, ground) + 0.05) / (Math.min(ink, ground) + 0.05)
          })
        expect(contrast, theme).toBeGreaterThanOrEqual(3)
      }
    })
  }

  test('reaches the toggle and the rail icons by keyboard, with a tooltip on focus', async ({ page }) => {
    await page.context().addCookies([collapsed])
    await page.goto('/admin')
    await page.getByRole('button', { name: 'Show sidebar' }).focus()
    await expect(page.locator('.payloadpack-nav-toggle .sidebar-toggle')).toHaveCSS('outline-style', 'solid')
    await expect(page.locator('.payloadpack-nav-toggle .sidebar-toggle')).toHaveCSS('outline-width', '2px')

    const showcase = page.locator('#nav-showcase')
    await page.locator('#nav-users').focus()
    await page.keyboard.press('Tab')
    await expect(showcase).toBeFocused()
    expect(await showcase.evaluate((link) => getComputedStyle(link, '::before').outlineStyle)).toBe('solid')

    const label = showcase.locator('.nav__link-label')
    await expect(label).toHaveCSS('opacity', '1')
    const [link, tooltip] = await Promise.all([showcase.boundingBox(), label.boundingBox()])
    expect(tooltip!.x).toBeGreaterThanOrEqual(link!.x + link!.width)
    expect(await verticalCenter(label)).toBeCloseTo(await verticalCenter(showcase), 0)

    await page.addStyleTag({ content: '.nav__link-label { pointer-events: auto; }' })
    await waitForAnimations(label)
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
    await waitForAnimations(label)
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
    await expect.poll(() => navWidth(page)).toBe(56)

    const group = page.getByRole('button', { name: 'Previews' })
    await group.hover()
    await expect(group.locator('.nav-group__indicator')).toHaveCSS('opacity', '1')
    await expect(group.locator('.nav-group__label')).toHaveCSS('opacity', '1')

    await group.click()
    await expect(page.getByRole('link', { name: 'Toasts' })).toBeVisible()
    await expect(group).toBeHidden()
  })

  test("nav: 'hidden' closes the nav from the bar the way Payload's own button does", async ({ page }) => {
    await saveAppearancePreference(page.request, { options: { enhanced: { nav: 'hidden' } } })
    await page.context().addCookies([collapsed])
    await page.goto('/admin')

    await expect(page.locator('html')).not.toHaveAttribute('data-rail')
    await expect(page.locator('.nav__close')).toBeHidden()
    await page.locator('.payloadpack-nav-toggle').click()
    await expect(page.locator('.nav')).toHaveAttribute('inert', '')
    await expect(page.locator('.app-header__sidebar-toggle')).toBeFocused()
    await expect.poll(async () => (await page.locator('.template-default__wrap').boundingBox())?.x).toBe(0)
  })

  for (const { closes, name, nav } of [
    { closes: false, name: "keeps Payload's nav open", nav: 'rail' },
    { closes: true, name: 'lets Payload close the nav', nav: 'hidden' }
  ] as const) {
    test(`nav: '${nav}' ${name} when the window shrinks past 1440px`, async ({ page }) => {
      await saveAppearancePreference(page.request, { options: { enhanced: { nav } } })
      // Payload's load-time nav preference read can land after the resize and reopen the nav, so it never answers here
      await page.route('**/api/payload-preferences/nav', async (route) => {
        if (route.request().method() !== 'GET') {
          await route.fallback()
        }
      })
      await page.setViewportSize({ height: 900, width: 1500 })
      await page.goto('/admin')
      await waitForHydration(page)
      await expect(page.locator('.nav')).not.toHaveAttribute('inert')

      await page.setViewportSize({ height: 900, width: 1300 })
      await expect.poll(() => computedStyleValue(page, 'html', '--vw')).toBe('13px')
      await afterNextFrame(page)
      await expect(page.locator('.nav')).toHaveJSProperty('inert', closes)
    })
  }

  test("at 768px wide the nav is Payload's drawer", async ({ page }) => {
    await page.context().addCookies([collapsed])
    await page.setViewportSize({ height: 900, width: 768 })
    await page.goto('/admin')

    await expect(page.locator('.payloadpack-nav-toggle')).toBeHidden()
    await page.locator('.app-header__sidebar-toggle').click()
    expect(await navWidth(page)).toBe(768)
    await expect(page.locator('.nav__close')).toBeVisible()
    await expect(page.locator('#nav-showcase .nav__link-label')).toHaveCSS('opacity', '1')
  })
})

test.describe('Studio character', () => {
  const studio = (options: object = {}) => ({ character: 'studio', options: { studio: options } })

  const openList = async (page: Page) => {
    await page.goto('/admin/collections/showcase')
    await waitForHydration(page)
  }

  test('renders its attributes and puts each view in a card on the field', async ({ page }) => {
    await saveAppearancePreference(page.request, studio())
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
    await expect(card).toHaveCSS('border-top-width', '0px')
    await expect(card).toHaveCSS('box-shadow', /0px 0px 0px 0\.5px/)
    await expect(card).toHaveCSS('border-radius', '20px')
    await expect(card).toHaveCSS('overflow', 'clip')
    await expect(card).toHaveCSS('margin', '6px 6px 6px 0px')
    await expect(page.locator('.nav')).toHaveCSS('border-right-width', '0px')
  })

  test('collapses into a rail beside the card, keeping the toggle in its row at the top', async ({ editor, page }) => {
    await saveAppearancePreference(page.request, studio())
    await openList(page)
    const toggle = page.locator('.payloadpack-nav-toggle')
    const open = (await toggle.boundingBox())!
    expect((await page.locator('.sidebar-tabs__tabs').boundingBox())!.y - (open.y + open.height)).toBe(12)
    await page.getByRole('button', { name: 'Hide sidebar' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-rail', '')
    await waitForAnimations(page.locator('.template-default'))
    await waitForAnimations(page.locator('.nav'))
    const toggleRow = (await page.locator('.payloadpack-nav-bar').boundingBox())!
    expect((await page.locator('.nav__link').first().boundingBox())!.y).toBeGreaterThanOrEqual(toggleRow.y + toggleRow.height)

    const [nav, card, rail] = await Promise.all(
      ['.nav', '.template-default__wrap', '.payloadpack-nav-toggle'].map(
        async (selector) => (await page.locator(selector).boundingBox())!
      )
    )
    expect(nav.width).toBe(56)
    expect(card.x).toBe(57)
    expect(await page.evaluate(() => document.elementFromPoint(56.5, 400)?.closest('.nav'))).toBeNull()
    expect(open.x + open.width / 2).toBe(28)
    expect(rail.x + rail.width / 2).toBe(28)
    expect(rail.y).toBe(open.y)
    expect((await page.locator('#nav-showcase').boundingBox())!.y).toBeGreaterThan(rail.y + rail.height)
    const avatar = page.locator('.user-menu__trigger')
    const circle = (await avatar.boundingBox())!
    expect(circle).toMatchObject({ height: 32, width: 32 })
    expect(circle.x + circle.width / 2).toBe(28)
    const letter = await avatar.locator('.btn__label').evaluate((element) => {
      const range = document.createRange()
      range.setStart(element.firstChild!, 0)
      range.setEnd(element.firstChild!, 1)
      const { height, width, x, y } = range.getBoundingClientRect()
      return { x: x + width / 2, y: y + height / 2 }
    })
    expect(Math.abs(letter.x - (circle.x + circle.width / 2))).toBeLessThanOrEqual(0.5)
    expect(Math.abs(letter.y - (circle.y + circle.height / 2))).toBeLessThanOrEqual(0.5)
    await expect(avatar).toHaveAccessibleName(`Account: ${editor.credentials.email}`)
    await expect(avatar.locator('.btn__label')).toHaveCSS('font-size', '0px')
    await expect(avatar.locator('.btn__icon')).toBeHidden()
    expect(await avatar.locator('.btn__label').evaluate((element) => getComputedStyle(element, '::first-letter').fontSize)).toBe(
      '14px'
    )
  })

  test("nav: 'hidden' hides the nav and lets the card fill the field", async ({ page }) => {
    await saveAppearancePreference(page.request, studio({ nav: 'hidden' }))
    await openList(page)
    const card = page.locator('.template-default__wrap')

    const toggleNav = (toggle: string) =>
      Promise.all([
        page.waitForResponse(
          (response) => response.url().endsWith('/api/payload-preferences/nav') && response.request().method() === 'POST'
        ),
        page.locator(toggle).click()
      ])

    await toggleNav('.payloadpack-nav-toggle')
    await expect(card).toHaveCSS('margin-left', '6px')
    await expect(page.locator('.nav')).toHaveCSS('visibility', 'hidden')
    await toggleNav('.app-header__sidebar-toggle')
    await expect(card).toHaveCSS('margin-left', '0px')
  })

  test('flat drops the card', async ({ page }) => {
    await saveAppearancePreference(page.request, studio({ frame: 'flat' }))
    await openList(page)
    const card = page.locator('.template-default__wrap')

    await expect(card).toHaveCSS('border-top-width', '0px')
    await expect(card).toHaveCSS('border-radius', '0px')
    await expect(card).toHaveCSS('margin', '0px')
    await expect(page.locator('.nav')).toHaveCSS('border-right-width', '1px')
  })

  test('moves the user menu to the bottom of the nav and opens its menu upward', async ({ page }) => {
    await saveAppearancePreference(page.request, studio())
    await openList(page)
    const nav = await page.locator('.nav').boundingBox()
    const trigger = page.locator('.user-menu__trigger')
    const menu = await trigger.boundingBox()

    expect((nav?.y ?? 0) + (nav?.height ?? 0) - ((menu?.y ?? 0) + (menu?.height ?? 0))).toBeLessThanOrEqual(12)
    expect(menu?.y).toBeGreaterThan((await page.locator('.nav-group').last().boundingBox())?.y ?? Infinity)

    await trigger.click()
    const popup = page.locator('.user-menu .popup__content')
    await expect(popup).toBeVisible()
    await waitForAnimations(popup)
    const box = await popup.boundingBox()
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(menu?.y ?? 0)
  })

  test('keeps the user menu and the toggle in place while a long nav scrolls between them', async ({ page }) => {
    await page.setViewportSize({ height: 640, width: 1280 })
    await saveAppearancePreference(page.request, studio())
    await openList(page)
    const scroller = page.locator('.nav__scroll')
    const menu = page.locator('.user-menu__trigger')
    const toggle = page.locator('.payloadpack-nav-toggle')
    const lastLink = page.locator('.nav__link').last()
    await expect(menu).toBeVisible()
    await expect(toggle).toBeVisible()
    const pinned = async () => [await menu.boundingBox(), await toggle.boundingBox()]
    const before = await pinned()

    expect(await scroller.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
    await scroller.evaluate((element) => element.scrollTo({ top: element.scrollHeight }))
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight }))

    expect(await pinned()).toEqual(before)
    await expect(lastLink).toBeVisible()
    const end = await lastLink.boundingBox()
    expect((end?.y ?? 0) + (end?.height ?? 0)).toBeLessThanOrEqual(before[0]?.y ?? 0)
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
    await saveAppearancePreference(page.request, studio())
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

    await saveAppearanceAndReload(page, studio({ font: 'inter' }))
    await expect(body).toHaveCSS('font-family', /^Inter, "?Inter Fallback"?/)

    await saveAppearanceAndReload(page, studio({ font: 'system' }))
    await expect(body).toHaveCSS('font-family', /^system-ui,/)
  })

  test("sets text in Geist's fallback at Geist's width, so nothing shifts when it loads", async ({ page }) => {
    await saveAppearancePreference(page.request, studio())
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
      await saveAppearancePreference(page.request, { character })
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
      await saveAppearancePreference(page.request, { character: 'studio', palette: 'warm' })
      await page.context().addCookies([demoCookie('theme', theme)])
      await page.goto((await findShowcase(page)).path)

      await expect(page.locator('.btn--style-primary:visible').first()).toHaveCSS('background-color', 'rgb(194, 65, 12)')
    }
    await page.context().addCookies([demoCookie('theme', 'light')])
    await page.reload()
    const bar = await page
      .locator('.tabs__tab-button--active')
      .first()
      .evaluate((element) => getComputedStyle(element, '::after').backgroundColor)
    expect(await isNearColor(page, bar, await computedColor(page, 'var(--payloadpack-accent)'))).toBe(true)
  })

  test('tints the field from the accent in light and dark, with cards on top', async ({ page }) => {
    await saveAppearancePreference(page.request, { character: 'studio', palette: 'warm' })
    await page.context().addCookies([demoCookie('theme', 'light')])
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
      await saveAppearancePreference(page.request, { character: 'studio', palette: 'warm' })
      await page.context().addCookies([demoCookie('theme', theme)])
      await page.reload()
      const [background, surface] = [
        await computedColor(page, 'var(--payloadpack-bg-app)'),
        await computedColor(page, 'var(--payloadpack-bg-surface)')
      ]

      await expect(field).toHaveCSS('background-color', background)
      await expect(page.locator('.nav')).toHaveCSS('background-color', background)
      await expect(card).toHaveCSS('background-color', surface)
      expect(await followsAccent(() => computedStyleValue(page, '.template-default', 'background-color')), theme).toBe(true)
      expect((await colorChannels(page, 'oklab', surface))[0]).toBeGreaterThan(
        (await colorChannels(page, 'oklab', background))[0]
      )
    }
    expect(await followsAccent(() => computedColor(page, 'var(--color-bg-selected)'))).toBe(true)
  })

  test('tints the nav under Enhanced too', async ({ page }) => {
    await saveAppearancePreference(page.request, { palette: 'warm' })
    await page.context().addCookies([demoCookie('theme', 'light')])
    await page.goto('/admin/collections/showcase')

    await expect(page.locator('.nav__header')).toHaveCSS(
      'background-color',
      await computedColor(page, 'var(--payloadpack-bg-app)')
    )
    await expect(page.locator('.template-default__wrap')).toHaveCSS(
      'background-color',
      await computedColor(page, 'var(--payloadpack-bg-surface)')
    )
  })
})

test.describe('Token sheet', () => {
  const openShowcaseIn = async (page: Page, theme: 'dark' | 'light', palette: string) => {
    await saveAppearancePreference(page.request, { palette })
    await page.context().addCookies([demoCookie('theme', theme)])
    await page.goto((await findShowcase(page)).path)
    await waitForHydration(page)
  }
  const moreOptions = (page: Page) => page.getByRole('button', { name: 'More options' }).first()
  const userSheet = `
    [data-palette='neutral'] {
      --payloadpack-border-default: #e5e5e5;

      &[data-theme='dark'] {
        --payloadpack-border-default: #262626;
      }
    }

    html {
      --payloadpack-radius-card: 1rem;
      --payloadpack-motion-panel-duration: 300ms;
    }
  `

  test("reaches fields, corners, motion and dark menus from the user's own CSS", async ({ page }) => {
    await openShowcaseIn(page, 'light', 'neutral')
    await page.addStyleTag({ content: userSheet })
    await expect(page.locator('.field-type.text input').first()).toHaveCSS('border-top-color', 'rgb(229, 229, 229)')
    expect(await computedStyleValue(page, 'html', '--radius-large')).toBe('1rem')
    await expect(page.locator('.template-default')).toHaveCSS('transition-duration', '0.3s')

    await openShowcaseIn(page, 'dark', 'neutral')
    await page.addStyleTag({ content: userSheet })
    await expect(page.locator('.field-type.text input').first()).toHaveCSS('border-top-color', 'rgb(38, 38, 38)')
    await moreOptions(page).click()
    expect(await computedStyleValue(page, '.popup__content:popover-open', 'box-shadow')).toContain(
      'rgb(38, 38, 38) 0px 0px 0px 1px'
    )
  })

  test("draws menus in the page's mode, and leaves Payload's dark menus on Payload's palette", async ({ page }) => {
    await openShowcaseIn(page, 'light', 'neutral')
    await moreOptions(page).click()
    const popup = page.locator('.popup__content:popover-open')
    await expect(popup).toHaveCSS('background-color', await computedColor(page, 'var(--color-bg-elevated)'))
    await expect(popup).toHaveCSS('color', await computedColor(page, 'var(--color-text)'))

    await openShowcaseIn(page, 'light', 'payload')
    await moreOptions(page).click()
    const [lightness] = await colorChannels(
      page,
      'oklab',
      await computedStyleValue(page, '.popup__content:popover-open', 'background-color')
    )
    expect(lightness).toBeLessThan(0.4)
  })
})

test.describe('Soft palette', () => {
  test('draws selection borders in the primary, not the blue accent', async ({ page }) => {
    await saveAppearancePreference(page.request, { palette: 'soft' })
    await page.context().addCookies([demoCookie('theme', 'light')])
    await page.goto('/admin/collections/posts')
    await waitForHydration(page)
    await page.getByRole('button', { exact: true, name: 'Columns' }).click()
    const primary = await computedColor(page, 'var(--color-bg-brand)')
    await expect(page.locator('.columns-button__button')).toHaveCSS('border-top-color', primary)
    await expect(page.locator('.switch__track--checked').first()).toHaveCSS('border-top-color', primary)

    await page.goto('/admin/collections/pages')
    await page.locator('table tbody tr a').first().click()
    expect(await computedStyleValue(page, '.tabs__tab-button--active', 'background-color', '::after')).toBe(primary)
  })

  test('draws a checked row checkbox like every other checkbox, not in the blue accent', async ({ page }) => {
    await saveAppearancePreference(page.request, { palette: 'soft' })
    await page.context().addCookies([demoCookie('theme', 'dark')])
    await page.goto('/admin/collections/posts')
    await waitForHydration(page)
    await page.locator('.checkbox-input__control--muted').nth(1).check({ force: true })
    await page.mouse.move(0, 0)
    const visuals = page.locator('.checkbox-input__control--muted:checked + .checkbox-input__visuals').first()
    await expect(visuals).toHaveCSS('border-top-color', await computedColor(page, 'var(--payloadpack-toggle-checked-border)'))
    await expect(visuals).toHaveCSS('background-color', await computedColor(page, 'var(--payloadpack-toggle-checked-bg)'))
  })

  test('marks the selected nav link with a flat grey fill and keeps the sidebar tab raised', async ({ page }) => {
    for (const [theme, fill] of [
      ['light', 'rgb(238, 238, 238)'],
      ['dark', 'rgb(41, 41, 41)']
    ] as const) {
      await saveAppearancePreference(page.request, { character: 'studio', palette: 'soft' })
      await page.context().addCookies([demoCookie('theme', theme)])
      await page.goto('/admin/collections/showcase')
      await waitForHydration(page)
      expect(await computedStyleValue(page, '.nav__link--selected', 'background-color', '::before')).toBe(fill)
      expect(await computedStyleValue(page, '.nav__link--selected', 'box-shadow', '::before')).toBe('none')
      expect(await computedStyleValue(page, '.sidebar-tabs__tab--active', 'box-shadow')).not.toBe('none')
    }
  })

  test('lifts menus and select lists a step above the page in dark mode, and keeps them white in light mode', async ({
    page
  }) => {
    for (const [theme, menu] of [
      ['dark', 'rgb(31, 31, 31)'],
      ['light', 'rgb(255, 255, 255)']
    ] as const) {
      await saveAppearancePreference(page.request, { character: 'studio', palette: 'soft' })
      await page.context().addCookies([demoCookie('theme', theme)])
      await page.goto((await findShowcase(page)).path)
      await waitForHydration(page)
      await page.getByRole('button', { name: 'More options' }).first().click()
      await expect(page.locator('.popup__content:popover-open')).toHaveCSS('background-color', menu)
      await page.keyboard.press('Escape')
      await page.locator('.field-type.select .rs__control').first().click()
      await expect(page.locator('.rs__menu')).toHaveCSS('background-color', menu)
    }
  })
})

test.describe('Select lists', () => {
  const openSelectAndHoverAnotherOption = async (page: Page) => {
    await page.goto((await findShowcase(page)).path)
    await waitForHydration(page)
    await page.locator('.field-type.select .rs__control').first().click()
    const hovered = page.locator('.rs__option:not(.rs__option--is-selected)').last()
    await hovered.hover()
    await expect(hovered).toHaveClass(/rs__option--is-focused/)
    return hovered
  }

  test('mark the chosen option with a check, so only the hovered one fills in light and dark', async ({ page }) => {
    for (const palette of ['neutral', 'soft'] as const) {
      for (const theme of ['light', 'dark'] as const) {
        await saveAppearancePreference(page.request, { palette })
        await page.context().addCookies([demoCookie('theme', theme)])
        const hovered = await openSelectAndHoverAnotherOption(page)
        await expect(hovered).not.toHaveCSS('background-color', await computedStyleValue(page, '.rs__menu', 'background-color'))
        await expect(page.locator('.rs__option--is-selected')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
        expect(await computedStyleValue(page, '.rs__option--is-selected', 'mask-image', '::after')).toContain('svg')
        expect(await computedStyleValue(page, '.rs__option--is-selected', 'display', '::after')).toBe('block')
      }
    }
  })

  test("keep Payload's fill and no check on the Payload palette", async ({ page }) => {
    await saveAppearancePreference(page.request, { palette: 'payload' })
    await page.context().addCookies([demoCookie('theme', 'light')])
    await openSelectAndHoverAnotherOption(page)
    await expect(page.locator('.rs__option--is-selected')).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    expect(await computedStyleValue(page, '.rs__option--is-selected', 'content', '::after')).toBe('none')
  })
})

test.describe('Checkbox cells', () => {
  test("shows the mark next to Payload's edit button in a join table's linked first column", async ({ page }) => {
    const { docs } = await (await page.request.get('/api/categories?where[name][equals]=Community&limit=1&depth=0')).json()
    await page.goto(`/admin/collections/categories/${docs[0].id}`)
    const first = page.locator('.field-type.join').filter({ hasText: 'Products' }).locator('tbody tr').first()
    const mark = first.locator('.payloadpack-checkbox-cell .drawer-link__cell')
    const edit = first.getByRole('button', { name: 'Edit' })

    await expect(mark).toHaveCSS('width', '24px')
    expect(await mark.evaluate((cell) => getComputedStyle(cell, '::before').maskImage)).toMatch(/x\.svg|check\.svg|data:/)
    await expect(edit).toBeVisible()
    expect((await edit.boundingBox())!.x).toBeGreaterThanOrEqual((await mark.boundingBox())!.x + 24)
  })

  const firstColumn = (accessor: string) =>
    `/admin/collections/products?columns=${encodeURIComponent(JSON.stringify([accessor, 'title']))}`

  test("show a check or a muted x, and keep Payload's text for screen readers", async ({ page }) => {
    await page.goto('/admin/collections/products')
    await waitForHydration(page)
    const yes = page.locator('.payloadpack-checkbox-cell[data-value="true"] > *').first()
    const no = page.locator('.payloadpack-checkbox-cell[data-value="false"] > *').first()
    const mask = (cell: Locator) => cell.evaluate((element) => getComputedStyle(element, '::before').maskImage)

    await expect(yes).toHaveText('true')
    await expect(no).toHaveText('false')
    await expect(yes).toHaveCSS('font-size', '0px')
    expect(await mask(yes)).toContain('data:image/svg+xml')
    expect(await mask(no)).toContain('data:image/svg+xml')
    expect(await mask(no)).not.toBe(await mask(yes))
    await expect(no).toHaveCSS('opacity', '0.6')
  })

  test('keep a checkbox in the first column a link to its document', async ({ page }) => {
    await page.goto(firstColumn('inStock'))
    await waitForHydration(page)
    const link = page.locator('.payloadpack-checkbox-cell > a').first()

    await expect(link).toHaveAttribute('href', /\/admin\/collections\/products\/\d+$/)
    await expect(page.locator('.payloadpack-checkbox-cell > a')).toHaveCount(await page.locator('tbody tr').count())
    await link.click()
    await expect(page).toHaveURL(/\/admin\/collections\/products\/\d+$/)
  })

  test("keep Payload's own cell under the Payload style", async ({ page }) => {
    await saveAppearancePreference(page.request, { character: 'payload' })
    await page.goto('/admin/collections/products')
    await waitForHydration(page)
    const cell = page.locator('.payloadpack-checkbox-cell .bool-cell').first()

    await expect(cell).toHaveText(/^(true|false)$/)
    await expect(cell).toHaveCSS('display', 'inline-flex')
    expect(await cell.evaluate((element) => getComputedStyle(element.parentElement!, '::before').content)).toBe('none')
  })
})
