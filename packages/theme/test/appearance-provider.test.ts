import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { expect, it } from 'vitest'

import { AppearanceProvider } from '../src/components/appearance-provider.js'

it('keeps the initial appearance inside its inline script', () => {
  const initialAppearance = { adminTheme: '</script><script>alert(1)</script>', density: 'comfortable', icons: 'lucide' }
  const html = renderToString(
    createElement(AppearanceProvider, { children: null, codeEditorFontSize: false, cookiePrefix: 'payload', initialAppearance })
  )
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? ''
  const dataset = {}

  new Function('document', script)({ documentElement: { dataset } })

  expect(dataset).toEqual(initialAppearance)
})
