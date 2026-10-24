'use client'

import { createContext, type ReactNode, use, useLayoutEffect, useState, useSyncExternalStore } from 'react'

import { useMonacoFontSize } from '../hooks/use-monaco-font-size.js'
import { type Appearance, type AppearanceControl, getCookieName } from '../lib/appearance.js'

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

type AppearanceContextValue = {
  appearance: Appearance
  setControl: (control: AppearanceControl, value: string) => void
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

const subscribeToNothing = () => () => {}

type AppearanceProviderProps = {
  children: ReactNode
  codeEditorFontSize: false | number
  cookiePrefix: string
  initialAppearance: Appearance
}

export function AppearanceProvider({ children, codeEditorFontSize, cookiePrefix, initialAppearance }: AppearanceProviderProps) {
  const [appearance, setAppearance] = useState(initialAppearance)
  const isServerHtml = useSyncExternalStore(
    subscribeToNothing,
    () => false,
    () => true
  )

  useMonacoFontSize(appearance.density === 'comfortable' && codeEditorFontSize)

  useLayoutEffect(() => {
    Object.assign(document.documentElement.dataset, appearance)
  }, [appearance])

  const setControl = (control: AppearanceControl, value: string) => {
    document.cookie = `${getCookieName(cookiePrefix, control)}=${value}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`
    setAppearance((current) => ({ ...current, [control]: value }))
  }

  return (
    <AppearanceContext value={{ appearance, setControl }}>
      {/* React never runs a client-created script and logs an error for it, so render it only into server HTML */}
      {isServerHtml && (
        <script
          dangerouslySetInnerHTML={{
            __html: `Object.assign(document.documentElement.dataset,${JSON.stringify(initialAppearance).replace(/</g, '\\u003c')})`
          }}
        />
      )}
      {children}
    </AppearanceContext>
  )
}

export function useAppearance() {
  const context = use(AppearanceContext)

  if (!context) {
    throw new Error('useAppearance must be called inside AppearanceProvider')
  }

  return context
}
