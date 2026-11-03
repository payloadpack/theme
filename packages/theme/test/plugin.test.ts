import type { Config } from 'payload'
import { expect, it } from 'vitest'

import { themePlugin } from '../src/index.js'

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

it('throws when the default character is not allowed', () => {
  expect(() => themePlugin({ character: 'enhanced', characters: ['stock'] })).toThrow("character 'enhanced'")
})

it('throws when the default palette is not allowed', () => {
  expect(() => themePlugin({ palettes: ['payload'] })).toThrow("palette 'warm'")
})
