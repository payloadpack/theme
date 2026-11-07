'use client'

import { useAuth, useNav, useRouter, useWindowInfo } from '@payloadcms/ui'
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'

import { ALLOWED_OPTION_VALUES, type Character, type OptionName, type OptionValue } from '../characters/index.js'
import { useMonacoFontSize } from '../hooks/use-monaco-font-size.js'
import {
  applyPastedSetup,
  buildShareableSetup,
  clearCharacterOptionOverrides,
  type CustomPalette,
  customPaletteCss,
  CUSTOM_PALETTE_SLUG,
  type EditorAppearanceChoices,
  getUserAccountKey,
  isPersonalOption,
  normalizeEditorAppearanceChoices,
  parseEditorAppearanceChoices,
  resolveActiveAppearance,
  type SiteAppearanceSettings
} from '../lib/appearance.js'
import type { Palette } from '../palettes/index.js'

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

const HTML_DATA_ATTRIBUTE_KEYS = ['character', 'palette', 'rail', ...Object.keys(ALLOWED_OPTION_VALUES)]

const serializeForInlineScript = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')

const writeCookie = (name: string, value: string | undefined) => {
  document.cookie = value
    ? `${name}=${value}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`
    : `${name}=; path=/; max-age=0; SameSite=Lax`
}

