import type { User } from 'payload'

import { type Character, type Option, options, personalOptions, type Values } from '../characters/index.js'
import type { Palette } from '../palettes/index.js'

export type Panel = boolean | ((args: { user: User }) => boolean)

export const isEditable = (panel: Panel, user: undefined | User) =>
  typeof panel === 'function' ? !user || panel({ user }) : panel

export const preferenceKey = 'payloadpack-appearance'

export type Settings = {
  character: Character
  options: Partial<Record<Character, Values>>
  palette: Palette
  palettes: Palette[]
}

export const customPalette = 'custom' as const

export const bases = ['background', 'surface', 'text', 'primary'] as const

export type Base = Record<(typeof bases)[number], string>

export const baseTokens: Base = {
  background: '--payloadpack-bg-app',
  primary: '--payloadpack-action-primary',
  surface: '--payloadpack-bg-surface',
  text: '--payloadpack-text-primary'
}

export type CustomPalette = { accent: string; dark: Base; light: Base }

export type Choices = {
  character?: Character
  custom?: CustomPalette
  options?: Partial<Record<Character, Values>>
  palette?: Palette | typeof customPalette
  personal?: Values
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const isPersonal = (option: string) => (personalOptions as readonly string[]).includes(option)

const isOptionValue = (option: string, value: unknown) =>
  Object.hasOwn(options, option) && (options[option as Option] as readonly unknown[]).includes(value)

const isCharacterValue = (option: string, value: unknown) => !isPersonal(option) && isOptionValue(option, value)

const isPersonalValue = (option: string, value: unknown) => isPersonal(option) && isOptionValue(option, value)

const only = (values: object, keep: (option: string, value: unknown) => boolean) => {
  const kept = Object.entries(values).filter(([option, value]) => keep(option, value))
  return kept.length ? (Object.fromEntries(kept) as Values) : undefined
}

export const isHex = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/.test(value)

const baseOf = (value: unknown) =>
  isRecord(value) && bases.every((base) => isHex(value[base]))
    ? (Object.fromEntries(bases.map((base) => [base, value[base]])) as Base)
    : undefined

const customOf = (value: unknown): CustomPalette | undefined => {
  if (!isRecord(value) || !isHex(value.accent)) {
    return undefined
  }
  const [dark, light] = [baseOf(value.dark), baseOf(value.light)]
  return dark && light ? { accent: value.accent, dark, light } : undefined
}

const pick = (allowed: readonly string[], fallback: string, value: unknown) =>
  typeof value === 'string' && value !== fallback && allowed.includes(value) ? value : undefined

const changed = (defaults: object, input: unknown, isValid: (key: string, value: unknown) => boolean) => {
  const picked = isRecord(input) ? input : {}
  const kept = Object.entries(defaults).filter(([key, fallback]) => picked[key] !== fallback && isValid(key, picked[key]))
  return kept.length ? Object.fromEntries(kept.map(([key]) => [key, picked[key]])) : undefined
}

export function normalize(settings: Settings, input: unknown): Choices {
  const raw = isRecord(input) ? input : {}
  const pickedOptions = isRecord(raw.options) ? raw.options : {}
  const character = pick(Object.keys(settings.options), settings.character, raw.character)
  const options = Object.entries(settings.options).flatMap(([name, defaults]) => {
    const values = changed(defaults, pickedOptions[name], isCharacterValue)
    return values ? [[name, values]] : []
  })
  const defaults = settings.options[(character ?? settings.character) as Character] ?? {}
  const personal = isRecord(raw.personal)
    ? only(
        raw.personal,
        (option, value) =>
          isPersonalValue(option, value) &&
          Object.values(settings.options).some((values) => Object.hasOwn(values, option) && values[option as Option] !== value)
      )
    : changed(defaults, pickedOptions[character ?? settings.character], isPersonalValue)
  const custom = customOf(raw.custom)
  const picksCustom = custom && settings.palettes.length > 1 && raw.palette === customPalette
  const choices = {
    character,
    custom,
    options: options.length ? Object.fromEntries(options) : undefined,
    palette: picksCustom ? customPalette : pick(settings.palettes, settings.palette, raw.palette),
    personal
  }

  return Object.fromEntries(Object.entries(choices).filter(([, value]) => value !== undefined)) as Choices
}

export function resolve(settings: Settings, choices: Choices) {
  const character = choices.character ?? settings.character
  const palette = choices.palette ?? settings.palette
  const defaults = settings.options[character] ?? {}
  const personal = only(
    choices.personal ?? {},
    (option, value) => Object.hasOwn(defaults, option) && defaults[option as Option] !== value
  )
  return {
    changed: Object.keys({ ...choices.options?.[character], ...personal }).length,
    character,
    custom: choices.custom,
    palette,
    values: { ...defaults, ...choices.options?.[character], ...personal }
  }
}

export const setupOf = ({ character, custom, palette, values }: ReturnType<typeof resolve>): Choices => ({
  character,
  ...(Object.keys(values).length ? { options: { [character]: values } } : {}),
  palette,
  ...(palette === customPalette ? { custom } : {})
})

export function pasteSetup(settings: Settings, choices: Choices, text: string): Choices | undefined {
  const pasted = parseChoices(settings, text)
  if (!pasted) {
    return undefined
  }
  const character = pasted.character ?? settings.character
  const declared = settings.options[character] ?? {}
  return normalize(settings, {
    character: pasted.character,
    custom: pasted.custom ?? choices.custom,
    options: { ...choices.options, [character]: pasted.options?.[character] },
    palette: pasted.palette,
    personal: { ...only(choices.personal ?? {}, (option) => !Object.hasOwn(declared, option)), ...pasted.personal }
  })
}

const declarations = (base: Base, indent: string) =>
  bases.map((name) => `${indent}${baseTokens[name]}: ${base[name]};\n`).join('')

export const paletteCss = (name: string, { accent, dark, light }: CustomPalette) =>
  `[data-palette='${name}'] {\n${declarations(light, '  ')}  --payloadpack-accent: ${accent};\n\n  &[data-theme='dark'] {\n${declarations(dark, '    ')}  }\n}\n`

const setupKeys = ['character', 'custom', 'options', 'palette', 'personal']

export function parseChoices(settings: Settings, text: string | undefined): Choices | undefined {
  if (!text) {
    return undefined
  }

  try {
    const parsed: unknown = JSON.parse(text)
    return isRecord(parsed) && setupKeys.some((key) => Object.hasOwn(parsed, key)) ? normalize(settings, parsed) : undefined
  } catch (error) {
    if (error instanceof SyntaxError) {
      return undefined
    }
    throw error
  }
}
