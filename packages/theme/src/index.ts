import type { Plugin } from 'payload'

import { type Character, characters as registry, type CharacterValues, type Values } from './characters/index.js'
import type { Panel, Settings } from './lib/appearance.js'

const PACKAGE_NAME = '@payloadpack/theme'

export const VERTICAL_TABS = 'payloadpack-vertical-tabs'
export const RADIO_CARDS = 'payloadpack-radio-cards'
export const SWITCH = 'payloadpack-switch'

type CharacterConfigs = {
  [C in Character as keyof (typeof registry)[C]['defaults'] extends never ? never : C]?: CharacterValues<C>
}

export type ThemePluginConfig = CharacterConfigs & {
  character?: Character
  characters?: Character[]
  codeEditorFontSize?: false | number
  panel?: Panel
}

export function themePlugin(pluginConfig: ThemePluginConfig = {}): Plugin {
  const {
    character = 'enhanced',
    characters = Object.keys(registry) as Character[],
    codeEditorFontSize = 13,
    panel = true
  } = pluginConfig
  const developerValues: Partial<Record<Character, Values>> = pluginConfig

  if (!characters.includes(character)) {
    throw new Error(`themePlugin: character '${character}' is not one of characters: ${characters.join(', ')}`)
  }

  const settings: Settings = {
    character,
    defaults: Object.fromEntries(characters.map((name) => [name, { ...registry[name].defaults, ...developerValues[name] }]))
  }

  return (config) => ({
    ...config,
    admin: {
      ...config.admin,
      suppressHydrationWarning: true,
      components: {
        ...config.admin?.components,
        providers: [
          ...(config.admin?.components?.providers ?? []),
          { path: `${PACKAGE_NAME}/rsc#AppearanceServerProvider`, serverProps: { codeEditorFontSize, panel, settings } }
        ]
      }
    }
  })
}
