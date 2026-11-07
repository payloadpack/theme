import { expect, it } from 'vitest'

import type { User } from 'payload'

import {
  applyPastedSetup,
  buildShareableSetup,
  canUserEditAppearance,
  clearCharacterOptionOverrides,
  type CustomPalette,
  customPaletteCss,
  normalizeEditorAppearanceChoices,
  parseEditorAppearanceChoices,
  pickInitialEditorAppearanceChoices,
  resolveActiveAppearance,
  type SiteAppearanceSettings
} from '../src/lib/appearance.js'

const siteSettings: SiteAppearanceSettings = {
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
  expect(resolveActiveAppearance(siteSettings, {})).toEqual({
    changedOptionCount: 0,
    character: 'enhanced',
    optionValues: { density: 'compact', icons: 'lucide' },
    palette: 'neutral'
  })
  expect(resolveActiveAppearance(siteSettings, { options: { enhanced: { icons: 'payload' } }, palette: 'payload' })).toEqual({
    changedOptionCount: 1,
    character: 'enhanced',
    optionValues: { density: 'compact', icons: 'payload' },
    palette: 'payload'
  })
  expect(resolveActiveAppearance(siteSettings, { character: 'payload', options: { enhanced: { icons: 'payload' } } })).toEqual({
    changedOptionCount: 0,
    character: 'payload',
    optionValues: {},
    palette: 'neutral'
  })
})

it('carries density, motion and nav across styles, and keeps the rest of the look per style', () => {
  const both: SiteAppearanceSettings = {
    ...siteSettings,
    options: { enhanced: { density: 'compact', radius: 'md' }, payload: {}, studio: { density: 'compact', radius: 'lg' } }
  }
  const choices = normalizeEditorAppearanceChoices(both, { options: { enhanced: { density: 'comfortable', radius: 'sm' } } })

  expect(choices).toEqual({ options: { enhanced: { radius: 'sm' } }, personal: { density: 'comfortable' } })
  expect(resolveActiveAppearance(both, { ...choices, character: 'studio' }).optionValues).toEqual({
    density: 'comfortable',
    radius: 'lg'
  })
  expect(resolveActiveAppearance(both, { ...choices, character: 'payload' }).optionValues).toEqual({})
})

it("keeps an editor's density, motion and nav through a style without options, and when a style's default matches", () => {
  const both: SiteAppearanceSettings = {
    ...siteSettings,
    options: { enhanced: { density: 'comfortable' }, payload: {}, studio: { density: 'compact' } }
  }
  const onPayload = normalizeEditorAppearanceChoices(both, { character: 'payload', personal: { density: 'compact' } })

  expect(onPayload).toEqual({ character: 'payload', personal: { density: 'compact' } })
  expect(resolveActiveAppearance(both, { ...onPayload, character: 'enhanced' })).toMatchObject({
    changedOptionCount: 1,
    optionValues: { density: 'compact' }
  })
  expect(resolveActiveAppearance(both, { ...onPayload, character: 'studio' })).toMatchObject({
    changedOptionCount: 0,
    optionValues: { density: 'compact' }
  })
})

it("forgets a personal pick that matches every style's default, so the editor follows later defaults", () => {
  const both: SiteAppearanceSettings = {
    ...siteSettings,
    options: { enhanced: { density: 'comfortable' }, studio: { density: 'comfortable' } }
  }

  expect(normalizeEditorAppearanceChoices(both, { personal: { density: 'comfortable' } })).toEqual({})
})

it('pasting a setup replaces the personal options its style declares and keeps the rest of yours', () => {
  const both: SiteAppearanceSettings = {
    ...siteSettings,
    options: { enhanced: { density: 'comfortable', nav: 'rail' }, payload: {}, studio: { density: 'comfortable', nav: 'rail' } }
  }
  const mine = { personal: { density: 'compact', nav: 'hidden' } } as const

  expect(applyPastedSetup(both, mine, JSON.stringify({ character: 'payload', palette: 'neutral' }))?.personal).toEqual(
    mine.personal
  )
  const studio = applyPastedSetup(
    both,
    mine,
    JSON.stringify({ character: 'studio', options: { studio: { density: 'compact', nav: 'rail' } } })
  )
  expect(resolveActiveAppearance(both, studio ?? {}).optionValues).toEqual({ density: 'compact', nav: 'rail' })
})

