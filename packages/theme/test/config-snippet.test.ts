import { expect, it } from 'vitest'

import { configSnippet } from '../src/lib/config-snippet.js'

it('prints zero config when the default character keeps its built-in values', () => {
  expect(configSnippet('enhanced', { density: 'comfortable', icons: 'lucide' })).toBe('themePlugin()')
})

it('prints the character when it is not the zero-config default', () => {
  expect(configSnippet('stock', {})).toBe("themePlugin({\n  character: 'stock',\n})")
})

it('prints only the values that differ from the built-in defaults, in registry order', () => {
  expect(configSnippet('enhanced', { density: 'compact', icons: 'lucide' })).toBe(
    "themePlugin({\n  enhanced: { density: 'compact' },\n})"
  )
  expect(configSnippet('enhanced', { icons: 'payload', density: 'compact' })).toBe(
    "themePlugin({\n  enhanced: { density: 'compact', icons: 'payload' },\n})"
  )
})
