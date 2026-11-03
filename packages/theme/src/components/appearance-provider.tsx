'use client'

import { usePreferences } from '@payloadcms/ui'
import { createContext, type ReactNode, use, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react'

import type { Character, Option, OptionValue } from '../characters/index.js'
import { useMonacoFontSize } from '../hooks/use-monaco-font-size.js'
import { type Choices, normalize, parseChoices, preferenceKey, resolve, type Settings, setupOf } from '../lib/appearance.js'
import { type Palette, payloadBlue } from '../palettes/index.js'

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

const ACCENT_PROPERTY = '--payloadpack-accent'

const inline = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')

type AppearanceContextValue = ReturnType<typeof resolve> & {
  characters: Character[]
  palettes: Palette[]
  paste: (text: string) => boolean
  reset: () => void
  setAccent: (accent: string) => void
  setCharacter: (character: Character) => void
  setOption: <O extends Option>(option: O, value: OptionValue<O>) => void
  setPalette: (palette: Palette) => void
  setup: Choices
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

const subscribeToNothing = () => () => {}

type AppearanceProviderProps = {
  children: ReactNode
  codeEditorFontSize: false | number
  cookieName: string
  initialChoices: Choices
  settings: Settings
}

export function AppearanceProvider({ children, codeEditorFontSize, cookieName, initialChoices, settings }: AppearanceProviderProps) {
  const [choices, setChoices] = useState(initialChoices)
  const { setPreference } = usePreferences()
  const look = useMemo(() => resolve(settings, choices), [settings, choices])
  const { accent, character, palette, values } = look
  const attributes = useMemo(
    () => ({ character, ...values, palette, ...(accent === payloadBlue ? {} : { accent }) }),
    [accent, character, palette, values]
  )
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

    return () => {
      for (const key of Object.keys(attributes)) {
        delete dataset[key]
      }
      style.removeProperty(ACCENT_PROPERTY)
    }
  }, [accent, attributes])

  const context = useMemo(() => {
    const update = (next: Choices) => {
      const normalized = normalize(settings, next)
      document.cookie = Object.keys(normalized).length
        ? `${cookieName}=${encodeURIComponent(JSON.stringify(normalized))}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`
        : `${cookieName}=; path=/; max-age=0; SameSite=Lax`
      void setPreference(preferenceKey, normalized)
      setChoices(normalized)
    }

    return {
      ...look,
      characters: Object.keys(settings.options) as Character[],
      palettes: Object.keys(settings.accents) as Palette[],
      paste: (text: string) => {
        const pasted = parseChoices(settings, text)
        if (pasted) {
          update(pasted)
        }
        return pasted !== undefined
      },
      reset: () => update({}),
      setAccent: (next: string) => update({ ...choices, accent: { ...choices.accent, [palette]: next } }),
      setCharacter: (next: Character) => update({ ...choices, character: next }),
      setOption: <O extends Option>(option: O, value: OptionValue<O>) =>
        update({
          ...choices,
          options: { ...choices.options, [character]: { ...choices.options?.[character], [option]: value } }
        }),
      setPalette: (next: Palette) => update({ ...choices, palette: next }),
      setup: setupOf(look)
    }
  }, [character, choices, cookieName, look, palette, setPreference, settings])

  return (
    <AppearanceContext value={context}>
      {/* React never runs a client-created script and logs an error for it, so render it only into server HTML */}
      {isServerHtml && (
        <script
          dangerouslySetInnerHTML={{
            __html: `Object.assign(document.documentElement.dataset,${inline(attributes)});document.documentElement.style.setProperty('${ACCENT_PROPERTY}',${inline(accent)})`
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
