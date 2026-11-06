import { getPreferences } from '@payloadcms/ui/rsc'
import type { ServerProps } from 'payload'
import { formatAdminURL } from 'payload/shared'
import type { ReactNode } from 'react'

import { accountOf, isEditable, type Panel, preferenceKey, type Settings, storedChoices } from '../lib/appearance.js'
import '../styles/index.css'
import { AppearanceSheet } from './appearance-panel.js'
import { AppearanceProvider } from './appearance-provider.js'

type Props = ServerProps & { children: ReactNode; codeEditorFontSize: false | number; panel: Panel; settings: Settings }

async function savedChoices({ cookieName, payload, server, settings, user }: Props & { cookieName: string }) {
  const preference = user && (await getPreferences<unknown>(preferenceKey, payload, user.id, user.collection))
  return storedChoices(settings, preference?.value, (await server.getCookies()).get(cookieName)?.value, accountOf(user))
}

export async function AppearanceServerProvider(props: Props) {
  const { children, codeEditorFontSize, panel, payload, server, settings, user } = props
  const cookieName = `${payload.config.cookiePrefix}-appearance`
  const railCookieName = `${payload.config.cookiePrefix}-nav-rail`
  const editable = isEditable(panel, user)
  const { choices, storedIsOlder } = editable
    ? await savedChoices({ ...props, cookieName })
    : { choices: {}, storedIsOlder: false }
  const initialRail = (await server.getCookies()).get(railCookieName)?.value === 'true'

  return (
    <AppearanceProvider
      codeEditorFontSize={codeEditorFontSize}
      cookieName={cookieName}
      editable={editable}
      initialChoices={choices}
      initialRail={initialRail}
      storedIsOlder={storedIsOlder}
      key={accountOf(user)}
      preferenceURL={formatAdminURL({ apiRoute: payload.config.routes.api, path: `/payload-preferences/${preferenceKey}` })}
      railCookieName={railCookieName}
      settings={settings}>
      {children}
      {editable && <AppearanceSheet />}
    </AppearanceProvider>
  )
}
