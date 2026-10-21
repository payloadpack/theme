import type { ServerProps } from 'payload'
import type { ReactNode } from 'react'

import { type Appearance, getCookieName, type Setting, settings } from './appearance.js'
import { AppearanceProvider } from './client.js'

type Props = ServerProps & { children: ReactNode; codeEditorFontSize: false | number }

export async function AppearanceServerProvider({ children, codeEditorFontSize, payload, server }: Props) {
  const cookies = await server.getCookies()
  const { cookiePrefix } = payload.config

  const readSetting = (setting: Setting) => {
    const value = cookies.get(getCookieName(cookiePrefix, setting))?.value
    return value && Object.hasOwn(settings[setting].options, value) ? value : settings[setting].default
  }

  const appearance: Appearance = {
    adminTheme: readSetting('adminTheme'),
    density: readSetting('density'),
    icons: readSetting('icons')
  }

  return (
    <AppearanceProvider codeEditorFontSize={codeEditorFontSize} cookiePrefix={cookiePrefix} initialAppearance={appearance}>
      {children}
    </AppearanceProvider>
  )
}
