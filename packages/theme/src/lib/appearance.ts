import type { User } from 'payload'

import { type Character, type Option, options, type Values } from '../characters/index.js'
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

export type CustomPalette = { accent: string; dark: Base; light: Base }

export type Choices = {
  character?: Character
  custom?: CustomPalette
  options?: Partial<Record<Character, Values>>
  palette?: Palette | typeof customPalette
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isOptionValue = (option: string, value: unknown) =>
  Object.hasOwn(options, option) && (options[option as Option] as readonly unknown[]).includes(value)

const isHex = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/.test(value)

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
  const options = Object.entries(settings.options).flatMap(([character, defaults]) => {
    const values = changed(defaults, pickedOptions[character], isOptionValue)
    return values ? [[character, values]] : []
  })
  const custom = settings.palettes.length > 1 ? customOf(raw.custom) : undefined
  const choices = {
    character: pick(Object.keys(settings.options), settings.character, raw.character),
    custom,
    options: options.length ? Object.fromEntries(options) : undefined,
    palette: custom && raw.palette === customPalette ? customPalette : pick(settings.palettes, settings.palette, raw.palette)
  }

  return Object.fromEntries(Object.entries(choices).filter(([, value]) => value !== undefined)) as Choices
}

export function resolve(settings: Settings, choices: Choices) {
  const character = choices.character ?? settings.character
  const palette = choices.palette ?? settings.palette
  return {
    character,
    custom: choices.custom,
    palette,
    values: { ...settings.options[character], ...choices.options?.[character] }
  }
}

export const setupOf = ({ character, custom, palette, values }: ReturnType<typeof resolve>): Choices => ({
  character,
  ...(Object.keys(values).length ? { options: { [character]: values } } : {}),
  palette,
  ...(palette === customPalette ? { custom } : {})
})

const declarations = (base: Base, indent: string) =>
  bases.map((name) => `${indent}--payloadpack-${name}: ${base[name]};\n`).join('')

export const paletteCss = (name: string, { accent, dark, light }: CustomPalette) =>
  `[data-palette='${name}'] {\n${declarations(light, '  ')}  --payloadpack-accent: ${accent};\n\n  &[data-theme='dark'],\n  [data-theme='dark']:not([data-palette]) {\n${declarations(dark, '    ')}  }\n}\n`

const setupKeys = ['character', 'custom', 'options', 'palette']

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
