import type { ServerProps } from 'payload'
import type { ReactNode } from 'react'

import { isEditable, type Panel, parseChoices, type Settings } from '../lib/appearance.js'
import '../styles/index.css'
import { AppearanceProvider } from './appearance-provider.js'

type Props = ServerProps & { children: ReactNode; codeEditorFontSize: false | number; panel: Panel; settings: Settings }

export async function AppearanceServerProvider({ children, codeEditorFontSize, panel, payload, server, settings, user }: Props) {
  const cookieName = `${payload.config.cookiePrefix}-appearance`
  const choices = isEditable(panel, user) ? parseChoices(settings, (await server.getCookies()).get(cookieName)?.value) : {}

  return (
    <AppearanceProvider codeEditorFontSize={codeEditorFontSize} cookieName={cookieName} initialChoices={choices} settings={settings}>
      {children}
    </AppearanceProvider>
  )
}
