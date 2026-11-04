import { expect, it } from 'vitest'

import type { User } from 'payload'

import {
  type CustomPalette,
  isEditable,
  normalize,
  paletteCss,
  parseChoices,
  resolve,
  type Settings,
  setupOf
} from '../src/lib/appearance.js'

const settings: Settings = {
  character: 'enhanced',
  options: { enhanced: { density: 'compact', icons: 'lucide' }, stock: {} },
  palette: 'neutral',
  palettes: ['payload', 'neutral']
}

const custom: CustomPalette = {
  accent: '#c2410c',
  dark: { background: '#131312', primary: '#f2f1ec', surface: '#1c1c1b', text: '#f2f1ec' },
  light: { background: '#f1f0ec', primary: '#1c1b18', surface: '#ffffff', text: '#1c1b18' }
}

it('layers the editor choices over the developer defaults', () => {
  expect(resolve(settings, {})).toEqual({
    character: 'enhanced',
    palette: 'neutral',
    values: { density: 'compact', icons: 'lucide' }
  })
  expect(resolve(settings, { options: { enhanced: { icons: 'payload' } }, palette: 'payload' })).toEqual({
    character: 'enhanced',
    palette: 'payload',
    values: { density: 'compact', icons: 'payload' }
  })
  expect(resolve(settings, { character: 'stock', options: { enhanced: { icons: 'payload' } } })).toEqual({
    character: 'stock',
    palette: 'neutral',
    values: {}
  })
})

it('keeps the custom palette while another palette is picked', () => {
  expect(resolve(settings, { custom, palette: 'payload' })).toMatchObject({ custom, palette: 'payload' })
})

it('drops characters, palettes, options and values the settings do not allow', () => {
  const onlyEnhanced: Settings = { ...settings, options: { enhanced: settings.options.enhanced }, palettes: ['neutral'] }

  expect(
    normalize(onlyEnhanced, {
      character: 'stock',
      options: { enhanced: { density: 'huge', icons: 'payload', motion: 'on' } },
      palette: 'payload'
    })
  ).toEqual({ options: { enhanced: { icons: 'payload' } } })
  expect(
    normalize(settings, { character: 'constructor', options: { stock: { density: 'comfortable' } }, palette: 'neon' })
  ).toEqual({})
})

it('keeps a custom palette only when every color is a lowercase #rrggbb, and picks it only when it exists', () => {
  expect(normalize(settings, { custom: { ...custom, extra: true, light: { ...custom.light, glow: '#000000' } } })).toEqual({ custom })
  expect(normalize(settings, { custom: { ...custom, accent: '#C2410C' }, palette: 'custom' })).toEqual({})
  expect(normalize(settings, { custom: { ...custom, dark: { ...custom.dark, text: 'white' } } })).toEqual({})
  expect(normalize(settings, { palette: 'custom' })).toEqual({})
})

it('writes the custom palette as the same CSS block a built-in palette is', () => {
  expect(paletteCss('custom', custom)).toBe(
    [
      "[data-palette='custom'] {",
      '  --payloadpack-background: #f1f0ec;',
      '  --payloadpack-surface: #ffffff;',
      '  --payloadpack-text: #1c1b18;',
      '  --payloadpack-primary: #1c1b18;',
      '  --payloadpack-accent: #c2410c;',
      '',
      "  &[data-theme='dark'],",
      "  [data-theme='dark']:not([data-palette]) {",
      '    --payloadpack-background: #131312;',
      '    --payloadpack-surface: #1c1c1b;',
      '    --payloadpack-text: #f2f1ec;',
      '    --payloadpack-primary: #f2f1ec;',
      '  }',
      '}',
      ''
    ].join('\n')
  )
})

it('keeps only choices that differ from the defaults, per character and palette', () => {
  expect(
    normalize(settings, {
      character: 'enhanced',
      options: { enhanced: { density: 'compact', icons: 'payload' }, stock: {} },
      palette: 'neutral'
    })
  ).toEqual({ options: { enhanced: { icons: 'payload' } } })
  expect(normalize(settings, { character: 'stock', options: { enhanced: { icons: 'payload' } }, palette: 'payload' })).toEqual({
    character: 'stock',
    options: { enhanced: { icons: 'payload' } },
    palette: 'payload'
  })
})

it('ignores the cookie when the panel is off for the user, and never asks without a user', () => {
  const admin = { role: 'admin' } as unknown as User
  const onlyAdmins = ({ user }: { user: User }) => (user as unknown as { role: string }).role === 'admin'

  expect(isEditable(true, undefined)).toBe(true)
  expect(isEditable(false, admin)).toBe(false)
  expect(isEditable(onlyAdmins, admin)).toBe(true)
  expect(isEditable(onlyAdmins, { role: 'editor' } as unknown as User)).toBe(false)
  expect(isEditable(() => false, undefined)).toBe(true)
})

it('rejects text that is not a JSON object', () => {
  expect(parseChoices(settings, undefined)).toBeUndefined()
  expect(parseChoices(settings, '')).toBeUndefined()
  expect(parseChoices(settings, '{"character":')).toBeUndefined()
  expect(parseChoices(settings, '"stock"')).toBeUndefined()
  expect(parseChoices(settings, '["stock"]')).toBeUndefined()
  expect(parseChoices(settings, '{"character":"stock"}')).toEqual({ character: 'stock' })
})

it('pastes a copied setup into the same resolved', () => {
  const other: Settings = { ...settings, character: 'stock', palette: 'payload' }
  const cases = [
    resolve(settings, { custom, options: { enhanced: { icons: 'payload' } }, palette: 'custom' }),
    resolve(settings, { options: { enhanced: { icons: 'payload' } }, palette: 'payload' }),
    resolve(settings, { character: 'stock' }),
    resolve(settings, {})
  ]

  for (const resolved of cases) {
    const copied = JSON.stringify(setupOf(resolved), null, 2)
    expect(resolve(other, parseChoices(other, copied) ?? {})).toEqual(resolved)
  }
})

it('copies a setup in the shape of the plugin config', () => {
  expect(setupOf(resolve(settings, {}))).toEqual({
    character: 'enhanced',
    options: { enhanced: { density: 'compact', icons: 'lucide' } },
    palette: 'neutral'
  })
  expect(setupOf(resolve(settings, { character: 'stock', custom }))).toEqual({ character: 'stock', palette: 'neutral' })
  expect(setupOf(resolve(settings, { character: 'stock', custom, palette: 'custom' }))).toEqual({
    character: 'stock',
    custom,
    palette: 'custom'
  })
})
