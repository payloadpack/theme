import type { User } from 'payload'

import {
  ALLOWED_OPTION_VALUES,
  type Character,
  type OptionName,
  type OptionValues,
  PERSONAL_OPTIONS
} from '../characters/index.js'
import type { Palette } from '../palettes/index.js'

export type AppearancePanelAccess = boolean | ((args: { user: User }) => boolean)

export const canUserEditAppearance = (panel: AppearancePanelAccess, user: null | undefined | User) =>
  user ? (typeof panel === 'function' ? panel({ user }) : panel) : false

export const APPEARANCE_PREFERENCE_KEY = 'payloadpack-appearance'

export const getUserAccountKey = (user: null | undefined | { collection: string; id: number | string }) =>
  user ? `${user.collection}:${user.id}` : undefined

export type SiteAppearanceSettings = {
  character: Character
  options: Partial<Record<Character, OptionValues>>
  palette: string
  palettes: Palette[]
}

export const CUSTOM_PALETTE_SLUG = 'custom' as const

export const CUSTOM_PALETTE_BASE_COLOR_NAMES = ['background', 'surface', 'text', 'primary'] as const

export type CustomPaletteBaseColors = Record<(typeof CUSTOM_PALETTE_BASE_COLOR_NAMES)[number], string>

export const BASE_COLOR_TOKEN_NAMES: CustomPaletteBaseColors = {
  background: '--payloadpack-bg-app',
  primary: '--payloadpack-action-primary',
  surface: '--payloadpack-bg-surface',
  text: '--payloadpack-text-primary'
}

export type CustomPalette = { accent: string; dark: CustomPaletteBaseColors; light: CustomPaletteBaseColors }

export type EditorAppearanceChoices = {
  character?: Character
  custom?: CustomPalette
  options?: Partial<Record<Character, OptionValues>>
  palette?: string
  personal?: OptionValues
}

const isNonArrayObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const isPersonalOption = (option: string) => (PERSONAL_OPTIONS as readonly string[]).includes(option)

const isAllowedOptionValue = (option: string, value: unknown) =>
  Object.hasOwn(ALLOWED_OPTION_VALUES, option) &&
  (ALLOWED_OPTION_VALUES[option as OptionName] as readonly unknown[]).includes(value)

const isAllowedCharacterOptionValue = (option: string, value: unknown) =>
  !isPersonalOption(option) && isAllowedOptionValue(option, value)

const isAllowedPersonalOptionValue = (option: string, value: unknown) =>
  isPersonalOption(option) && isAllowedOptionValue(option, value)

const filterOptionValues = (values: object, keep: (option: string, value: unknown) => boolean) => {
  const kept = Object.entries(values).filter(([option, value]) => keep(option, value))
  return kept.length ? (Object.fromEntries(kept) as OptionValues) : undefined
}

export const parseHexColor = (value: unknown) =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : undefined

const parseCustomPaletteBaseColors = (value: unknown) => {
  const colors = isNonArrayObject(value) ? CUSTOM_PALETTE_BASE_COLOR_NAMES.map((base) => [base, parseHexColor(value[base])]) : []
  return colors.length && colors.every(([, color]) => color) ? (Object.fromEntries(colors) as CustomPaletteBaseColors) : undefined
}

const parseCustomPalette = (value: unknown): CustomPalette | undefined => {
  const accent = isNonArrayObject(value) ? parseHexColor(value.accent) : undefined
  const [dark, light] = isNonArrayObject(value)
    ? [parseCustomPaletteBaseColors(value.dark), parseCustomPaletteBaseColors(value.light)]
    : []
  return accent && dark && light ? { accent, dark, light } : undefined
}

const pickAllowedNonDefaultValue = (allowed: readonly string[], fallback: string, value: unknown) =>
  typeof value === 'string' && value !== fallback && allowed.includes(value) ? value : undefined

const pickChangedOptionValues = (defaults: object, input: unknown, isValid: (key: string, value: unknown) => boolean) => {
  const picked = isNonArrayObject(input) ? input : {}
  const kept = Object.entries(defaults).filter(([key, fallback]) => picked[key] !== fallback && isValid(key, picked[key]))
  return kept.length ? Object.fromEntries(kept.map(([key]) => [key, picked[key]])) : undefined
}

export function normalizeEditorAppearanceChoices(
  siteSettings: SiteAppearanceSettings,
  untrustedInput: unknown
): EditorAppearanceChoices {
  const inputObject = isNonArrayObject(untrustedInput) ? untrustedInput : {}
  const pickedOptions = isNonArrayObject(inputObject.options) ? inputObject.options : {}
  const character = pickAllowedNonDefaultValue(Object.keys(siteSettings.options), siteSettings.character, inputObject.character)
  const options = Object.entries(siteSettings.options).flatMap(([name, defaults]) => {
    const values = pickChangedOptionValues(defaults, pickedOptions[name], isAllowedCharacterOptionValue)
    return values ? [[name, values]] : []
  })
  const defaults = siteSettings.options[(character ?? siteSettings.character) as Character] ?? {}
  const personal = isNonArrayObject(inputObject.personal)
    ? filterOptionValues(
        inputObject.personal,
        (option, value) =>
          isAllowedPersonalOptionValue(option, value) &&
          Object.values(siteSettings.options).some(
            (values) => Object.hasOwn(values, option) && values[option as OptionName] !== value
          )
      )
    : pickChangedOptionValues(defaults, pickedOptions[character ?? siteSettings.character], isAllowedPersonalOptionValue)
  const custom = parseCustomPalette(inputObject.custom)
  const picksCustom = custom && siteSettings.palettes.length > 1 && inputObject.palette === CUSTOM_PALETTE_SLUG
  const normalizedChoices = {
    character,
    custom,
    options: options.length ? Object.fromEntries(options) : undefined,
    palette: picksCustom
      ? CUSTOM_PALETTE_SLUG
      : pickAllowedNonDefaultValue(
          siteSettings.palettes.map(({ slug }) => slug),
          siteSettings.palette,
          inputObject.palette
        ),
    personal
  }

  return Object.fromEntries(
    Object.entries(normalizedChoices).filter(([, value]) => value !== undefined)
  ) as EditorAppearanceChoices
}

