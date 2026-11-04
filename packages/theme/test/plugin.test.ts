import type { Config } from 'payload'
import { expect, it } from 'vitest'

import { themePlugin, type ThemePluginConfig } from '../src/index.js'
import type { Settings } from '../src/lib/appearance.js'

const settingsOf = async (pluginConfig: ThemePluginConfig) => {
  const config = await themePlugin(pluginConfig)({} as Config)
  const providers = config.admin?.components?.providers as { serverProps: { settings: Settings } }[]
  return providers[0].serverProps.settings
}

it('offers editors the allowed palettes, every built-in one by default', async () => {
  expect((await settingsOf({})).palettes).toEqual(['payload', 'neutral', 'studio'])
  expect((await settingsOf({ palette: 'studio', palettes: ['studio', 'neutral'] })).palettes).toEqual(['studio', 'neutral'])
})

it('gives every supported language the English panel labels, and lets the app override them', async () => {
  const config = await themePlugin()({
    i18n: {
      supportedLanguages: { de: {}, en: {} },
      translations: { de: { payloadpack: { appearance: 'Darstellung' } } }
    }
  } as unknown as Config)
  const translations = config.i18n?.translations as Record<string, { payloadpack: Record<string, string> }>

  expect(translations.en.payloadpack.appearance).toBe('Appearance')
  expect(translations.de.payloadpack.appearance).toBe('Darstellung')
  expect(translations.de.payloadpack.colorMode).toBe('Color mode')
})

it('puts the rail toggle and the Appearance button after the app nav components', async () => {
  const config = await themePlugin({})({ admin: { components: { beforeNav: ['/nav#Banner'] } } } as Config)

  expect(config.admin?.components?.beforeNav).toEqual([
    '/nav#Banner',
    '@payloadpack/theme/client#RailToggle',
    { path: '@payloadpack/theme/rsc#AppearanceServerPanel', serverProps: { panel: true, place: 'nav' } }
  ])
})

it('throws when the default character is not allowed', () => {
  expect(() => themePlugin({ character: 'enhanced', characters: ['stock'] })).toThrow("character 'enhanced'")
})

it('throws when the default palette is not allowed', () => {
  expect(() => themePlugin({ palettes: ['payload'] })).toThrow("palette 'neutral'")
})
