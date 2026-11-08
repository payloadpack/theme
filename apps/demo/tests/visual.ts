import { expect, type Page } from '@playwright/test'

import {
  buildCustomPalette,
  demoCookie,
  openAppearancePanel,
  parkPointer,
  fillShowcaseChoiceFields,
  saveAppearancePreference,
  test,
  waitForHydration
} from './demo'

const FROZEN_NOW = new Date('2026-11-01T09:00:00Z')

const THEMES = ['light', 'dark'] as const
type Theme = (typeof THEMES)[number]

type NamedSetup = { name: string; setup: object }

const SETUPS_PER_VIEW: (NamedSetup & { themes: readonly Theme[] })[] = [
  { name: 'enhanced-neutral', setup: {}, themes: THEMES },
  { name: 'studio-neutral', setup: { character: 'studio' }, themes: ['light'] },
  { name: 'payload-payload', setup: { character: 'payload', palette: 'payload' }, themes: ['light'] }
]

const PALETTE_SETUPS: NamedSetup[] = [
  { name: 'payload', setup: { palette: 'payload' } },
  { name: 'warm', setup: { palette: 'warm' } },
  { name: 'soft', setup: { palette: 'soft' } },
  { name: 'indigo', setup: { palette: 'indigo' } },
  { name: 'custom', setup: { custom: buildCustomPalette('#be185d'), palette: 'custom' } }
]

const OPTION_SETUPS: NamedSetup[] = [
  ...['none', 'sm', 'lg', 'full'].map((radius) => ({ name: `radius-${radius}`, setup: { options: { enhanced: { radius } } } })),
  ...['geist', 'system'].map((font) => ({ name: `font-${font}`, setup: { options: { enhanced: { font } } } })),
  { name: 'frame-boxed', setup: { options: { enhanced: { frame: 'boxed' } } } },
  { name: 'density-compact', setup: { options: { enhanced: { density: 'compact' } } } },
  { name: 'icons-payload', setup: { options: { enhanced: { icons: 'payload' } } } }
]

type Overlay = {
  editsRichText?: boolean
  fullPage?: boolean
  hoversPointer?: boolean
  name: string
  onlyInSetups?: string[]
  open: (page: Page) => Promise<unknown>
}

type View = { name: string; overlays?: Overlay[]; path: string; needsInstalledClock?: boolean; timestampsToMask?: string[] }

const clickButton = (name: RegExp | string) => (page: Page) => page.getByRole('button', { exact: true, name }).first().click()

const typeInShowcaseBody = async (page: Page, text: string) => {
  await page.locator('[data-lexical-editor="true"]').first().click()
  await page.keyboard.type(text)
}

const insertFromSlashMenu = async (page: Page, itemLabel: string) => {
  await typeInShowcaseBody(page, '/')
  await page.locator('.slash-menu-popup').getByText(itemLabel, { exact: true }).click()
}

const openTableSizePicker = async (page: Page) => {
  await insertFromSlashMenu(page, 'Table')
  await page.locator('.table-grid-popup').waitFor()
}

const insertTableIntoShowcaseBody = async (page: Page) => {
  await openTableSizePicker(page)
  await page.locator('.table-grid-popup').getByRole('button', { name: '3 columns, 2 rows' }).click()
  await page.locator('.LexicalEditorTheme__table').first().waitFor()
}

const DASHBOARD_VIEW: View = {
  name: 'dashboard',
  overlays: [
    { name: 'appearance-panel', open: openAppearancePanel },
    { name: 'user-menu', open: (page) => page.locator('.user-menu__trigger').click() },
    {
      name: 'command-palette',
      open: async (page) => {
        await page.keyboard.press('Control+k')
        await page.locator('.cmd-palette').waitFor()
      }
    },
    {
      name: 'rail',
      onlyInSetups: ['enhanced-neutral', 'studio-neutral'],
      open: (page) => page.locator('.payloadpack-nav-toggle').click()
    },
    { hoversPointer: true, name: 'hovered-nav-link', open: (page) => page.locator('#nav-posts').hover() }
  ],
  path: '/admin'
}