export function resolveActiveAppearance(siteSettings: SiteAppearanceSettings, editorChoices: EditorAppearanceChoices) {
  const character = editorChoices.character ?? siteSettings.character
  const palette = editorChoices.palette ?? siteSettings.palette
  const defaults = siteSettings.options[character] ?? {}
  const personal = filterOptionValues(
    editorChoices.personal ?? {},
    (option, value) => Object.hasOwn(defaults, option) && defaults[option as OptionName] !== value
  )
  return {
    changedOptionCount: Object.keys({ ...editorChoices.options?.[character], ...personal }).length,
    character,
    customPalette: editorChoices.custom,
    optionValues: { ...defaults, ...editorChoices.options?.[character], ...personal },
    palette
  }
}

export const buildShareableSetup = ({
  character,
  customPalette,
  optionValues,
  palette
}: ReturnType<typeof resolveActiveAppearance>): EditorAppearanceChoices => ({
  character,
  ...(Object.keys(optionValues).length ? { options: { [character]: optionValues } } : {}),
  palette,
  ...(palette === CUSTOM_PALETTE_SLUG ? { custom: customPalette } : {})
})

export const clearCharacterOptionOverrides = (
  siteSettings: SiteAppearanceSettings,
  editorChoices: EditorAppearanceChoices,
  character: Character
): EditorAppearanceChoices => {
  const defaults = siteSettings.options[character] ?? {}
  return {
    ...editorChoices,
    options: { ...editorChoices.options, [character]: undefined },
    personal: filterOptionValues(
      editorChoices.personal ?? {},
      (option, value) => !Object.hasOwn(defaults, option) || defaults[option as OptionName] === value
    )
  }
}

export function applyPastedSetup(
  siteSettings: SiteAppearanceSettings,
  editorChoices: EditorAppearanceChoices,
  text: string
): EditorAppearanceChoices | undefined {
  const rawPastedChoices = parseRawEditorAppearanceChoices(text)
  if (!rawPastedChoices) {
    return undefined
  }
  const pastedChoices = normalizeEditorAppearanceChoices(siteSettings, rawPastedChoices)
  const { character: pastedCharacter, palette: rawPastedPalette } = rawPastedChoices
  if (typeof pastedCharacter !== 'string' || !Object.hasOwn(siteSettings.options, pastedCharacter)) {
    return normalizeEditorAppearanceChoices(siteSettings, {
      ...editorChoices,
      custom: pastedChoices.custom ?? editorChoices.custom,
      palette: rawPastedPalette === undefined ? editorChoices.palette : pastedChoices.palette
    })
  }
  const character = pastedChoices.character ?? siteSettings.character
  const declared = siteSettings.options[character] ?? {}
  return normalizeEditorAppearanceChoices(siteSettings, {
    character: pastedChoices.character,
    custom: pastedChoices.custom ?? editorChoices.custom,
    options: { ...editorChoices.options, [character]: pastedChoices.options?.[character] },
    palette: pastedChoices.palette,
    personal: {
      ...filterOptionValues(editorChoices.personal ?? {}, (option) => !Object.hasOwn(declared, option)),
      ...pastedChoices.personal
    }
  })
}

const baseColorDeclarations = (base: CustomPaletteBaseColors, indent: string) =>
  CUSTOM_PALETTE_BASE_COLOR_NAMES.map((name) => `${indent}${BASE_COLOR_TOKEN_NAMES[name]}: ${base[name]};\n`).join('')

export const customPaletteCss = (name: string, { accent, dark, light }: CustomPalette) =>
  `[data-palette='${name}'] {\n${baseColorDeclarations(light, '  ')}  --payloadpack-accent: ${accent};\n  --payloadpack-text-secondary: color-mix(in srgb, var(--payloadpack-text-primary) 62%, transparent);\n\n  &[data-theme='dark'] {\n${baseColorDeclarations(dark, '    ')}  }\n}\n`

const EDITOR_APPEARANCE_CHOICE_KEYS = ['character', 'custom', 'options', 'palette', 'personal']

const parseJsonOrUndefined = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return undefined
    }
    throw error
  }
}

function parseRawEditorAppearanceChoices(text: string) {
  const parsed = parseJsonOrUndefined(text)
  return isNonArrayObject(parsed) && EDITOR_APPEARANCE_CHOICE_KEYS.some((key) => Object.hasOwn(parsed, key)) ? parsed : undefined
}

export function parseEditorAppearanceChoices(
  siteSettings: SiteAppearanceSettings,
  text: string
): EditorAppearanceChoices | undefined {
  const rawChoices = parseRawEditorAppearanceChoices(text)
  return rawChoices && normalizeEditorAppearanceChoices(siteSettings, rawChoices)
}
