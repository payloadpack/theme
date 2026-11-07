import type { Field, Plugin } from 'payload'
import { deepMergeSimple } from 'payload/shared'

import {
  type Character,
  type CharacterOptionValues,
  CHARACTERS,
  DEFAULT_CHARACTER,
  type OptionValues
} from './characters/index.js'
import { type AppearancePanelAccess, CUSTOM_PALETTE_SLUG, type SiteAppearanceSettings } from './lib/appearance.js'
import { type BuiltInPalette, BUILT_IN_PALETTES, DEFAULT_PALETTE, type Palette } from './palettes/index.js'
import { TRANSLATIONS } from './translations.js'

const PACKAGE_NAME = '@payloadpack/theme'

export const VERTICAL_TABS = 'payloadpack-vertical-tabs'
export const RADIO_CARDS = 'payloadpack-radio-cards'
export const SWITCH = 'payloadpack-switch'
export const SWITCH_END = `${SWITCH} payloadpack-switch--end`

const addCheckboxCellToFields = (fields: Field[]): Field[] =>
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
      return { ...field, tabs: field.tabs.map((tab) => ({ ...tab, fields: addCheckboxCellToFields(tab.fields) })) }
    }
    if ('fields' in field) {
      return { ...field, fields: addCheckboxCellToFields(field.fields) }
    }
    return field
  })

type OptionsConfig = {
  [C in Character as keyof (typeof CHARACTERS)[C]['defaults'] extends never ? never : C]?: CharacterOptionValues<C>
}

export type ThemePluginConfig = {
  character?: Character
  characters?: Character[]
  codeEditorFontSize?: false | number
  options?: OptionsConfig
  palette?: BuiltInPalette | (string & {})
  palettes?: Palette[]
  panel?: AppearancePanelAccess
}

export function themePlugin(pluginConfig: ThemePluginConfig = {}): Plugin {
  const {
    character = DEFAULT_CHARACTER,
    characters = Object.keys(CHARACTERS) as Character[],
    codeEditorFontSize = 13,
    palette = DEFAULT_PALETTE,
    palettes = BUILT_IN_PALETTES.map((slug) => ({ slug })),
    panel = true
  } = pluginConfig
  const characterOptionOverrides: Partial<Record<Character, OptionValues>> = pluginConfig.options ?? {}

  if (!characters.includes(character)) {
    throw new Error(`themePlugin: character '${character}' is not one of characters: ${characters.join(', ')}`)
  }

  const paletteSlugs = palettes.map(({ slug }) => slug)

  if (!paletteSlugs.includes(palette)) {
    throw new Error(`themePlugin: palette '${palette}' is not one of palettes: ${paletteSlugs.join(', ')}`)
  }

  if (paletteSlugs.includes(CUSTOM_PALETTE_SLUG)) {
    throw new Error(`themePlugin: '${CUSTOM_PALETTE_SLUG}' is the editor's own palette, so no palette may use it as its slug`)
  }

  const siteSettings: SiteAppearanceSettings = {
    character,
    options: Object.fromEntries(
      characters.map((name) => [name, { ...CHARACTERS[name].defaults, ...characterOptionOverrides[name] }])
    ),
    palette,
    palettes
  }

  return (config) => ({
    ...config,
    collections: characters.some((name) => name !== 'payload')
      ? config.collections?.map((collection) => ({ ...collection, fields: addCheckboxCellToFields(collection.fields) }))
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
          { path: `${PACKAGE_NAME}/rsc#AppearanceServerProvider`, serverProps: { codeEditorFontSize, panel, siteSettings } }
        ]
      }
    },
    i18n: {
      ...config.i18n,
      translations: deepMergeSimple(
        Object.fromEntries(
          Object.keys(config.i18n?.supportedLanguages ?? { en: true }).map((language) => [language, TRANSLATIONS])
        ),
        config.i18n?.translations ?? {}
      )
    }
  })
}
