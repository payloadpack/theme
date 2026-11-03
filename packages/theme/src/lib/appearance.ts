import type { User } from 'payload'

import { type Character, type Option, options, type Values } from '../characters/index.js'
import type { Palette } from '../palettes/index.js'

export type Panel = boolean | ((args: { user: User }) => boolean)

export const isEditable = (panel: Panel, user: undefined | User) =>
  typeof panel === 'function' ? !user || panel({ user }) : panel

export const preferenceKey = 'payloadpack-appearance'

export type Settings = {
  accents: Record<string, string>
  character: Character
  options: Partial<Record<Character, Values>>
  palette: Palette
}

export type Choices = {
  accent?: Partial<Record<Palette, string>>
  character?: Character
  options?: Partial<Record<Character, Values>>
  palette?: Palette
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isOptionValue = (option: string, value: unknown) =>
  Object.hasOwn(options, option) && (options[option as Option] as readonly unknown[]).includes(value)

export const hexPattern = /^#[0-9a-f]{6}$/

const isHex = (_: string, value: unknown) => typeof value === 'string' && hexPattern.test(value)

const pick = (allowed: object, fallback: string, value: unknown) =>
  typeof value === 'string' && value !== fallback && Object.hasOwn(allowed, value) ? value : undefined

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
  const choices = {
    character: pick(settings.options, settings.character, raw.character),
    options: options.length ? Object.fromEntries(options) : undefined,
    palette: pick(settings.accents, settings.palette, raw.palette),
    accent: changed(settings.accents, raw.accent, isHex)
  }

  return Object.fromEntries(Object.entries(choices).filter(([, value]) => value !== undefined)) as Choices
}

export function resolve(settings: Settings, choices: Choices) {
  const character = choices.character ?? settings.character
  const palette = choices.palette ?? settings.palette
  return {
    accent: choices.accent?.[palette] ?? settings.accents[palette],
    character,
    palette,
    values: { ...settings.options[character], ...choices.options?.[character] }
  }
}

export const setupOf = ({ accent, character, palette, values }: ReturnType<typeof resolve>): Choices => ({
  character,
  ...(Object.keys(values).length ? { options: { [character]: values } } : {}),
  palette,
  accent: { [palette]: accent }
})

export function parseChoices(settings: Settings, text: string | undefined): Choices | undefined {
  if (!text) {
    return undefined
  }

  try {
    const parsed: unknown = JSON.parse(text)
    return isRecord(parsed) ? normalize(settings, parsed) : undefined
  } catch (error) {
    if (error instanceof SyntaxError) {
      return undefined
    }
    throw error
  }
}
