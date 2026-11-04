import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { expect, it } from 'vitest'

import { AppearanceProvider } from '../src/components/appearance-provider.js'
import { type Choices, type CustomPalette, paletteCss, type Settings } from '../src/lib/appearance.js'

const render = (settings: Settings, initialChoices: Choices = {}, initialRail = false) =>
  renderToString(
    createElement(AppearanceProvider, {
      children: null,
      codeEditorFontSize: false,
      cookieName: 'payload-appearance',
      initialChoices,
      initialRail,
      railCookieName: 'payload-nav-rail',
      settings
    })
  )

const runScript = (settings: Settings, initialChoices: Choices = {}, initialRail = false) => {
  const script = render(settings, initialChoices, initialRail).match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? ''
  const dataset = {}

  new Function('document', script)({ documentElement: { dataset } })

  return dataset
}

const custom: CustomPalette = {
  accent: '#c2410c',
  dark: { background: '#131312', primary: '#f2f1ec', surface: '#1c1c1b', text: '#f2f1ec' },
  light: { background: '#f1f0ec', primary: '#1c1b18', surface: '#ffffff', text: '#1c1b18' }
}

const settings: Settings = {
  character: 'enhanced',
  options: { enhanced: { density: 'comfortable', icons: 'lucide' } },
  palette: 'neutral',
  palettes: ['payload', 'neutral']
}

it('keeps the initial appearance inside its inline script', () => {
  const density = '</script><script>alert(1)</script>' as 'compact'

  expect(runScript({ ...settings, options: { enhanced: { density, icons: 'lucide' } } })).toEqual({
    character: 'enhanced',
    density,
    icons: 'lucide',
    palette: 'neutral'
  })
})

it('sets the palette and leaves the accent to the palette CSS', () => {
  expect(runScript(settings)).toEqual({ character: 'enhanced', density: 'comfortable', icons: 'lucide', palette: 'neutral' })
  expect(runScript(settings, { custom, palette: 'custom' })).toEqual({
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

  expect(runScript(withNav, {}, true)).toEqual({ character: 'enhanced', nav: 'icons', palette: 'neutral', rail: '' })
  expect(runScript(withNav, { options: { enhanced: { nav: 'hidden' } } }, true)).toEqual({
    character: 'enhanced',
    nav: 'hidden',
    palette: 'neutral'
  })
})
