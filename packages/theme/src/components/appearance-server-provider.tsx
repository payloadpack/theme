import { getPreferences } from '@payloadcms/ui/rsc'
import type { ServerProps } from 'payload'
import { formatAdminURL } from 'payload/shared'
import type { ReactNode } from 'react'

import {
  type AppearancePanelAccess,
  APPEARANCE_PREFERENCE_KEY,
  canUserEditAppearance,
  getUserAccountKey,
  pickInitialEditorAppearanceChoices,
  type SiteAppearanceSettings
} from '../lib/appearance.js'
import '../styles/index.css'
import { AppearanceSheet } from './appearance-panel.js'
import { AppearanceProvider } from './appearance-provider.js'

type AppearanceServerProviderProps = ServerProps & {
  children: ReactNode
  codeEditorFontSize: false | number
  panel: AppearancePanelAccess
  siteSettings: SiteAppearanceSettings
}

async function loadInitialEditorAppearanceChoices(
  { payload, siteSettings, user }: AppearanceServerProviderProps,
  appearanceCookieValue: string | undefined,
  accountKey: string | undefined
) {
  const savedPreference = user && (await getPreferences<unknown>(APPEARANCE_PREFERENCE_KEY, payload, user.id, user.collection))
  return pickInitialEditorAppearanceChoices(siteSettings, savedPreference?.value, appearanceCookieValue, accountKey)
}

export async function AppearanceServerProvider(props: AppearanceServerProviderProps) {
  const { children, codeEditorFontSize, panel, payload, server, siteSettings, user } = props
  const cookies = await server.getCookies()
  const appearanceCookieName = `${payload.config.cookiePrefix}-appearance`
  const railCookieName = `${payload.config.cookiePrefix}-nav-rail`
  const accountKey = getUserAccountKey(user)
  const canEdit = canUserEditAppearance(panel, user)
  const { editorChoices, unsavedInCookie } = canEdit
    ? await loadInitialEditorAppearanceChoices(props, cookies.get(appearanceCookieName)?.value, accountKey)
    : { editorChoices: {}, unsavedInCookie: false }

  return (
    <AppearanceProvider
      accountKey={accountKey}
      appearanceCookieName={appearanceCookieName}
      canEdit={canEdit}
      codeEditorFontSize={codeEditorFontSize}
      initialChoicesUnsaved={unsavedInCookie}
      initialEditorChoices={editorChoices}
      initialRailCollapsed={cookies.get(railCookieName)?.value === 'true'}
      key={accountKey}
      preferenceURL={formatAdminURL({
        apiRoute: payload.config.routes.api,
        path: `/payload-preferences/${APPEARANCE_PREFERENCE_KEY}`
      })}
      railCookieName={railCookieName}
      siteSettings={siteSettings}>
      {children}
      {canEdit && <AppearanceSheet />}
    </AppearanceProvider>
  )
}