type AppearanceContextValue = ReturnType<typeof resolveActiveAppearance> & {
  allowedCharacters: Character[]
  allowedPalettes: Palette[]
  canEdit: boolean
  pasteSetup: (text: string) => boolean
  removeCustomPalette: () => void
  resetCharacterOptions: () => () => void
  saveFailed: boolean
  setCharacter: (character: Character) => void
  setCustomPalette: (custom: CustomPalette, persist?: boolean) => void
  setOption: <O extends OptionName>(option: O, value: OptionValue<O>) => void
  setPalette: (palette: string) => void
  shareableSetup: EditorAppearanceChoices
  showsRail: boolean
  toggleNavRail: () => void
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

const subscribeToNothing = () => () => {}

type AppearanceProviderProps = {
  accountKey: string | undefined
  canEdit: boolean
  children: ReactNode
  codeEditorFontSize: false | number
  initialEditorChoices: EditorAppearanceChoices
  initialRailCollapsed: boolean
  preferenceURL: string
  railCookieName: string
  siteSettings: SiteAppearanceSettings
}

export function AppearanceProvider({
  accountKey,
  canEdit,
  children,
  codeEditorFontSize,
  initialEditorChoices,
  initialRailCollapsed,
  preferenceURL,
  railCookieName,
  siteSettings
}: AppearanceProviderProps) {
  const [editorChoices, setEditorChoices] = useState(initialEditorChoices)
  const [customPaletteDraft, setCustomPaletteDraft] = useState<CustomPalette>()
  const [railCollapsed, setRailCollapsed] = useState(initialRailCollapsed)
  const [saveFailed, setSaveFailed] = useState(false)
  const latestEditorChoices = useRef(initialEditorChoices)
  const saveQueue = useRef(Promise.resolve())
  const { user } = useAuth()
  const renderedAccountKey = useRef(accountKey)
  const userSignedOut = accountKey !== undefined && !user
  const router = useRouter()
  const activeAppearance = useMemo(
    () =>
      resolveActiveAppearance(
        siteSettings,
        userSignedOut
          ? {}
          : customPaletteDraft
            ? { ...editorChoices, custom: customPaletteDraft, palette: CUSTOM_PALETTE_SLUG }
            : editorChoices
      ),
    [customPaletteDraft, editorChoices, siteSettings, userSignedOut]
  )
  const { character, customPalette, optionValues, palette } = activeAppearance
  const navUsesRail = optionValues.nav === 'rail'
  const showsRail = navUsesRail && railCollapsed
  const htmlDataAttributes = useMemo(
    (): Record<string, string> => ({
      character,
      ...optionValues,
      ...(showsRail ? { rail: '' } : {}),
      palette
    }),
    [character, optionValues, palette, showsRail]
  )
  const { navOpen, setNavOpen } = useNav()
  const { breakpoints } = useWindowInfo()
  const keepNavOpenForRail = navUsesRail && breakpoints?.s === false
  const isServerHtml = useSyncExternalStore(
    subscribeToNothing,
    () => false,
    () => true
  )

  useMonacoFontSize(optionValues.density === 'comfortable' && codeEditorFontSize)

  useLayoutEffect(() => {
    const { dataset } = document.documentElement
    for (const key of HTML_DATA_ATTRIBUTE_KEYS) {
      if (key in htmlDataAttributes) {
        dataset[key] = htmlDataAttributes[key]
      } else {
        delete dataset[key]
      }
    }
  }, [htmlDataAttributes])

  useEffect(() => {
    const currentAccountKey = getUserAccountKey(user)
    if (!currentAccountKey || currentAccountKey === renderedAccountKey.current) {
      return
    }
    renderedAccountKey.current = currentAccountKey
    router.refresh()
  }, [router, user])

  useEffect(() => {
    writeCookie(railCookieName, railCollapsed ? 'true' : undefined)
  }, [railCollapsed, railCookieName])

  useLayoutEffect(() => {
    if (keepNavOpenForRail && !navOpen) {
      setNavOpen(true)
    }
  }, [keepNavOpenForRail, navOpen, setNavOpen])

  const applyChangeAndSave = useCallback(
    (change: (current: EditorAppearanceChoices) => EditorAppearanceChoices) => {
      const nextEditorChoices = normalizeEditorAppearanceChoices(siteSettings, change(latestEditorChoices.current))
      latestEditorChoices.current = nextEditorChoices
      setCustomPaletteDraft(undefined)
      setEditorChoices(nextEditorChoices)
      saveQueue.current = saveQueue.current.then(async () => {
        try {
          const saveResponse = await fetch(preferenceURL, {
            body: JSON.stringify({ value: nextEditorChoices }),
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            method: 'POST'
          })
          setSaveFailed(!saveResponse.ok)
        } catch {
          setSaveFailed(true)
        }
      })
    },
    [preferenceURL, siteSettings]
  )

  const context = useMemo(() => {
    return {
      ...activeAppearance,
      allowedCharacters: Object.keys(siteSettings.options) as Character[],
      allowedPalettes: siteSettings.palettes,
      canEdit,
      pasteSetup: (text: string) => {
        const isValidSetup = parseEditorAppearanceChoices(siteSettings, text) !== undefined
        if (isValidSetup) {
          applyChangeAndSave((current) => applyPastedSetup(siteSettings, current, text) ?? current)
        }
        return isValidSetup
      },
      removeCustomPalette: () =>
        applyChangeAndSave((current) => ({
          ...current,
          custom: undefined,
          palette: current.palette === CUSTOM_PALETTE_SLUG ? undefined : current.palette
        })),
      resetCharacterOptions: () => {
        const { options: optionsBeforeReset, personal: personalOptionsBeforeReset } = latestEditorChoices.current
        applyChangeAndSave((current) => clearCharacterOptionOverrides(siteSettings, current, character))
        return () =>
          applyChangeAndSave((current) => ({
            ...current,
            options: { ...current.options, [character]: { ...optionsBeforeReset?.[character], ...current.options?.[character] } },
            personal: { ...personalOptionsBeforeReset, ...current.personal }
          }))
      },
      saveFailed,
      setCharacter: (next: Character) => applyChangeAndSave((current) => ({ ...current, character: next })),
      setCustomPalette: (next: CustomPalette, persist = true) =>
        persist
          ? applyChangeAndSave((current) => ({ ...current, custom: next, palette: CUSTOM_PALETTE_SLUG }))
          : setCustomPaletteDraft(next),
      setOption: <O extends OptionName>(option: O, value: OptionValue<O>) =>
        applyChangeAndSave((current) =>
          isPersonalOption(option)
            ? { ...current, personal: { ...current.personal, [option]: value } }
            : {
                ...current,
                options: { ...current.options, [character]: { ...current.options?.[character], [option]: value } }
              }
        ),
      setPalette: (next: string) => applyChangeAndSave((current) => ({ ...current, palette: next })),
      shareableSetup: buildShareableSetup(activeAppearance),
      showsRail,
      toggleNavRail: () => setRailCollapsed(!railCollapsed)
    }
  }, [activeAppearance, applyChangeAndSave, canEdit, character, railCollapsed, saveFailed, showsRail, siteSettings])

  return (
    <AppearanceContext value={context}>
      {/* React never runs a client-created script and logs an error for it, so render it only into server HTML */}
      {isServerHtml && (
        <script
          dangerouslySetInnerHTML={{
            __html: `Object.assign(document.documentElement.dataset,${serializeForInlineScript(htmlDataAttributes)})`
          }}
        />
      )}
      {customPalette && <style>{customPaletteCss(CUSTOM_PALETTE_SLUG, customPalette)}</style>}
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
