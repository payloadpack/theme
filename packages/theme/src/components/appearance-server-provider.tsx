import { getPreferences } from '@payloadcms/ui/rsc'
import type { ServerProps } from 'payload'
import { formatAdminURL } from 'payload/shared'
import type { ReactNode } from 'react'

import { accountOf, isEditable, type Panel, preferenceKey, type Settings, storedChoices } from '../lib/appearance.js'
import '../styles/index.css'
import { AppearanceSheet } from './appearance-panel.js'
import { AppearanceProvider } from './appearance-provider.js'

type Props = ServerProps & { children: ReactNode; codeEditorFontSize: false | number; panel: Panel; settings: Settings }

async function savedChoices({ payload, settings, user }: Props, cookie: string | undefined, account: string | undefined) {
  const preference = user && (await getPreferences<unknown>(preferenceKey, payload, user.id, user.collection))
  return storedChoices(settings, preference?.value, cookie, account)
}

export async function AppearanceServerProvider(props: Props) {
  const { children, codeEditorFontSize, panel, payload, server, settings, user } = props
  const cookies = await server.getCookies()
  const cookieName = `${payload.config.cookiePrefix}-appearance`
  const railCookieName = `${payload.config.cookiePrefix}-nav-rail`
  const account = accountOf(user)
  const editable = isEditable(panel, user)
  const { choices, unsaved } = editable
    ? await savedChoices(props, cookies.get(cookieName)?.value, account)
    : { choices: {}, unsaved: false }

  return (
    <AppearanceProvider
      account={account}
      codeEditorFontSize={codeEditorFontSize}
      cookieName={cookieName}
      editable={editable}
      initialChoices={choices}
      initialRail={cookies.get(railCookieName)?.value === 'true'}
      initialUnsaved={unsaved}
      key={account}
      preferenceURL={formatAdminURL({ apiRoute: payload.config.routes.api, path: `/payload-preferences/${preferenceKey}` })}
      railCookieName={railCookieName}
      settings={settings}>
      {children}
      {editable && <AppearanceSheet />}
    </AppearanceProvider>
  )
}
