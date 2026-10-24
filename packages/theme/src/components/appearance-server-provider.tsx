import type { ServerProps } from 'payload'
import type { ReactNode } from 'react'

import { type Appearance, type AppearanceControl, appearanceControls, getCookieName } from '../lib/appearance.js'
import '../styles/index.css'
import { AppearanceProvider } from './appearance-provider.js'

type Props = ServerProps & { children: ReactNode; codeEditorFontSize: false | number }

export async function AppearanceServerProvider({ children, codeEditorFontSize, payload, server }: Props) {
  const cookies = await server.getCookies()
  const { cookiePrefix } = payload.config

  const readControl = (control: AppearanceControl) => {
    const value = cookies.get(getCookieName(cookiePrefix, control))?.value
    return value && Object.hasOwn(appearanceControls[control].options, value) ? value : appearanceControls[control].default
  }

  const appearance: Appearance = {
    adminTheme: readControl('adminTheme'),
    density: readControl('density'),
    icons: readControl('icons')
  }

  return (
    <AppearanceProvider codeEditorFontSize={codeEditorFontSize} cookiePrefix={cookiePrefix} initialAppearance={appearance}>
      {children}
    </AppearanceProvider>
  )
}
