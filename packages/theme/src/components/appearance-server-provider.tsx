import { getPreferences } from '@payloadcms/ui/rsc'
import type { ServerProps } from 'payload'
import { formatAdminURL } from 'payload/shared'
import type { ReactNode } from 'react'

import {
  type AppearancePanelAccess,
  APPEARANCE_PREFERENCE_KEY,
  canUserEditAppearance,
  getUserAccountKey,
  normalizeEditorAppearanceChoices,
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

export async function AppearanceServerProvider({
  children,
  codeEditorFontSize,
  panel,
  payload,
  server,
  siteSettings,
  user
}: AppearanceServerProviderProps) {
  const cookies = await server.getCookies()
  const railCookieName = `${payload.config.cookiePrefix}-nav-rail`
  const accountKey = getUserAccountKey(user)
  const canEdit = canUserEditAppearance(panel, user)
  const savedPreference =
    canEdit && user ? await getPreferences<unknown>(APPEARANCE_PREFERENCE_KEY, payload, user.id, user.collection) : undefined

  return (
    <AppearanceProvider
      accountKey={accountKey}
      canEdit={canEdit}
      codeEditorFontSize={codeEditorFontSize}
      initialEditorChoices={normalizeEditorAppearanceChoices(siteSettings, savedPreference?.value)}
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