const SIGNED_IN_VIEWS: View[] = [
  DASHBOARD_VIEW,
  { name: 'account', path: '/admin/account', timestampsToMask: ['.doc-controls__meta'] },
  {
    name: 'posts-list',
    overlays: [
      { name: 'column-selector', open: clickButton('Columns') },
      { name: 'filters', open: clickButton('Filters') },
      { name: 'group-by', open: clickButton('Group by') },
      { name: 'row-selection', open: (page) => page.locator('table tbody tr').first().locator('.checkbox-input__input').click() }
    ],
    path: '/admin/collections/posts'
  },
  { name: 'posts-trash', path: '/admin/collections/posts/trash' },
  { name: 'media-list', path: '/admin/collections/media' },
  { name: 'products-list', path: '/admin/collections/products' },
  { name: 'categories-list', path: '/admin/collections/categories' },
  { name: 'tags-list', path: '/admin/collections/tags' },
  { name: 'folders-list', path: '/admin/collections/folders' },
  {
    name: 'showcase-edit',
    overlays: [
      { name: 'select-menu', open: (page) => page.locator('.field-type.select .rs__control').first().click() },
      { name: 'date-picker', open: (page) => page.locator('.date-time-picker input').first().click() },
      { name: 'timezone-menu', open: (page) => page.locator('.timezone-picker .rs__control').first().click() },
      { name: 'more-options', open: clickButton(/^More options/) },
      {
        editsRichText: true,
        name: 'slash-menu',
        open: async (page) => {
          await typeInShowcaseBody(page, '/')
          await page.locator('.slash-menu-popup').waitFor()
        }
      },
      {
        editsRichText: true,
        name: 'code-block-language-menu',
        open: async (page) => {
          await insertFromSlashMenu(page, 'Code')
          await page.locator('.payload-richtext-code-block__language-selector-button').click()
        }
      },
      { editsRichText: true, name: 'table-size-picker', open: openTableSizePicker },
      {
        editsRichText: true,
        name: 'table-action-menu',
        open: async (page) => {
          await insertTableIntoShowcaseBody(page)
          const firstTableCell = page.locator('.LexicalEditorTheme__tableCell').first()
          await firstTableCell.click()
          await firstTableCell.evaluate((cell) => cell.scrollIntoView({ block: 'center' }))
          await page.locator('.table-cell-action-button').click()
          await page.locator('.table-action-menu-dropdown').waitFor()
        }
      },
      { name: 'combobox', open: (page) => page.locator('.custom-field-components .popup-button').click() },
      {
        fullPage: true,
        name: 'filled-fields',
        open: async (page) => {
          await fillShowcaseChoiceFields(page)
          await page.locator('.field-type.checkbox').filter({ hasText: 'Pin to the top' }).getByRole('checkbox').check()
          await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
        }
      },
      { name: 'focused-field', open: (page) => page.locator('#field-title').focus() },
      {
        name: 'validation-errors',
        open: async (page) => {
          await page.locator('#field-title').fill('')
          await clickButton('Publish changes')(page)
          await page.locator('.field-type.error').first().waitFor()
        }
      },
      {
        hoversPointer: true,
        name: 'hovered-menu-item',
        open: async (page) => {
          await clickButton(/^More options/)(page)
          await page.locator('.doc-controls__popup .popup-button-list__button').first().hover()
        }
      }
    ],
    path: '/admin/collections/showcase/1'
  },
  {
    name: 'page-edit',
    overlays: [
      { name: 'blocks-drawer', open: (page) => page.locator('.blocks-field__drawer-toggler').click() },
      { name: 'document-drawer', open: (page) => page.locator('.relationship-add-new__add-button').first().click() },
      { name: 'live-preview', open: (page) => page.locator('.live-preview-toggler').click() }
    ],
    path: '/admin/collections/pages/1'
  },
  {
    name: 'post-edit',
    overlays: [
      {
        name: 'delete-confirmation',
        open: async (page) => {
          await clickButton(/^More options/)(page)
          await page
            .locator('.popup-button-list__button')
            .filter({ hasText: /^Delete$/ })
            .click()
          await page.getByRole('alertdialog').waitFor()
        }
      },
      {
        name: 'schedule-publish-drawer',
        open: async (page) => {
          await clickButton('Schedule Publish')(page)
          await page.getByRole('dialog').waitFor()
        }
      }
    ],
    path: '/admin/collections/posts/1'
  },
  { name: 'product-edit', path: '/admin/collections/products/1' },
  { name: 'category-edit', path: '/admin/collections/categories/1' },
  { name: 'customer-edit', path: '/admin/collections/customers/1' },
  { name: 'media-edit', path: '/admin/collections/media/1' },
  { name: 'order-create', path: '/admin/collections/orders/create' },
  { name: 'site-settings', path: '/admin/globals/site-settings' },
  { name: 'post-versions', path: '/admin/collections/posts/2/versions' },
  { name: 'post-version-diff', path: '/admin/collections/posts/2/versions/2' },
  {
    name: 'toasts',
    overlays: [
      {
        name: 'toast-stack',
        open: async (page) => {
          const fakeNow = await page.evaluate(() => Date.now())
          await page.clock.pauseAt(fakeNow + 1000)
          for (const trigger of await page.locator('.gutter button').all()) {
            await trigger.click()
          }
          await page.clock.runFor(500)
        }
      }
    ],
    path: '/admin/toasts',
    needsInstalledClock: true
  }
]

