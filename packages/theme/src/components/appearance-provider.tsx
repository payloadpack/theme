'use client'

import { useNav, usePreferences, useWindowInfo } from '@payloadcms/ui'
import { createContext, type ReactNode, use, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react'

import type { Character, Option, OptionValue } from '../characters/index.js'
import { useMonacoFontSize } from '../hooks/use-monaco-font-size.js'
import { type Choices, normalize, parseChoices, preferenceKey, resolve, type Settings, setupOf } from '../lib/appearance.js'
import { type Palette, payloadBlue } from '../palettes/index.js'

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

const ACCENT_PROPERTY = '--payloadpack-accent'

const GEIST_PROPERTY = '--payloadpack-font-geist'

const inline = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')

const writeCookie = (name: string, value: string | undefined) => {
  document.cookie = value
    ? `${name}=${value}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`
    : `${name}=; path=/; max-age=0; SameSite=Lax`
}

type AppearanceContextValue = ReturnType<typeof resolve> & {
  characters: Character[]
  palettes: Palette[]
  paste: (text: string) => boolean
  rail: boolean
  reset: () => void
  setAccent: (accent: string) => void
  setCharacter: (character: Character) => void
  setOption: <O extends Option>(option: O, value: OptionValue<O>) => void
  setPalette: (palette: Palette) => void
  setup: Choices
  toggleRail: () => void
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

const subscribeToNothing = () => () => {}

type AppearanceProviderProps = {
  children: ReactNode
  codeEditorFontSize: false | number
  cookieName: string
  geist: string
  initialChoices: Choices
  initialRail: boolean
  railCookieName: string
  settings: Settings
}

export function AppearanceProvider({
  children,
  codeEditorFontSize,
  cookieName,
  geist,
  initialChoices,
  initialRail,
  railCookieName,
  settings
}: AppearanceProviderProps) {
  const [choices, setChoices] = useState(initialChoices)
  const [rail, setRail] = useState(initialRail)
  const { setPreference } = usePreferences()
  const resolved = useMemo(() => resolve(settings, choices), [settings, choices])
  const { accent, character, palette, values } = resolved
  const hasRail = values.nav === 'icons'
  const attributes = useMemo(
    () => ({
      character,
      ...values,
      ...(hasRail && rail ? { rail: '' } : {}),
      palette,
      ...(accent === payloadBlue ? {} : { accent })
    }),
    [accent, character, hasRail, palette, rail, values]
  )
  const { navOpen, setNavOpen } = useNav()
  const { breakpoints } = useWindowInfo()
  const keepsNavOpen = hasRail && breakpoints?.s === false
  const isServerHtml = useSyncExternalStore(
    subscribeToNothing,
    () => false,
    () => true
  )

  useMonacoFontSize(values.density === 'comfortable' && codeEditorFontSize)

  useLayoutEffect(() => {
    const { dataset, style } = document.documentElement
    Object.assign(dataset, attributes)
    style.setProperty(ACCENT_PROPERTY, accent)
    style.setProperty(GEIST_PROPERTY, geist)

    return () => {
      for (const key of Object.keys(attributes)) {
        delete dataset[key]
      }
      style.removeProperty(ACCENT_PROPERTY)
      style.removeProperty(GEIST_PROPERTY)
    }
  }, [accent, attributes, geist])

  useEffect(() => {
    writeCookie(cookieName, Object.keys(choices).length ? encodeURIComponent(JSON.stringify(choices)) : undefined)
  }, [choices, cookieName])

  useEffect(() => {
    writeCookie(railCookieName, rail ? 'true' : undefined)
  }, [rail, railCookieName])

  useLayoutEffect(() => {
    if (keepsNavOpen && !navOpen) {
      setNavOpen(true)
    }
  }, [keepsNavOpen, navOpen, setNavOpen])

  const context = useMemo(() => {
    const update = (next: Choices) => {
      const normalized = normalize(settings, next)
      void setPreference(preferenceKey, normalized)
      setChoices(normalized)
    }

    return {
      ...resolved,
      characters: Object.keys(settings.options) as Character[],
      palettes: Object.keys(settings.accents) as Palette[],
      paste: (text: string) => {
        const pasted = parseChoices(settings, text)
        if (pasted) {
          update(pasted)
        }
        return pasted !== undefined
      },
      rail,
      reset: () => update({}),
      setAccent: (next: string) => update({ ...choices, accent: { ...choices.accent, [palette]: next } }),
      setCharacter: (next: Character) => update({ ...choices, character: next }),
      setOption: <O extends Option>(option: O, value: OptionValue<O>) =>
        update({
          ...choices,
          options: { ...choices.options, [character]: { ...choices.options?.[character], [option]: value } }
        }),
      setPalette: (next: Palette) => update({ ...choices, palette: next }),
      setup: setupOf(resolved),
      toggleRail: () => setRail(!rail)
    }
  }, [character, choices, resolved, palette, rail, setPreference, settings])

  return (
    <AppearanceContext value={context}>
      {/* React never runs a client-created script and logs an error for it, so render it only into server HTML */}
      {isServerHtml && (
        <script
          dangerouslySetInnerHTML={{
            __html: `Object.assign(document.documentElement.dataset,${inline(attributes)});document.documentElement.style.setProperty('${ACCENT_PROPERTY}',${inline(accent)});document.documentElement.style.setProperty('${GEIST_PROPERTY}',${inline(geist)})`
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
