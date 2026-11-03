import { expect, it } from 'vitest'

import type { User } from 'payload'

import { isEditable, normalize, parseChoices, resolve, type Settings, setupOf } from '../src/lib/appearance.js'

const settings: Settings = {
  accents: { payload: '#0d99ff', warm: '#0d99ff' },
  character: 'enhanced',
  options: { enhanced: { density: 'compact', icons: 'lucide' }, stock: {} },
  palette: 'warm'
}

it('layers the editor choices over the developer defaults', () => {
  expect(resolve(settings, {})).toEqual({
    accent: '#0d99ff',
    character: 'enhanced',
    palette: 'warm',
    values: { density: 'compact', icons: 'lucide' }
  })
  expect(resolve(settings, { options: { enhanced: { icons: 'payload' } }, palette: 'payload' })).toEqual({
    accent: '#0d99ff',
    character: 'enhanced',
    palette: 'payload',
    values: { density: 'compact', icons: 'payload' }
  })
  expect(resolve(settings, { character: 'stock', options: { enhanced: { icons: 'payload' } } })).toEqual({
    accent: '#0d99ff',
    character: 'stock',
    palette: 'warm',
    values: {}
  })
})

it('keeps each palette its own accent across switches', () => {
  const accent = { payload: '#be185d', warm: '#7c3aed' }

  expect(resolve(settings, { accent, palette: 'payload' }).accent).toBe('#be185d')
  expect(resolve(settings, { accent }).accent).toBe('#7c3aed')
  expect(resolve(settings, { accent: { payload: '#be185d' } }).accent).toBe('#0d99ff')
})

it('drops characters, palettes, options and values the settings do not allow', () => {
  const onlyEnhanced: Settings = { ...settings, accents: { warm: '#0d99ff' }, options: { enhanced: settings.options.enhanced } }

  expect(
    normalize(onlyEnhanced, {
      accent: { payload: '#be185d' },
      character: 'stock',
      options: { enhanced: { density: 'huge', icons: 'payload', motion: 'on' } },
      palette: 'payload'
    })
  ).toEqual({ options: { enhanced: { icons: 'payload' } } })
  expect(
    normalize(settings, { character: 'constructor', options: { stock: { density: 'comfortable' } }, palette: 'neon' })
  ).toEqual({})
})

it('keeps only lowercase #rrggbb accents', () => {
  expect(normalize(settings, { accent: { neon: '#123456', payload: '#BE185D', warm: 'red' } })).toEqual({})
  expect(normalize(settings, { accent: { payload: '#be185d', warm: '#7c3aed80' } })).toEqual({ accent: { payload: '#be185d' } })
})

it('keeps only choices that differ from the defaults, per character and palette', () => {
  expect(
    normalize(settings, {
      accent: { payload: '#be185d', warm: '#0d99ff' },
      character: 'enhanced',
      options: { enhanced: { density: 'compact', icons: 'payload' }, stock: {} },
      palette: 'warm'
    })
  ).toEqual({ accent: { payload: '#be185d' }, options: { enhanced: { icons: 'payload' } } })
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

it('rejects text that is not a JSON object, and drops an old-shape cookie', () => {
  expect(parseChoices(settings, undefined)).toBeUndefined()
  expect(parseChoices(settings, '')).toBeUndefined()
  expect(parseChoices(settings, '{"character":')).toBeUndefined()
  expect(parseChoices(settings, '"stock"')).toBeUndefined()
  expect(parseChoices(settings, '["stock"]')).toBeUndefined()
  expect(parseChoices(settings, '{"character":"stock"}')).toEqual({ character: 'stock' })
  expect(parseChoices(settings, '{"enhanced":{"density":"comfortable","icons":"payload"}}')).toEqual({})
})

it('pastes a copied setup into the same look', () => {
  const other: Settings = {
    ...settings,
    accents: { payload: '#be185d', warm: '#0d99ff' },
    character: 'stock',
    palette: 'payload'
  }
  const looks = [
    resolve(settings, { accent: { payload: '#c2410c' }, options: { enhanced: { icons: 'payload' } }, palette: 'payload' }),
    resolve(settings, { character: 'stock' }),
    resolve(settings, {})
  ]

  for (const look of looks) {
    const copied = JSON.stringify(setupOf(look), null, 2)
    expect(resolve(other, parseChoices(other, copied) ?? {})).toEqual(look)
  }
})

it('copies a setup in the shape of the plugin config', () => {
  expect(setupOf(resolve(settings, {}))).toEqual({
    accent: { warm: '#0d99ff' },
    character: 'enhanced',
    options: { enhanced: { density: 'compact', icons: 'lucide' } },
    palette: 'warm'
  })
  expect(setupOf(resolve(settings, { character: 'stock' }))).toEqual({
    accent: { warm: '#0d99ff' },
    character: 'stock',
    palette: 'warm'
  })
})
