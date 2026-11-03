import { expect, it } from 'vitest'

import type { User } from 'payload'

import { isEditable, normalize, parseChoices, resolve, type Settings } from '../src/lib/appearance.js'

const settings: Settings = {
  accents: { payload: '#0d99ff', warm: '#0d99ff' },
  character: 'enhanced',
  defaults: { enhanced: { density: 'compact', icons: 'lucide' }, stock: {} },
  palette: 'warm'
}

it('layers the editor choices over the developer defaults', () => {
  expect(resolve(settings, {})).toEqual({
    accent: '#0d99ff',
    character: 'enhanced',
    palette: 'warm',
    values: { density: 'compact', icons: 'lucide' }
  })
  expect(resolve(settings, { enhanced: { icons: 'payload' }, palette: 'payload' })).toEqual({
    accent: '#0d99ff',
    character: 'enhanced',
    palette: 'payload',
    values: { density: 'compact', icons: 'payload' }
  })
  expect(resolve(settings, { character: 'stock', enhanced: { icons: 'payload' } })).toEqual({
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
  const onlyEnhanced: Settings = { ...settings, accents: { warm: '#0d99ff' }, defaults: { enhanced: settings.defaults.enhanced } }

  expect(
    normalize(onlyEnhanced, {
      accent: { payload: '#be185d' },
      character: 'stock',
      enhanced: { density: 'huge', icons: 'payload', motion: 'on' },
      palette: 'payload'
    })
  ).toEqual({ enhanced: { icons: 'payload' } })
  expect(normalize(settings, { character: 'constructor', palette: 'neon', stock: { density: 'comfortable' } })).toEqual({})
})

it('keeps only lowercase #rrggbb accents', () => {
  expect(normalize(settings, { accent: { neon: '#123456', payload: '#BE185D', warm: 'red' } })).toEqual({})
  expect(normalize(settings, { accent: { payload: '#be185d', warm: '#7c3aed80' } })).toEqual({ accent: { payload: '#be185d' } })
})

it('keeps only choices that differ from the defaults, per character', () => {
  expect(
    normalize(settings, {
      accent: { warm: '#0d99ff' },
      character: 'enhanced',
      enhanced: { density: 'compact', icons: 'payload' },
      palette: 'warm',
      stock: {}
    })
  ).toEqual({ enhanced: { icons: 'payload' } })
  expect(normalize(settings, { character: 'stock', enhanced: { icons: 'payload' }, palette: 'payload' })).toEqual({
    character: 'stock',
    enhanced: { icons: 'payload' },
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

it('falls back to no choices for a missing or malformed cookie', () => {
  expect(parseChoices(settings, undefined)).toEqual({})
  expect(parseChoices(settings, '{"character":')).toEqual({})
  expect(parseChoices(settings, '"stock"')).toEqual({})
  expect(parseChoices(settings, '{"character":"stock"}')).toEqual({ character: 'stock' })
})
