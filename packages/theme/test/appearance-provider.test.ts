import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { expect, it } from 'vitest'

import { AppearanceProvider } from '../src/components/appearance-provider.js'
import { type Choices, type CustomPalette, paletteCss, type Settings } from '../src/lib/appearance.js'

const geist = "'Geist', 'Geist Fallback'"

const render = (settings: Settings, initialChoices: Choices = {}, initialRail = false) =>
  renderToString(
    createElement(AppearanceProvider, {
      children: null,
      codeEditorFontSize: false,
      cookieName: 'payload-appearance',
      geist,
      initialChoices,
      initialRail,
      railCookieName: 'payload-nav-rail',
      settings
    })
  )

const runScript = (settings: Settings, initialChoices: Choices = {}, initialRail = false) => {
  const script = render(settings, initialChoices, initialRail).match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? ''
  const dataset = {}
  const style: Record<string, string> = {}

  new Function('document', script)({
    documentElement: { dataset, style: { setProperty: (name: string, value: string) => (style[name] = value) } }
  })

  return { dataset, style }
}

const custom: CustomPalette = {
  accent: '#c2410c',
  dark: { background: '#131312', surface: '#1c1c1b', text: '#f2f1ec' },
  light: { background: '#f1f0ec', surface: '#ffffff', text: '#1c1b18' }
}

const settings: Settings = {
  character: 'enhanced',
  options: { enhanced: { density: 'comfortable', icons: 'lucide' } },
  palette: 'warm',
  palettes: ['payload', 'warm']
}

it('keeps the initial appearance inside its inline script', () => {
  const density = '</script><script>alert(1)</script>' as 'compact'

  expect(runScript({ ...settings, options: { enhanced: { density, icons: 'lucide' } } }).dataset).toEqual({
    character: 'enhanced',
    density,
    icons: 'lucide',
    palette: 'warm'
  })
})

it('sets the palette and the Geist family, and leaves the accent to the palette CSS', () => {
  expect(runScript(settings)).toEqual({
    dataset: { character: 'enhanced', density: 'comfortable', icons: 'lucide', palette: 'warm' },
    style: { '--payloadpack-font-geist': geist }
  })
  expect(runScript(settings, { custom, palette: 'custom' }).dataset).toEqual({
    character: 'enhanced',
    density: 'comfortable',
    icons: 'lucide',
    palette: 'custom'
  })
})

it('renders the custom palette into the server HTML as the CSS block Copy as CSS copies', () => {
  expect(render(settings, { custom })).toContain(`<style>${paletteCss('custom', custom)}</style>`)
  expect(render(settings, {})).not.toContain('<style>')
})

it('renders the collapsed rail only while the nav option is icons', () => {
  const withNav: Settings = { ...settings, options: { enhanced: { nav: 'icons' } } }

  expect(runScript(withNav, {}, true).dataset).toEqual({ character: 'enhanced', nav: 'icons', palette: 'warm', rail: '' })
  expect(runScript(withNav, { options: { enhanced: { nav: 'hidden' } } }, true).dataset).toEqual({
    character: 'enhanced',
    nav: 'hidden',
    palette: 'warm'
  })
})
