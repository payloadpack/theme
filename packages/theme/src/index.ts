import type { Plugin } from 'payload'

import { type Setting, settings } from './appearance.js'

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
          ...(Object.keys(settings) as Setting[]).map((setting) => ({
            group: settings[setting].label,
            items: [{ clientProps: { setting }, path: `${PACKAGE_NAME}/client#SettingOptions` }]
          }))
        ]
      }
    }
  })
}
