import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { expect, it } from 'vitest'

import { AppearanceProvider } from '../src/components/appearance-provider.js'
import type { Choices, Settings } from '../src/lib/appearance.js'

const runScript = (settings: Settings, initialChoices: Choices = {}, initialRail = false) => {
  const html = renderToString(
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
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? ''
  const dataset = {}
  const style: Record<string, string> = {}

  new Function('document', script)({
    documentElement: { dataset, style: { setProperty: (name: string, value: string) => (style[name] = value) } }
  })

  return { dataset, style }
}

const settings: Settings = {
  accents: { payload: '#0d99ff', warm: '#0d99ff' },
  character: 'enhanced',
  options: { enhanced: { density: 'comfortable', icons: 'lucide' } },
  palette: 'warm'
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

it("sets the palette and its accent, and leaves Payload's blue to Payload", () => {
  expect(runScript(settings)).toEqual({
    dataset: { character: 'enhanced', density: 'comfortable', icons: 'lucide', palette: 'warm' },
    style: { '--payloadpack-accent': '#0d99ff' }
  })
  expect(runScript(settings, { accent: { payload: '#c2410c' }, palette: 'payload' })).toEqual({
    dataset: { accent: '#c2410c', character: 'enhanced', density: 'comfortable', icons: 'lucide', palette: 'payload' },
    style: { '--payloadpack-accent': '#c2410c' }
  })
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
