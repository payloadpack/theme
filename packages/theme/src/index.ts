import type { Plugin } from 'payload'
import { deepMergeSimple } from 'payload/shared'

import { type AppearanceControl, appearanceControls } from './appearance.js'

const PACKAGE_NAME = '@payloadpack/theme'

export const VERTICAL_TABS = 'payloadpack-vertical-tabs'
export const RADIO_CARDS = 'payloadpack-radio-cards'

export type ThemePluginConfig = {
  codeEditorFontSize?: false | number
}

export function themePlugin({ codeEditorFontSize = 13 }: ThemePluginConfig = {}): Plugin {
  return (config) => ({
    ...config,
    admin: {
      ...config.admin,
      suppressHydrationWarning: true,
      components: {
        ...config.admin?.components,
        providers: [
          ...(config.admin?.components?.providers ?? []),
          { path: `${PACKAGE_NAME}/rsc#AppearanceServerProvider`, serverProps: { codeEditorFontSize } }
        ],
        userMenuSettingsItems: [
          ...(config.admin?.components?.userMenuSettingsItems ?? []),
          ...(Object.keys(appearanceControls) as AppearanceControl[]).map((control) => ({
            group: appearanceControls[control].label,
            items: [{ clientProps: { control }, path: `${PACKAGE_NAME}/client#AppearanceOptions` }]
          }))
        ]
      }
    },
    i18n: {
      ...config.i18n,
      translations: deepMergeSimple({ en: { general: { settings: 'Appearance' } } }, config.i18n?.translations ?? {})
    }
  })
}