const SIGNED_OUT_VIEWS = [
  { name: 'login', path: '/admin/login' },
  { name: 'forgot-password', path: '/admin/forgot' }
]

const VIEWS_WITH_EVERY_PALETTE = SIGNED_IN_VIEWS.filter(({ name }) => ['dashboard', 'posts-list', 'showcase-edit'].includes(name))

const VIEWS_WITH_EVERY_OPTION = SIGNED_IN_VIEWS.filter(({ name }) => name === 'showcase-edit')

const PHONE_VIEWPORT = { height: 812, width: 375 }

const LOADING_PLACEHOLDERS =
  '.shimmer-effect, .loading-overlay:not(.loading-overlay--exiting), .monaco-editor:not(:has(.view-line))'

type MonacoOnWindow = {
  editor: {
    colorize: (text: string, languageId: string, options: object) => Promise<string>
    getEditors: () => { getModel: () => { getLanguageId: () => string } | null }[]
  }
}

const waitForCodeEditorHighlighting = (page: Page) =>
  page.evaluate(async () => {
    const monaco = (window as Window & { monaco?: MonacoOnWindow }).monaco
    if (!monaco) {
      return
    }
    const languageIds = monaco.editor.getEditors().flatMap((editor) => editor.getModel()?.getLanguageId() ?? [])
    await Promise.all(languageIds.map((languageId) => monaco.editor.colorize('', languageId, {})))
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })

const waitForLoadingToFinish = async (page: Page) => {
  await expect(page.locator(LOADING_PLACEHOLDERS)).toHaveCount(0)
  await waitForCodeEditorHighlighting(page)
}

const openPathAndSettle = async (page: Page, path: string) => {
  await page.goto(path, { waitUntil: 'networkidle' })
  await waitForLoadingToFinish(page)
}

const openSignedInPathAndSettle = async (page: Page, path: string) => {
  await openPathAndSettle(page, path)
  await waitForHydration(page)
}

const growViewportToPage = async (page: Page) => {
  const viewport = page.viewportSize()
  if (!viewport) {
    throw new Error('The page has no viewport')
  }
  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight)
  if (pageHeight <= viewport.height) {
    return
  }
  await page.setViewportSize({ height: pageHeight, width: viewport.width })
  await expect.poll(() => page.evaluate(() => [...document.images].every((image) => image.complete))).toBe(true)
  await waitForLoadingToFinish(page)
}

const expectViewScreenshot = async (page: Page, view: View, shotName: string) => {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await growViewportToPage(page)
  await parkPointer(page)
  await expect(page).toHaveScreenshot(`${shotName}.png`, {
    mask: (view.timestampsToMask ?? []).map((selector) => page.locator(selector))
  })
}

const waitForDeferredEditorUpdates = (page: Page) =>
  page.evaluate(() => new Promise<void>((resolve) => requestIdleCallback(() => requestIdleCallback(() => resolve()))))

