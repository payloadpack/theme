import { expect, it } from 'vitest'

import type { User } from 'payload'

import {
  type CustomPalette,
  isEditable,
  normalize,
  paletteCss,
  parseChoices,
  pasteSetup,
  resetCharacter,
  resolve,
  type Settings,
  setupOf,
  storedChoices
} from '../src/lib/appearance.js'

const settings: Settings = {
  character: 'enhanced',
  options: { enhanced: { density: 'compact', icons: 'lucide' }, payload: {} },
  palette: 'neutral',
  palettes: [{ slug: 'payload' }, { slug: 'neutral' }]
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

it("forgets a personal pick that matches every style's default, so the editor follows later defaults", () => {
  const both: Settings = { ...settings, options: { enhanced: { density: 'comfortable' }, studio: { density: 'comfortable' } } }

  expect(normalize(both, { personal: { density: 'comfortable' } })).toEqual({})
})

it('pasting a setup replaces the personal options its style declares and keeps the rest of yours', () => {
  const both: Settings = {
    ...settings,
    options: { enhanced: { density: 'comfortable', nav: 'rail' }, payload: {}, studio: { density: 'comfortable', nav: 'rail' } }
  }
  const mine = { personal: { density: 'compact', nav: 'hidden' } } as const

  expect(pasteSetup(both, mine, JSON.stringify({ character: 'payload', palette: 'neutral' }))?.personal).toEqual(mine.personal)
  const studio = pasteSetup(
    both,
    mine,
    JSON.stringify({ character: 'studio', options: { studio: { density: 'compact', nav: 'rail' } } })
  )
  expect(resolve(both, studio ?? {}).values).toEqual({ density: 'compact', nav: 'rail' })
})

it('pasting a setup for a style this site does not offer takes only its palette and keeps your options', () => {
  const mine = { options: { enhanced: { icons: 'payload' } }, personal: { density: 'comfortable' } } as const

  expect(
    pasteSetup(
      settings,
      mine,
      JSON.stringify({ character: 'studio', options: { studio: { icons: 'payload' } }, palette: 'payload' })
    )
  ).toEqual({ ...mine, palette: 'payload' })
})

it('pasting a setup without a style takes only its palette and keeps your style and options', () => {
  const mine = {
    character: 'payload',
    options: { enhanced: { icons: 'payload' } },
    personal: { density: 'comfortable' }
  } as const

  expect(pasteSetup(settings, mine, JSON.stringify({ palette: 'payload' }))).toEqual({ ...mine, palette: 'payload' })
  expect(pasteSetup(settings, { ...mine, palette: 'payload' }, JSON.stringify({ options: { enhanced: {} } }))).toEqual({
    ...mine,
    palette: 'payload'
  })
})

it("resets a style without dropping a personal pick that is this style's default but not another's", () => {
  const both: Settings = {
    ...settings,
    options: { enhanced: { density: 'comfortable', radius: 'md' }, payload: {}, studio: { density: 'compact', radius: 'lg' } }
  }
  const choices = { options: { enhanced: { radius: 'full' } }, personal: { density: 'comfortable' } } as const

  expect(normalize(both, resetCharacter(both, choices, 'enhanced'))).toEqual({ personal: { density: 'comfortable' } })
  expect(normalize(both, resetCharacter(both, choices, 'studio'))).toEqual({ options: { enhanced: { radius: 'full' } } })
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
  const onlyEnhanced: Settings = {
    ...settings,
    options: { enhanced: settings.options.enhanced },
    palettes: [{ slug: 'neutral' }]
  }

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

it("keeps the app's own palette when the settings offer it", () => {
  const withBrand: Settings = { ...settings, palettes: [...settings.palettes, { label: 'Brand', slug: 'brand' }] }

  expect(normalize(withBrand, { palette: 'brand' })).toEqual({ palette: 'brand' })
})

it('keeps a custom palette only when every color is a #rrggbb, stores it lowercase, and picks it only when it exists', () => {
  expect(normalize(settings, { custom: { ...custom, extra: true, light: { ...custom.light, glow: '#000000' } } })).toEqual({
    custom
  })
  expect(
    normalize(settings, {
      custom: { ...custom, accent: '#C2410C', light: { ...custom.light, surface: '#FFFFFF' } },
      palette: 'custom'
    })
  ).toEqual({ custom, palette: 'custom' })
  expect(normalize(settings, { custom: { ...custom, accent: '#c2410' } })).toEqual({})
  expect(normalize(settings, { custom: { ...custom, dark: { ...custom.dark, text: 'white' } } })).toEqual({})
  expect(normalize(settings, { palette: 'custom' })).toEqual({})
})

it('writes the custom palette as the same CSS block a built-in palette is', () => {
  expect(paletteCss('custom', custom)).toBe(
    [
      "[data-palette='custom'] {",
      '  --payloadpack-bg-app: #f1f0ec;',
      '  --payloadpack-bg-surface: #ffffff;',
      '  --payloadpack-text-primary: #1c1b18;',
      '  --payloadpack-action-primary: #1c1b18;',
      '  --payloadpack-accent: #c2410c;',
      '  --payloadpack-text-secondary: color-mix(in srgb, var(--payloadpack-text-primary) 62%, transparent);',
      '',
      "  &[data-theme='dark'] {",
      '    --payloadpack-bg-app: #131312;',
      '    --payloadpack-bg-surface: #1c1c1b;',
      '    --payloadpack-text-primary: #f2f1ec;',
      '    --payloadpack-action-primary: #f2f1ec;',
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
  const single = normalize({ ...settings, palettes: [{ slug: 'neutral' }] }, { custom, palette: 'custom' })

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

it("renders the newer of the stored setup and this browser's cookie, when the cookie is the same account's", () => {
  const stored = { at: 100, palette: 'payload' }
  const cookie = (at: number, by: string) => JSON.stringify({ at, by, character: 'payload' })

  expect(storedChoices(settings, stored, cookie(200, 'users:1'), 'users:1')).toEqual({
    choices: { at: 200, character: 'payload' },
    storedIsOlder: true
  })
  expect(storedChoices(settings, stored, cookie(50, 'users:1'), 'users:1')).toEqual({ choices: stored, storedIsOlder: false })
  expect(storedChoices(settings, stored, cookie(200, 'users:2'), 'users:1')).toEqual({ choices: stored, storedIsOlder: false })
  expect(storedChoices(settings, { palette: 'payload' }, cookie(1, 'users:1'), 'users:1').storedIsOlder).toBe(true)
  expect(storedChoices(settings, null, cookie(200, 'users:2'), undefined)).toEqual({
    choices: { at: 200, character: 'payload' },
    storedIsOlder: false
  })
})