it('pasting a setup for a style this site does not offer takes only its palette and keeps your options', () => {
  const mine = { options: { enhanced: { icons: 'payload' } }, personal: { density: 'comfortable' } } as const

  expect(
    applyPastedSetup(
      siteSettings,
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

  expect(applyPastedSetup(siteSettings, mine, JSON.stringify({ palette: 'payload' }))).toEqual({ ...mine, palette: 'payload' })
  expect(applyPastedSetup(siteSettings, { ...mine, palette: 'payload' }, JSON.stringify({ options: { enhanced: {} } }))).toEqual({
    ...mine,
    palette: 'payload'
  })
})

it("resets a style without dropping a personal pick that is this style's default but not another's", () => {
  const both: SiteAppearanceSettings = {
    ...siteSettings,
    options: { enhanced: { density: 'comfortable', radius: 'md' }, payload: {}, studio: { density: 'compact', radius: 'lg' } }
  }
  const choices = { options: { enhanced: { radius: 'full' } }, personal: { density: 'comfortable' } } as const

  expect(normalizeEditorAppearanceChoices(both, clearCharacterOptionOverrides(both, choices, 'enhanced'))).toEqual({
    personal: { density: 'comfortable' }
  })
  expect(normalizeEditorAppearanceChoices(both, clearCharacterOptionOverrides(both, choices, 'studio'))).toEqual({
    options: { enhanced: { radius: 'full' } }
  })
})

it('reads a cookie that holds only personal choices', () => {
  expect(
    parseEditorAppearanceChoices(siteSettings, JSON.stringify({ personal: { density: 'comfortable', radius: 'lg' } }))
  ).toEqual({
    personal: { density: 'comfortable' }
  })
})

it('keeps the custom palette while another palette is picked', () => {
  expect(resolveActiveAppearance(siteSettings, { custom, palette: 'payload' })).toMatchObject({
    customPalette: custom,
    palette: 'payload'
  })
})

it('drops characters, palettes, options and values the settings do not allow', () => {
  const onlyEnhanced: SiteAppearanceSettings = {
    ...siteSettings,
    options: { enhanced: siteSettings.options.enhanced },
    palettes: [{ slug: 'neutral' }]
  }

  expect(
    normalizeEditorAppearanceChoices(onlyEnhanced, {
      character: 'payload',
      options: { enhanced: { density: 'huge', icons: 'payload', motion: 'on' } },
      palette: 'payload'
    })
  ).toEqual({ options: { enhanced: { icons: 'payload' } } })
  expect(
    normalizeEditorAppearanceChoices(siteSettings, {
      character: 'constructor',
      options: { payload: { density: 'comfortable' } },
      palette: 'neon'
    })
  ).toEqual({})
})

it("keeps the app's own palette when the settings offer it", () => {
  const withBrand: SiteAppearanceSettings = {
    ...siteSettings,
    palettes: [...siteSettings.palettes, { label: 'Brand', slug: 'brand' }]
  }

  expect(normalizeEditorAppearanceChoices(withBrand, { palette: 'brand' })).toEqual({ palette: 'brand' })
})

it('keeps a custom palette only when every color is a #rrggbb, stores it lowercase, and picks it only when it exists', () => {
  expect(
    normalizeEditorAppearanceChoices(siteSettings, {
      custom: { ...custom, extra: true, light: { ...custom.light, glow: '#000000' } }
    })
  ).toEqual({
    custom
  })
  expect(
    normalizeEditorAppearanceChoices(siteSettings, {
      custom: { ...custom, accent: '#C2410C', light: { ...custom.light, surface: '#FFFFFF' } },
      palette: 'custom'
    })
  ).toEqual({ custom, palette: 'custom' })
  expect(normalizeEditorAppearanceChoices(siteSettings, { custom: { ...custom, accent: '#c2410' } })).toEqual({})
  expect(
    normalizeEditorAppearanceChoices(siteSettings, { custom: { ...custom, dark: { ...custom.dark, text: 'white' } } })
  ).toEqual({})
  expect(normalizeEditorAppearanceChoices(siteSettings, { palette: 'custom' })).toEqual({})
})

it('writes the custom palette as the same CSS block a built-in palette is', () => {
  expect(customPaletteCss('custom', custom)).toBe(
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
    normalizeEditorAppearanceChoices(siteSettings, {
      character: 'enhanced',
      options: { enhanced: { density: 'compact', icons: 'payload' }, payload: {} },
      palette: 'neutral'
    })
  ).toEqual({ options: { enhanced: { icons: 'payload' } } })
  expect(
    normalizeEditorAppearanceChoices(siteSettings, {
      character: 'payload',
      options: { enhanced: { icons: 'payload' } },
      palette: 'payload'
    })
  ).toEqual({
    character: 'payload',
    options: { enhanced: { icons: 'payload' } },
    palette: 'payload'
  })
})

it('gives the panel only to signed-in editors it allows, and never asks without a user', () => {
  const admin = { role: 'admin' } as unknown as User
  const onlyAdmins = ({ user }: { user: User }) => (user as unknown as { role: string }).role === 'admin'
  const asked = () => {
    throw new Error('panel was asked without a user')
  }

  expect(canUserEditAppearance(true, admin)).toBe(true)
  expect(canUserEditAppearance(true, undefined)).toBe(false)
  expect(canUserEditAppearance(false, admin)).toBe(false)
  expect(canUserEditAppearance(onlyAdmins, admin)).toBe(true)
  expect(canUserEditAppearance(onlyAdmins, { role: 'editor' } as unknown as User)).toBe(false)
  expect(canUserEditAppearance(asked, undefined)).toBe(false)
})

it('sets the custom palette aside while the developer allows a single palette', () => {
  const single = normalizeEditorAppearanceChoices(
    { ...siteSettings, palettes: [{ slug: 'neutral' }] },
    { custom, palette: 'custom' }
  )

  expect(single).toEqual({ custom })
  expect(normalizeEditorAppearanceChoices(siteSettings, single)).toEqual({ custom })
})

it('rejects text that is not a setup', () => {
  expect(parseEditorAppearanceChoices(siteSettings, undefined)).toBeUndefined()
  expect(parseEditorAppearanceChoices(siteSettings, '')).toBeUndefined()
  expect(parseEditorAppearanceChoices(siteSettings, '{"character":')).toBeUndefined()
  expect(parseEditorAppearanceChoices(siteSettings, '"stock"')).toBeUndefined()
  expect(parseEditorAppearanceChoices(siteSettings, '["stock"]')).toBeUndefined()
  expect(parseEditorAppearanceChoices(siteSettings, '{}')).toBeUndefined()
  expect(parseEditorAppearanceChoices(siteSettings, '{"name":"stock"}')).toBeUndefined()
  expect(parseEditorAppearanceChoices(siteSettings, '{"character":"payload"}')).toEqual({ character: 'payload' })
})

it('pastes a copied setup into the same resolved', () => {
  const other: SiteAppearanceSettings = { ...siteSettings, character: 'payload', palette: 'payload' }
  const cases = [
    resolveActiveAppearance(siteSettings, { custom, options: { enhanced: { icons: 'payload' } }, palette: 'custom' }),
    resolveActiveAppearance(siteSettings, { options: { enhanced: { icons: 'payload' } }, palette: 'payload' }),
    resolveActiveAppearance(siteSettings, { character: 'payload' }),
    resolveActiveAppearance(siteSettings, { personal: { density: 'comfortable' } }),
    resolveActiveAppearance(siteSettings, {})
  ]

  for (const resolved of cases) {
    const copied = JSON.stringify(buildShareableSetup(resolved), null, 2)
    expect(resolveActiveAppearance(other, parseEditorAppearanceChoices(other, copied) ?? {})).toEqual(resolved)
  }
})

it('copies a setup in the shape of the plugin config', () => {
  expect(buildShareableSetup(resolveActiveAppearance(siteSettings, {}))).toEqual({
    character: 'enhanced',
    options: { enhanced: { density: 'compact', icons: 'lucide' } },
    palette: 'neutral'
  })
  expect(buildShareableSetup(resolveActiveAppearance(siteSettings, { character: 'payload', custom }))).toEqual({
    character: 'payload',
    palette: 'neutral'
  })
  expect(buildShareableSetup(resolveActiveAppearance(siteSettings, { character: 'payload', custom, palette: 'custom' }))).toEqual(
    {
      character: 'payload',
      custom,
      palette: 'custom'
    }
  )
})

it("renders this account's unsaved cookie over the stored setup, and never another account's", () => {
  const savedPreference = { palette: 'payload' }
  const appearanceCookieJson = (fields: object) => JSON.stringify({ character: 'payload', ...fields })

  expect(
    pickInitialEditorAppearanceChoices(siteSettings, savedPreference, appearanceCookieJson({ by: 'users:1' }), 'users:1')
  ).toEqual({
    editorChoices: { character: 'payload' },
    unsavedInCookie: true
  })
  expect(
    pickInitialEditorAppearanceChoices(siteSettings, savedPreference, appearanceCookieJson({ by: 'users:2' }), 'users:1')
  ).toEqual({
    editorChoices: savedPreference,
    unsavedInCookie: false
  })
  expect(pickInitialEditorAppearanceChoices(siteSettings, savedPreference, appearanceCookieJson({}), 'users:1')).toEqual({
    editorChoices: savedPreference,
    unsavedInCookie: false
  })
  expect(pickInitialEditorAppearanceChoices(siteSettings, null, appearanceCookieJson({ by: 'users:2' }), 'users:1')).toEqual({
    editorChoices: {},
    unsavedInCookie: false
  })
  expect(pickInitialEditorAppearanceChoices(siteSettings, null, '{', 'users:1')).toEqual({
    editorChoices: {},
    unsavedInCookie: false
  })
})
