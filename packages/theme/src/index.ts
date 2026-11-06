import type { Field, Plugin } from 'payload'
import { deepMergeSimple } from 'payload/shared'

import {
  type Character,
  characters as registry,
  type CharacterValues,
  defaultCharacter,
  type Values
} from './characters/index.js'
import { customPalette, type Panel, type Settings } from './lib/appearance.js'
import { type BuiltInPalette, builtInPalettes, defaultPalette, type Palette } from './palettes/index.js'
import { translations } from './translations.js'

const PACKAGE_NAME = '@payloadpack/theme'

export const VERTICAL_TABS = 'payloadpack-vertical-tabs'
export const RADIO_CARDS = 'payloadpack-radio-cards'
export const SWITCH = 'payloadpack-switch'

const withCheckboxCells = (fields: Field[]): Field[] =>
  fields.map((field) => {
    if (field.type === 'checkbox') {
      return field.admin?.components?.Cell
        ? field
        : {
            ...field,
            admin: { ...field.admin, components: { ...field.admin?.components, Cell: `${PACKAGE_NAME}/client#CheckboxCell` } }
          }
    }
    if (field.type === 'tabs') {
      return { ...field, tabs: field.tabs.map((tab) => ({ ...tab, fields: withCheckboxCells(tab.fields) })) }
    }
    if ('fields' in field) {
      return { ...field, fields: withCheckboxCells(field.fields) }
    }
    return field
  })

type OptionsConfig = {
  [C in Character as keyof (typeof registry)[C]['defaults'] extends never ? never : C]?: CharacterValues<C>
}

export type ThemePluginConfig = {
  character?: Character
  characters?: Character[]
  codeEditorFontSize?: false | number
  options?: OptionsConfig
  palette?: BuiltInPalette | (string & {})
  palettes?: Palette[]
  panel?: Panel
}

export function themePlugin(pluginConfig: ThemePluginConfig = {}): Plugin {
  const {
    character = defaultCharacter,
    characters = Object.keys(registry) as Character[],
    codeEditorFontSize = 13,
    palette = defaultPalette,
    palettes = builtInPalettes.map((slug) => ({ slug })),
    panel = true
  } = pluginConfig
  const options: Partial<Record<Character, Values>> = pluginConfig.options ?? {}

  if (!characters.includes(character)) {
    throw new Error(`themePlugin: character '${character}' is not one of characters: ${characters.join(', ')}`)
  }

  const slugs = palettes.map(({ slug }) => slug)

  if (!slugs.includes(palette)) {
    throw new Error(`themePlugin: palette '${palette}' is not one of palettes: ${slugs.join(', ')}`)
  }

  if (slugs.includes(customPalette)) {
    throw new Error(`themePlugin: '${customPalette}' is the editor's own palette, so no palette may use it as its slug`)
  }

  const settings: Settings = {
    character,
    options: Object.fromEntries(characters.map((name) => [name, { ...registry[name].defaults, ...options[name] }])),
    palette,
    palettes
  }

  return (config) => ({
    ...config,
    collections: characters.some((name) => name !== 'payload')
      ? config.collections?.map((collection) => ({ ...collection, fields: withCheckboxCells(collection.fields) }))
      : config.collections,
    admin: {
      ...config.admin,
      suppressHydrationWarning: true,
      components: {
        ...config.admin?.components,
        actions: [
          ...(config.admin?.components?.actions ?? []),
          { path: `${PACKAGE_NAME}/rsc#AppearanceServerPanel`, serverProps: { panel } }
        ],
        beforeNav: [...(config.admin?.components?.beforeNav ?? []), `${PACKAGE_NAME}/client#NavBar`],
        providers: [
          ...(config.admin?.components?.providers ?? []),
          { path: `${PACKAGE_NAME}/rsc#AppearanceServerProvider`, serverProps: { codeEditorFontSize, panel, settings } }
        ]
      }
    },
    i18n: {
      ...config.i18n,
      translations: deepMergeSimple(
        Object.fromEntries(
          Object.keys(config.i18n?.supportedLanguages ?? { en: true }).map((language) => [language, translations])
        ),
        config.i18n?.translations ?? {}
      )
    }
  })
}
