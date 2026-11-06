'use client'

import { useAuth, useNav, usePreferences, useWindowInfo } from '@payloadcms/ui'
import {
  createContext,
  type ReactNode,
  use,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'

import { type Character, type Option, type OptionValue, options } from '../characters/index.js'
import { useMonacoFontSize } from '../hooks/use-monaco-font-size.js'
import {
  type Choices,
  type CustomPalette,
  customPalette,
  isPersonal,
  normalize,
  paletteCss,
  parseChoices,
  pasteSetup,
  preferenceKey,
  resetCharacter,
  resolve,
  type Settings,
  setupOf
} from '../lib/appearance.js'
import type { Palette } from '../palettes/index.js'

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

const ATTRIBUTE_KEYS = ['character', 'palette', 'rail', ...Object.keys(options)]

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
  removeCustom: () => void
  reset: () => () => void
  setCustom: (custom: CustomPalette, persist?: boolean) => void
  setCharacter: (character: Character) => void
  setOption: <O extends Option>(option: O, value: OptionValue<O>) => void
  setPalette: (palette: Palette | typeof customPalette) => void
  setup: Choices
  toggleRail: () => void
  unsaved: boolean
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

const subscribeToNothing = () => () => {}

const accountOf = (user: null | undefined | { collection: string; id: number | string }) =>
  user ? `${user.collection}:${user.id}` : undefined

type AppearanceProviderProps = {
  children: ReactNode
  codeEditorFontSize: false | number
  cookieName: string
  editable: boolean
  initialChoices: Choices
  initialRail: boolean
  loadsOnSignIn: boolean
  preferenceURL: string
  railCookieName: string
  settings: Settings
}

export function AppearanceProvider({
  children,
  codeEditorFontSize,
  cookieName,
  editable,
  initialChoices,
  initialRail,
  loadsOnSignIn,
  preferenceURL,
  railCookieName,
  settings
}: AppearanceProviderProps) {
  const [choices, setChoices] = useState(initialChoices)
  const [draft, setDraft] = useState<CustomPalette>()
  const [rail, setRail] = useState(initialRail)
  const [unsaved, setUnsaved] = useState(false)
  const latest = useRef(choices)
  const saving = useRef(Promise.resolve())
  const { user } = useAuth()
  const signedInAs = useRef(accountOf(user))
  const { getPreference } = usePreferences()
  const resolved = useMemo(
    () => resolve(settings, draft ? { ...choices, custom: draft, palette: customPalette } : choices),
    [settings, choices, draft]
  )
  const { character, custom, palette, values } = resolved
  const hasRail = values.nav === 'rail'
  const attributes = useMemo(
    (): Record<string, string> => ({
      character,
      ...values,
      ...(hasRail && rail ? { rail: '' } : {}),
      palette
    }),
    [character, hasRail, palette, rail, values]
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
    const { dataset } = document.documentElement
    for (const key of ATTRIBUTE_KEYS) {
      if (key in attributes) {
        dataset[key] = attributes[key]
      } else {
        delete dataset[key]
      }
    }
  }, [attributes])

  useEffect(() => {
    const account = accountOf(user)
    if (!loadsOnSignIn || !account || account === signedInAs.current) {
      return
    }
    signedInAs.current = account
    void getPreference<unknown>(preferenceKey).then((saved) => {
      if (saved) {
        setChoices(normalize(settings, saved))
      }
    })
  }, [getPreference, loadsOnSignIn, settings, user])

  useEffect(() => {
    latest.current = choices
    if (editable) {
      writeCookie(cookieName, Object.keys(choices).length ? encodeURIComponent(JSON.stringify(choices)) : undefined)
    }
  }, [choices, cookieName, editable])

  useEffect(() => {
    writeCookie(railCookieName, rail ? 'true' : undefined)
  }, [rail, railCookieName])

  useLayoutEffect(() => {
    if (keepsNavOpen && !navOpen && CSS.supports('anchor-name: --a')) {
      setNavOpen(true)
    }
  }, [keepsNavOpen, navOpen, setNavOpen])

  const context = useMemo(() => {
    const update = (change: (current: Choices) => Choices) => {
      setDraft(undefined)
      setChoices((current) => normalize(settings, change(current)))
      saving.current = saving.current
        .then(async () => {
          const stored = await fetch(preferenceURL, { credentials: 'include' })
          const saved: unknown = stored.ok ? (await stored.json()).value : null
          const value = normalize(settings, change(saved == null ? latest.current : normalize(settings, saved)))
          const response = await fetch(preferenceURL, {
            body: JSON.stringify({ value }),
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            method: 'POST'
          })
          setUnsaved(!response.ok)
        })
        .catch(() => setUnsaved(true))
    }

    return {
      ...resolved,
      characters: Object.keys(settings.options) as Character[],
      palettes: settings.palettes,
      paste: (text: string) => {
        const valid = parseChoices(settings, text) !== undefined
        if (valid) {
          update((current) => pasteSetup(settings, current, text) ?? current)
        }
        return valid
      },
      rail,
      removeCustom: () =>
        update((current) => ({
          ...current,
          custom: undefined,
          palette: current.palette === customPalette ? undefined : current.palette
        })),
      reset: () => {
        const { options: before, personal } = choices
        update((current) => resetCharacter(settings, current, character))
        return () =>
          update((current) => ({ ...current, options: { ...current.options, [character]: before?.[character] }, personal }))
      },
      setCharacter: (next: Character) => update((current) => ({ ...current, character: next })),
      setCustom: (next: CustomPalette, persist = true) =>
        persist ? update((current) => ({ ...current, custom: next, palette: customPalette })) : setDraft(next),
      setOption: <O extends Option>(option: O, value: OptionValue<O>) =>
        update((current) =>
          isPersonal(option)
            ? { ...current, personal: { ...current.personal, [option]: value } }
            : {
                ...current,
                options: { ...current.options, [character]: { ...current.options?.[character], [option]: value } }
              }
        ),
      setPalette: (next: Palette | typeof customPalette) => update((current) => ({ ...current, palette: next })),
      setup: setupOf(resolved),
      toggleRail: () => setRail(!rail),
      unsaved
    }
  }, [character, choices, preferenceURL, resolved, rail, settings, unsaved])

  return (
    <AppearanceContext value={context}>
      {/* React never runs a client-created script and logs an error for it, so render it only into server HTML */}
      {isServerHtml && (
        <script
          dangerouslySetInnerHTML={{
            __html: `Object.assign(document.documentElement.dataset,${inline(attributes)})`
          }}
        />
      )}
      {custom && <style>{paletteCss(customPalette, custom)}</style>}
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
