import { RouterAdapterContext } from '@payloadcms/ui'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { expect, it } from 'vitest'

import { AppearanceProvider } from '../src/components/appearance-provider.js'
import {
  type CustomPalette,
  customPaletteCss,
  type EditorAppearanceChoices,
  type SiteAppearanceSettings
} from '../src/lib/appearance.js'

const router = { back: () => {}, push: () => {}, refresh: () => {}, replace: () => {} }

const renderProviderHtml = (
  siteSettings: SiteAppearanceSettings,
  initialEditorChoices: EditorAppearanceChoices = {},
  initialRailCollapsed = false
) =>
  renderToString(
    createElement(RouterAdapterContext, {
      value: { Link: () => null, params: {}, pathname: '/admin', router, searchParams: new URLSearchParams() },
      children: createElement(AppearanceProvider, {
        accountKey: undefined,
        appearanceCookieName: 'payload-appearance',
        canEdit: true,
        children: null,
        codeEditorFontSize: false,
        initialChoicesUnsaved: false,
        initialEditorChoices,
        initialRailCollapsed,
        preferenceURL: '/api/payload-preferences/payloadpack-appearance',
        railCookieName: 'payload-nav-rail',
        siteSettings
      })
    })
  )

const runInlineDatasetScript = (
  siteSettings: SiteAppearanceSettings,
  initialEditorChoices: EditorAppearanceChoices = {},
  initialRailCollapsed = false
) => {
  const script =
    renderProviderHtml(siteSettings, initialEditorChoices, initialRailCollapsed).match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? ''
  const dataset = {}

  new Function('document', script)({ documentElement: { dataset } })

  return dataset
}

const custom: CustomPalette = {
  accent: '#c2410c',
  dark: { background: '#131312', primary: '#f2f1ec', surface: '#1c1c1b', text: '#f2f1ec' },
  light: { background: '#f1f0ec', primary: '#1c1b18', surface: '#ffffff', text: '#1c1b18' }
}

const siteSettings: SiteAppearanceSettings = {
  character: 'enhanced',
  options: { enhanced: { density: 'comfortable', icons: 'lucide' } },
  palette: 'neutral',
  palettes: [{ slug: 'payload' }, { slug: 'neutral' }]
}

it('keeps the initial appearance inside its inline script', () => {
  const density = '</script><script>alert(1)</script>' as 'compact'

  expect(runInlineDatasetScript({ ...siteSettings, options: { enhanced: { density, icons: 'lucide' } } })).toEqual({
    character: 'enhanced',
    density,
    icons: 'lucide',
    palette: 'neutral'
  })
})

it('sets the palette and leaves the accent to the palette CSS', () => {
  expect(runInlineDatasetScript(siteSettings)).toEqual({
    character: 'enhanced',
    density: 'comfortable',
    icons: 'lucide',
    palette: 'neutral'
  })
  expect(runInlineDatasetScript(siteSettings, { custom, palette: 'custom' })).toEqual({
    character: 'enhanced',
    density: 'comfortable',
    icons: 'lucide',
    palette: 'custom'
  })
})

it('renders the custom palette into the server HTML as the CSS block Copy as CSS copies', () => {
  expect(renderProviderHtml(siteSettings, { custom })).toContain(`<style>${customPaletteCss('custom', custom)}</style>`)
  expect(renderProviderHtml(siteSettings, {})).not.toContain('<style>')
})

it('renders the collapsed rail only while the nav option is rail', () => {
  const withNav: SiteAppearanceSettings = { ...siteSettings, options: { enhanced: { nav: 'rail' } } }

  expect(runInlineDatasetScript(withNav, {}, true)).toEqual({ character: 'enhanced', nav: 'rail', palette: 'neutral', rail: '' })
  expect(runInlineDatasetScript(withNav, { personal: { nav: 'hidden' } }, true)).toEqual({
    character: 'enhanced',
    nav: 'hidden',
    palette: 'neutral'
  })
})
