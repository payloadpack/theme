import type { Config } from 'payload'
import { expect, it } from 'vitest'

import { themePlugin, type ThemePluginConfig } from '../src/index.js'
import type { SiteAppearanceSettings } from '../src/lib/appearance.js'

const siteSettingsFromPluginConfig = async (pluginConfig: ThemePluginConfig) => {
  const config = await themePlugin(pluginConfig)({} as Config)
  const providers = config.admin?.components?.providers as { serverProps: { siteSettings: SiteAppearanceSettings } }[]
  return providers[0].serverProps.siteSettings
}

it('offers editors the allowed palettes, every built-in one by default', async () => {
  expect((await siteSettingsFromPluginConfig({})).palettes).toEqual([
    { slug: 'payload' },
    { slug: 'neutral' },
    { slug: 'warm' },
    { slug: 'soft' }
  ])
  expect(
    (await siteSettingsFromPluginConfig({ palette: 'warm', palettes: [{ slug: 'warm' }, { slug: 'neutral' }] })).palettes
  ).toEqual([{ slug: 'warm' }, { slug: 'neutral' }])
})

it("offers the app's own palettes with their labels next to the built-in ones", async () => {
  const palettes = [{ slug: 'neutral' as const }, { label: { de: 'Marke', en: 'Brand' }, slug: 'brand' }]

  expect(await siteSettingsFromPluginConfig({ palette: 'brand', palettes })).toMatchObject({ palette: 'brand', palettes })
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
  expect(translations.de.payloadpack.colorMode).toBe('Theme')
})

it('puts the nav bar after the app nav components', async () => {
  const config = await themePlugin({})({ admin: { components: { beforeNav: ['/nav#Banner'] } } } as Config)

  expect(config.admin?.components?.beforeNav).toEqual(['/nav#Banner', '@payloadpack/theme/client#NavBar'])
})

it('throws when the default character is not allowed', () => {
  expect(() => themePlugin({ character: 'enhanced', characters: ['payload'] })).toThrow("character 'enhanced'")
})

it('throws when the default palette is not allowed', () => {
  expect(() => themePlugin({ palettes: [{ slug: 'payload' }] })).toThrow("palette 'neutral'")
})

it("throws when a palette takes the slug of the editor's own palette", () => {
  expect(() => themePlugin({ palettes: [{ slug: 'neutral' }, { label: 'Mine', slug: 'custom' }] })).toThrow("'custom'")
})

it('gives every checkbox field without its own list cell the checkbox cell', async () => {
  type Node = { admin?: { components?: { Cell?: unknown } }; fields?: Node[]; tabs?: { fields: Node[] }[] }
  const config = await themePlugin()({
    collections: [
      {
        slug: 'posts',
        fields: [
          { name: 'featured', type: 'checkbox' },
          { type: 'row', fields: [{ name: 'pinned', type: 'checkbox' }] },
          { type: 'tabs', tabs: [{ label: 'Meta', fields: [{ name: 'hidden', type: 'checkbox' }] }] },
          { name: 'archived', type: 'checkbox', admin: { components: { Cell: '/cells#Archived' } } }
        ]
      }
    ]
  } as unknown as Config)
  const [featured, row, tabs, archived] = config.collections?.[0].fields as unknown as Node[]

  expect(featured.admin?.components?.Cell).toBe('@payloadpack/theme/client#CheckboxCell')
  expect(row.fields?.[0].admin?.components?.Cell).toBe('@payloadpack/theme/client#CheckboxCell')
  expect(tabs.tabs?.[0].fields[0].admin?.components?.Cell).toBe('@payloadpack/theme/client#CheckboxCell')
  expect(archived.admin?.components?.Cell).toBe('/cells#Archived')
})

it("leaves checkbox fields on Payload's cell when only the Payload style is allowed", async () => {
  const fields = [{ name: 'featured', type: 'checkbox' }]
  const config = await themePlugin({ character: 'payload', characters: ['payload'] })({
    collections: [{ slug: 'posts', fields }]
  } as unknown as Config)

  expect(config.collections?.[0].fields).toBe(fields)
})
