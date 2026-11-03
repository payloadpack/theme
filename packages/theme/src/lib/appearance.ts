import type { User } from 'payload'

import { type Character, type Option, options, type Values } from '../characters/index.js'
import type { Palette } from '../palettes/index.js'

export type Panel = boolean | ((args: { user: User }) => boolean)

export const isEditable = (panel: Panel, user: undefined | User) => (typeof panel === 'function' ? !user || panel({ user }) : panel)

export type Settings = {
  accents: Record<string, string>
  character: Character
  defaults: Partial<Record<Character, Values>>
  palette: Palette
}

export type Choices = {
  accent?: Partial<Record<Palette, string>>
  character?: Character
  palette?: Palette
} & Partial<Record<Character, Values>>

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const isAllowed = (settings: Settings, value: unknown): value is Character =>
  typeof value === 'string' && Object.hasOwn(settings.defaults, value)

const isOptionValue = (option: string, value: unknown) =>
  Object.hasOwn(options, option) && (options[option as Option] as readonly unknown[]).includes(value)

const isHex = (value: unknown) => typeof value === 'string' && /^#[0-9a-f]{6}$/.test(value)

export function normalize(settings: Settings, input: unknown): Choices {
  const raw = isRecord(input) ? input : {}
  const choices: Choices = {}

  if (isAllowed(settings, raw.character) && raw.character !== settings.character) {
    choices.character = raw.character
  }

  if (typeof raw.palette === 'string' && Object.hasOwn(settings.accents, raw.palette) && raw.palette !== settings.palette) {
    choices.palette = raw.palette as Palette
  }

  const accent = Object.fromEntries(
    Object.entries(settings.accents).flatMap(([palette, fallback]) => {
      const value = isRecord(raw.accent) ? raw.accent[palette] : undefined
      return value !== fallback && isHex(value) ? [[palette, value]] : []
    })
  )

  if (Object.keys(accent).length) {
    choices.accent = accent
  }

  for (const [character, defaults] of Object.entries(settings.defaults)) {
    const picked = raw[character]
    const values = Object.fromEntries(
      Object.entries(defaults).flatMap(([option, fallback]) => {
        const value = isRecord(picked) ? picked[option] : undefined
        return value !== fallback && isOptionValue(option, value) ? [[option, value]] : []
      })
    )

    if (Object.keys(values).length) {
      choices[character as Character] = values
    }
  }

  return choices
}

export function resolve(settings: Settings, choices: Choices) {
  const character = choices.character ?? settings.character
  const palette = choices.palette ?? settings.palette
  return {
    accent: choices.accent?.[palette] ?? settings.accents[palette],
    character,
    palette,
    values: { ...settings.defaults[character], ...choices[character] }
  }
}

export function parseChoices(settings: Settings, cookie: string | undefined): Choices {
  if (!cookie) {
    return {}
  }

  try {
    return normalize(settings, JSON.parse(cookie))
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {}
    }
    throw error
  }
}
