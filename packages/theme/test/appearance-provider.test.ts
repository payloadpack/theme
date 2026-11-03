import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { expect, it } from 'vitest'

import { AppearanceProvider } from '../src/components/appearance-provider.js'

it('keeps the initial appearance inside its inline script', () => {
  const density = '</script><script>alert(1)</script>' as 'compact'
  const settings = {
    character: 'enhanced' as const,
    defaults: { enhanced: { density, icons: 'lucide' as const } },
    palette: 'warm' as const,
    palettes: ['warm' as const]
  }
  const html = renderToString(
    createElement(AppearanceProvider, { children: null, codeEditorFontSize: false, cookieName: 'payload-appearance', initialChoices: {}, settings })
  )
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? ''
  const dataset = {}

  new Function('document', script)({ documentElement: { dataset } })

  expect(dataset).toEqual({ character: 'enhanced', density, icons: 'lucide', palette: 'warm' })
})
