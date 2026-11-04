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
  options: { enhanced: { density: 'compact', icons: 'lucide' }, payload: {} },
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
    changed: 0,
    character: 'enhanced',
    palette: 'neutral',
    values: { density: 'compact', icons: 'lucide' }
  })
  expect(resolve(settings, { options: { enhanced: { icons: 'payload' } }, palette: 'payload' })).toEqual({
    changed: 1,
    character: 'enhanced',
    palette: 'payload',
    values: { density: 'compact', icons: 'payload' }
  })
  expect(resolve(settings, { character: 'payload', options: { enhanced: { icons: 'payload' } } })).toEqual({
    changed: 0,
    character: 'payload',
    palette: 'neutral',
    values: {}
  })
})

it('carries density, motion and nav across styles, and keeps the rest of the look per style', () => {
  const both: Settings = {
    ...settings,
    options: { enhanced: { density: 'compact', radius: 'md' }, payload: {}, studio: { density: 'compact', radius: 'lg' } }
  }
  const choices = normalize(both, { options: { enhanced: { density: 'comfortable', radius: 'sm' } } })

  expect(choices).toEqual({ options: { enhanced: { radius: 'sm' } }, personal: { density: 'comfortable' } })
  expect(resolve(both, { ...choices, character: 'studio' }).values).toEqual({ density: 'comfortable', radius: 'lg' })
  expect(resolve(both, { ...choices, character: 'payload' }).values).toEqual({})
})

it("keeps an editor's density, motion and nav through a style without options, and when a style's default matches", () => {
  const both: Settings = {
    ...settings,
    options: { enhanced: { density: 'comfortable' }, payload: {}, studio: { density: 'compact' } }
  }
  const onPayload = normalize(both, { character: 'payload', personal: { density: 'compact' } })

  expect(onPayload).toEqual({ character: 'payload', personal: { density: 'compact' } })
  expect(resolve(both, { ...onPayload, character: 'enhanced' })).toMatchObject({ changed: 1, values: { density: 'compact' } })
  expect(resolve(both, { ...onPayload, character: 'studio' })).toMatchObject({ changed: 0, values: { density: 'compact' } })
})

it('reads a cookie that holds only personal choices', () => {
  expect(parseChoices(settings, JSON.stringify({ personal: { density: 'comfortable', radius: 'lg' } }))).toEqual({
    personal: { density: 'comfortable' }
  })
})

it('keeps the custom palette while another palette is picked', () => {
  expect(resolve(settings, { custom, palette: 'payload' })).toMatchObject({ custom, palette: 'payload' })
})

it('drops characters, palettes, options and values the settings do not allow', () => {
  const onlyEnhanced: Settings = { ...settings, options: { enhanced: settings.options.enhanced }, palettes: ['neutral'] }

  expect(
    normalize(onlyEnhanced, {
      character: 'payload',
      options: { enhanced: { density: 'huge', icons: 'payload', motion: 'on' } },
      palette: 'payload'
    })
  ).toEqual({ options: { enhanced: { icons: 'payload' } } })
  expect(
    normalize(settings, { character: 'constructor', options: { payload: { density: 'comfortable' } }, palette: 'neon' })
  ).toEqual({})
})

it('keeps a custom palette only when every color is a lowercase #rrggbb, and picks it only when it exists', () => {
  expect(normalize(settings, { custom: { ...custom, extra: true, light: { ...custom.light, glow: '#000000' } } })).toEqual({
    custom
  })
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
      options: { enhanced: { density: 'compact', icons: 'payload' }, payload: {} },
      palette: 'neutral'
    })
  ).toEqual({ options: { enhanced: { icons: 'payload' } } })
  expect(normalize(settings, { character: 'payload', options: { enhanced: { icons: 'payload' } }, palette: 'payload' })).toEqual({
    character: 'payload',
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

it('sets the custom palette aside while the developer allows a single palette', () => {
  const single = normalize({ ...settings, palettes: ['neutral'] }, { custom, palette: 'custom' })

  expect(single).toEqual({ custom })
  expect(normalize(settings, single)).toEqual({ custom })
})

it('rejects text that is not a setup', () => {
  expect(parseChoices(settings, undefined)).toBeUndefined()
  expect(parseChoices(settings, '')).toBeUndefined()
  expect(parseChoices(settings, '{"character":')).toBeUndefined()
  expect(parseChoices(settings, '"stock"')).toBeUndefined()
  expect(parseChoices(settings, '["stock"]')).toBeUndefined()
  expect(parseChoices(settings, '{}')).toBeUndefined()
  expect(parseChoices(settings, '{"name":"stock"}')).toBeUndefined()
  expect(parseChoices(settings, '{"character":"payload"}')).toEqual({ character: 'payload' })
})

it('pastes a copied setup into the same resolved', () => {
  const other: Settings = { ...settings, character: 'payload', palette: 'payload' }
  const cases = [
    resolve(settings, { custom, options: { enhanced: { icons: 'payload' } }, palette: 'custom' }),
    resolve(settings, { options: { enhanced: { icons: 'payload' } }, palette: 'payload' }),
    resolve(settings, { character: 'payload' }),
    resolve(settings, { personal: { density: 'comfortable' } }),
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
  expect(setupOf(resolve(settings, { character: 'payload', custom }))).toEqual({ character: 'payload', palette: 'neutral' })
  expect(setupOf(resolve(settings, { character: 'payload', custom, palette: 'custom' }))).toEqual({
    character: 'payload',
    custom,
    palette: 'custom'
  })
})
