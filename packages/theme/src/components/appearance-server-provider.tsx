import { getPreferences } from '@payloadcms/ui/rsc'
import type { ServerProps } from 'payload'
import type { ReactNode } from 'react'

import { isEditable, normalize, type Panel, parseChoices, preferenceKey, type Settings } from '../lib/appearance.js'
import '../styles/index.css'
import { AppearanceProvider } from './appearance-provider.js'

type Props = ServerProps & { children: ReactNode; codeEditorFontSize: false | number; panel: Panel; settings: Settings }

async function savedChoices({ cookieName, payload, server, settings, user }: Props & { cookieName: string }) {
  const preference = user && (await getPreferences<unknown>(preferenceKey, payload, user.id, user.collection))

  if (preference) {
    return normalize(settings, preference.value)
  }

  return parseChoices(settings, (await server.getCookies()).get(cookieName)?.value) ?? {}
}

export async function AppearanceServerProvider(props: Props) {
  const { children, codeEditorFontSize, panel, payload, settings, user } = props
  const cookieName = `${payload.config.cookiePrefix}-appearance`
  const choices = isEditable(panel, user) ? await savedChoices({ ...props, cookieName }) : {}

  return (
    <AppearanceProvider
      codeEditorFontSize={codeEditorFontSize}
      cookieName={cookieName}
      initialChoices={choices}
      settings={settings}>
      {children}
    </AppearanceProvider>
  )
}
