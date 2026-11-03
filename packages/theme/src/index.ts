import type { Plugin } from 'payload'
import { deepMergeSimple } from 'payload/shared'

import {
  type Character,
  characters as registry,
  type CharacterValues,
  defaultCharacter,
  type Values
} from './characters/index.js'
import type { Panel, Settings } from './lib/appearance.js'
import { defaultPalette, type Palette, palettes as paletteRegistry } from './palettes/index.js'
import { translations } from './translations.js'

const PACKAGE_NAME = '@payloadpack/theme'

export const VERTICAL_TABS = 'payloadpack-vertical-tabs'
export const RADIO_CARDS = 'payloadpack-radio-cards'
export const SWITCH = 'payloadpack-switch'

type OptionsConfig = {
  [C in Character as keyof (typeof registry)[C]['defaults'] extends never ? never : C]?: CharacterValues<C>
}

export type ThemePluginConfig = {
  accent?: Partial<Record<Palette, string>>
  character?: Character
  characters?: Character[]
  codeEditorFontSize?: false | number
  options?: OptionsConfig
  palette?: Palette
  palettes?: Palette[]
  panel?: Panel
}

export function themePlugin(pluginConfig: ThemePluginConfig = {}): Plugin {
  const {
    accent = {},
    character = defaultCharacter,
    characters = Object.keys(registry) as Character[],
    codeEditorFontSize = 13,
    palette = defaultPalette,
    palettes = Object.keys(paletteRegistry) as Palette[],
    panel = true
  } = pluginConfig
  const options: Partial<Record<Character, Values>> = pluginConfig.options ?? {}

  if (!characters.includes(character)) {
    throw new Error(`themePlugin: character '${character}' is not one of characters: ${characters.join(', ')}`)
  }

  if (!palettes.includes(palette)) {
    throw new Error(`themePlugin: palette '${palette}' is not one of palettes: ${palettes.join(', ')}`)
  }

  const settings: Settings = {
    accents: Object.fromEntries(palettes.map((name) => [name, accent[name] ?? paletteRegistry[name].accent])),
    character,
    options: Object.fromEntries(characters.map((name) => [name, { ...registry[name].defaults, ...options[name] }])),
    palette
  }

  return (config) => ({
    ...config,
    admin: {
      ...config.admin,
      suppressHydrationWarning: true,
      components: {
        ...config.admin?.components,
        actions: [
          ...(config.admin?.components?.actions ?? []),
          { path: `${PACKAGE_NAME}/rsc#AppearanceServerPanel`, serverProps: { panel } }
        ],
        providers: [
          ...(config.admin?.components?.providers ?? []),
          { path: `${PACKAGE_NAME}/rsc#AppearanceServerProvider`, serverProps: { codeEditorFontSize, panel, settings } }
        ]
      }
    },
    i18n: {
      ...config.i18n,
      translations: deepMergeSimple(
        Object.fromEntries(Object.keys(config.i18n?.supportedLanguages ?? { en: true }).map((language) => [language, translations])),
        config.i18n?.translations ?? {}
      )
    }
  })
}
