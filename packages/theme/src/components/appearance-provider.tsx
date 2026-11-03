'use client'

import { createContext, type ReactNode, use, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react'

import type { Character, Option, OptionValue } from '../characters/index.js'
import { useMonacoFontSize } from '../hooks/use-monaco-font-size.js'
import { type Choices, normalize, resolve, type Settings } from '../lib/appearance.js'

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

type AppearanceContextValue = ReturnType<typeof resolve> & {
  characters: Character[]
  reset: () => void
  setCharacter: (character: Character) => void
  setOption: <O extends Option>(option: O, value: OptionValue<O>) => void
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
  const { character, values } = useMemo(() => resolve(settings, choices), [settings, choices])
  const isServerHtml = useSyncExternalStore(
    subscribeToNothing,
    () => false,
    () => true
  )

  useMonacoFontSize(values.density === 'comfortable' && codeEditorFontSize)

  useLayoutEffect(() => {
    const { dataset } = document.documentElement
    const attributes = { character, ...values }
    Object.assign(dataset, attributes)

    return () => {
      for (const key of Object.keys(attributes)) {
        delete dataset[key]
      }
    }
  }, [character, values])

  const context = useMemo(() => {
    const update = (next: Choices) => {
      const normalized = normalize(settings, next)
      document.cookie = Object.keys(normalized).length
        ? `${cookieName}=${encodeURIComponent(JSON.stringify(normalized))}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`
        : `${cookieName}=; path=/; max-age=0; SameSite=Lax`
      setChoices(normalized)
    }

    return {
      character,
      characters: Object.keys(settings.defaults) as Character[],
      reset: () => update({}),
      setCharacter: (next: Character) => update({ ...choices, character: next }),
      setOption: <O extends Option>(option: O, value: OptionValue<O>) =>
        update({ ...choices, [character]: { ...choices[character], [option]: value } }),
      values
    }
  }, [character, choices, cookieName, settings, values])

  return (
    <AppearanceContext value={context}>
      {/* React never runs a client-created script and logs an error for it, so render it only into server HTML */}
      {isServerHtml && (
        <script
          dangerouslySetInnerHTML={{
            __html: `Object.assign(document.documentElement.dataset,${JSON.stringify({ character, ...values }).replace(/</g, '\\u003c')})`
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
