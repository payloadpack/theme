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
  initialChoices: Choices
  initialRail: boolean
  loadsOnSignIn: boolean
  railCookieName: string
  settings: Settings
}

export function AppearanceProvider({
  children,
  codeEditorFontSize,
  cookieName,
  initialChoices,
  initialRail,
  loadsOnSignIn,
  railCookieName,
  settings
}: AppearanceProviderProps) {
  const [choices, setChoices] = useState(initialChoices)
  const [rail, setRail] = useState(initialRail)
  const [unsaved, setUnsaved] = useState(false)
  const { user } = useAuth()
  const signedInAs = useRef(accountOf(user))
  const { getPreference, setPreference } = usePreferences()
  const resolved = useMemo(() => resolve(settings, choices), [settings, choices])
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
    const update = (change: (current: Choices) => Choices, persist = true) => {
      setChoices((current) => normalize(settings, change(current)))
      if (persist) {
        setPreference(preferenceKey, (saved: unknown) => normalize(settings, change(normalize(settings, saved)))).then(
          () => setUnsaved(false),
          () => setUnsaved(true)
        )
      }
    }

    return {
      ...resolved,
      characters: Object.keys(settings.options) as Character[],
      palettes: settings.palettes,
      paste: (text: string) => {
        const pasted = parseChoices(settings, text)
        if (pasted) {
          update((current) => pasteSetup(settings, current, pasted))
        }
        return pasted !== undefined
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
        update((current) => ({ ...current, options: { ...current.options, [character]: undefined }, personal: undefined }))
        return () =>
          update((current) => ({ ...current, options: { ...current.options, [character]: before?.[character] }, personal }))
      },
      setCharacter: (next: Character) => update((current) => ({ ...current, character: next })),
      setCustom: (next: CustomPalette, persist?: boolean) =>
        update((current) => ({ ...current, custom: next, palette: customPalette }), persist),
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
  }, [character, choices, resolved, rail, setPreference, settings, unsaved])

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