const expectOverlayScreenshot = async (
  page: Page,
  overlay: Pick<Overlay, 'editsRichText' | 'fullPage' | 'hoversPointer'>,
  shotName: string
) => {
  await waitForLoadingToFinish(page)
  if (overlay.fullPage) {
    await growViewportToPage(page)
  }
  if (!overlay.hoversPointer) {
    await parkPointer(page)
  }
  if (overlay.editsRichText) {
    await waitForDeferredEditorUpdates(page)
  }
  await expect(page).toHaveScreenshot(`${shotName}.png`)
}

const setClockForView = (page: Page, view: View) =>
  view.needsInstalledClock ? page.clock.install({ time: FROZEN_NOW }) : page.clock.setFixedTime(FROZEN_NOW)

const filterOverlaysForSetup = (view: View, setupName: string) =>
  (view.overlays ?? []).filter(({ onlyInSetups }) => onlyInSetups?.includes(setupName) ?? true)

const openViewInSetup = async (page: Page, view: View, setup: object, theme: Theme) => {
  await setClockForView(page, view)
  await expect(await saveAppearancePreference(page.request, setup)).toBeOK()
  await page.context().addCookies([demoCookie('theme', theme)])
  await openSignedInPathAndSettle(page, view.path)
}

test.describe('signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  for (const view of SIGNED_OUT_VIEWS) {
    for (const theme of THEMES) {
      test(`${view.name} ${theme}`, async ({ page }) => {
        await page.clock.setFixedTime(FROZEN_NOW)
        await page.context().addCookies([demoCookie('theme', theme)])
        await openPathAndSettle(page, view.path)
        await growViewportToPage(page)
        await parkPointer(page)
        await expect(page).toHaveScreenshot(`${view.name}-${theme}.png`)
      })
    }
  }
})

for (const { name: setupName, setup, themes } of SETUPS_PER_VIEW) {
  for (const theme of themes) {
    for (const view of SIGNED_IN_VIEWS) {
      test(`${view.name} ${setupName} ${theme}`, async ({ page }) => {
        await openViewInSetup(page, view, setup, theme)
        await expectViewScreenshot(page, view, `${view.name}-${setupName}-${theme}`)
      })

      for (const overlay of filterOverlaysForSetup(view, setupName)) {
        test(`${view.name} ${overlay.name} ${setupName} ${theme}`, async ({ page }) => {
          await openViewInSetup(page, view, setup, theme)
          await overlay.open(page)
          await expectOverlayScreenshot(page, overlay, `${view.name}-${overlay.name}-${setupName}-${theme}`)
        })
      }
    }
  }
}

for (const view of VIEWS_WITH_EVERY_PALETTE) {
  for (const { name: paletteName, setup } of PALETTE_SETUPS) {
    for (const theme of THEMES) {
      test(`${view.name} palette ${paletteName} ${theme}`, async ({ page }) => {
        await openViewInSetup(page, view, setup, theme)
        await expectViewScreenshot(page, view, `${view.name}-palette-${paletteName}-${theme}`)
      })
    }
  }
}

for (const view of VIEWS_WITH_EVERY_OPTION) {
  for (const { name: optionName, setup } of OPTION_SETUPS) {
    test(`${view.name} option ${optionName}`, async ({ page }) => {
      await openViewInSetup(page, view, setup, 'light')
      await expectViewScreenshot(page, view, `${view.name}-option-${optionName}`)
    })
  }
}

test.describe('phone', () => {
  test.use({ viewport: PHONE_VIEWPORT })

  for (const view of VIEWS_WITH_EVERY_PALETTE) {
    test(`${view.name} phone`, async ({ page }) => {
      await openViewInSetup(page, view, {}, 'light')
      await expectViewScreenshot(page, view, `${view.name}-phone`)
    })
  }

  test('dashboard phone nav', async ({ page }) => {
    await openViewInSetup(page, DASHBOARD_VIEW, {}, 'light')
    await page.locator('.app-header__sidebar-toggle').click()
    await expectOverlayScreenshot(page, {}, 'dashboard-phone-nav')
  })
})
