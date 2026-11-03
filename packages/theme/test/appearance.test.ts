import { expect, it } from 'vitest'

import type { User } from 'payload'

import { isEditable, normalize, parseChoices, resolve, type Settings } from '../src/lib/appearance.js'

const settings: Settings = {
  character: 'enhanced',
  defaults: { enhanced: { density: 'compact', icons: 'lucide' }, stock: {} }
}

it('layers the editor choices over the developer defaults', () => {
  expect(resolve(settings, {})).toEqual({ character: 'enhanced', values: { density: 'compact', icons: 'lucide' } })
  expect(resolve(settings, { enhanced: { icons: 'payload' } })).toEqual({
    character: 'enhanced',
    values: { density: 'compact', icons: 'payload' }
  })
  expect(resolve(settings, { character: 'stock', enhanced: { icons: 'payload' } })).toEqual({ character: 'stock', values: {} })
})

it('drops characters, options and values the settings do not allow', () => {
  const onlyEnhanced: Settings = { ...settings, defaults: { enhanced: settings.defaults.enhanced } }

  expect(normalize(onlyEnhanced, { character: 'stock', enhanced: { density: 'huge', icons: 'payload', motion: 'on' } })).toEqual({
    enhanced: { icons: 'payload' }
  })
  expect(normalize(settings, { character: 'constructor', stock: { density: 'comfortable' } })).toEqual({})
})

it('keeps only choices that differ from the defaults, per character', () => {
  expect(
    normalize(settings, { character: 'enhanced', enhanced: { density: 'compact', icons: 'payload' }, stock: {} })
  ).toEqual({ enhanced: { icons: 'payload' } })
  expect(normalize(settings, { character: 'stock', enhanced: { icons: 'payload' } })).toEqual({
    character: 'stock',
    enhanced: { icons: 'payload' }
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
