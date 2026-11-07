'use client'

import { PayloadIcon, useConfig, useTheme, useTranslation, XIcon } from '@payloadcms/ui'
import type { StaticLabel } from 'payload'
import { Fragment, type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react'

import { allowedOptionValues, characters as registry, type OptionName } from '../characters/index.js'
import {
  baseColorTokenNames,
  type CustomPalette,
  customPaletteBaseColorNames,
  type CustomPaletteBaseColors,
  customPaletteCss,
  customPaletteSlug,
  parseHexColor
} from '../lib/appearance.js'
import type { TranslationKey } from '../translations.js'
import { useAppearance } from './appearance-provider.js'

const themeModes = ['light', 'dark', 'auto'] as const

const paletteModes = ['light', 'dark'] as const

const SHEET_ID = 'payloadpack-appearance'

const SHARE_ID = 'payloadpack-appearance-share'

const STATUS_MS = 3000

const UNDO_MS = 8000

const capitalize = (text: string) => `${text[0].toUpperCase()}${text.slice(1)}`

const cssColorToHex = (color: string) => {
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('A 2D canvas is needed to read palette colors')
  }
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  return `#${[...context.getImageData(0, 0, 1, 1).data.slice(0, 3)].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

const readRenderedPaletteColors = (paletteCardsElement: Element, paletteSlug: string): CustomPalette => {
  const resolveColorToHex = (probe: HTMLElement, value: string) => {
    probe.style.color = value
    return cssColorToHex(getComputedStyle(probe).color)
  }
  const readPaletteMode = (mode: (typeof paletteModes)[number]) => {
    const probe = document.createElement('span')
    Object.assign(probe.dataset, { palette: paletteSlug, theme: mode })
    paletteCardsElement.append(probe)
    const baseColors = Object.fromEntries(
      customPaletteBaseColorNames.map((key) => [key, resolveColorToHex(probe, `var(${baseColorTokenNames[key]})`)])
    ) as CustomPaletteBaseColors
    const accent = resolveColorToHex(probe, 'var(--payloadpack-accent, var(--ramp-blue-500))')
    probe.remove()
    return { accent, base: baseColors }
  }
  const [light, dark] = [readPaletteMode('light'), readPaletteMode('dark')]
  return { accent: light.accent, dark: dark.base, light: light.base }
}

export function AppearanceButton({ place }: { place?: 'nav' }) {
  const { t } = useTranslation<object, TranslationKey>()

  return (
    <div className={`payloadpack-appearance-panel${place === 'nav' ? ' payloadpack-appearance-panel--nav' : ''}`}>
      <button
        aria-label={t('payloadpack:appearance')}
        className="payloadpack-appearance-panel__trigger"
        popoverTarget={SHEET_ID}
        title={t('payloadpack:appearance')}
        type="button">
        <span aria-hidden="true" className="payloadpack-appearance-panel__palette-icon" />
      </button>
    </div>
  )
}

function ColorField({
  autoFocus,
  label,
  onChange,
  value
}: {
  autoFocus?: boolean
  label: string
  onChange: (value: string, persist?: boolean) => void
  value: string
}) {
  const colorPickerInput = useRef<HTMLInputElement>(null)
  const [typedHex, setTypedHex] = useState<string>()

  useEffect(() => {
    const element = colorPickerInput.current
    const commit = () => element && onChange(element.value)
    element?.addEventListener('change', commit)
    return () => element?.removeEventListener('change', commit)
  }, [onChange])

  const commitTypedHex = () => {
    const typed = typedHex && parseHexColor(typedHex.trim().replace(/^#?/, '#'))
    if (typed && typed !== value) {
      onChange(typed)
    }
    setTypedHex(undefined)
  }

  return (
    <div className="payloadpack-appearance-panel__color">
      <input
        aria-label={label}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value, false)}
        ref={colorPickerInput}
        type="color"
        value={value}
      />
      <input
        aria-label={`${label} hex`}
        onBlur={commitTypedHex}
        onChange={(event) => setTypedHex(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && commitTypedHex()}
        spellCheck={false}
        value={typedHex ?? value}
      />
    </div>
  )
}

type StatusMessage = { message: string; tone?: 'error'; undo?: () => void }

function useStatusMessage() {
  const [statusMessage, setStatusMessage] = useState<StatusMessage>()

  useEffect(() => {
    if (!statusMessage) {
      return
    }
    const timeout = setTimeout(() => setStatusMessage(undefined), statusMessage.undo ? UNDO_MS : STATUS_MS)
    return () => clearTimeout(timeout)
  }, [statusMessage])

  return [statusMessage, setStatusMessage] as const
}

type RadioChoice<V extends string> = { label: ReactNode; name?: string; value: V }

function RadioGroup<V extends string>({
  choices,
  className,
  labelledBy,
  onChange,
  selected
}: {
  choices: RadioChoice<V>[]
  className: string
  labelledBy: string
  onChange: (value: V) => void
  selected: V | undefined
}) {
  const name = useId()

  return (
    <div aria-labelledby={labelledBy} className={className} role="radiogroup">
      {choices.map((choice) => (
        <label key={choice.value} title={choice.name}>
          <input
            aria-label={choice.name}
            checked={choice.value === selected}
            name={name}
            onChange={() => onChange(choice.value)}
            type="radio"
            value={choice.value}
          />
          {choice.label}
        </label>
      ))}
    </div>
  )
}

function PanelSection({ children, label }: { children: (labelId: string) => ReactNode; label: string }) {
  const id = useId()

  return (
    <section className="payloadpack-appearance-panel__section">
      <h3 id={id}>{label}</h3>
      {children(id)}
    </section>
  )
}

function PaletteSection({ copyToClipboard }: { copyToClipboard: (text: string, message: string) => void }) {
  const { allowedPalettes, customPalette, palette, removeCustomPalette, setCustomPalette, setPalette } = useAppearance()
  const { i18n, t } = useTranslation<object, TranslationKey>()
  const [focusFirstColorField, setFocusFirstColorField] = useState(false)
  const focusCustomButtonNext = useRef(false)
  const customCss = customPalette && customPaletteCss(customPaletteSlug, customPalette)
  const paletteLabel = ({ label, slug }: { label?: StaticLabel; slug: string }) => {
    if (!label) {
      return t(`payloadpack:palette${capitalize(slug)}` as TranslationKey)
    }
    return typeof label === 'string' ? label : (label[i18n.language] ?? label[i18n.fallbackLanguage] ?? Object.values(label)[0])
  }

  return (
    <PanelSection label={t('payloadpack:palette')}>
      {(labelId) => (
        <>
          <div className="payloadpack-appearance-panel__cards">
            <RadioGroup
              choices={[...allowedPalettes, ...(customPalette ? [{ slug: customPaletteSlug }] : [])].map((choice) => ({
                label: (
                  <>
                    <span aria-hidden="true" className="payloadpack-appearance-panel__halves">
                      {paletteModes.map((mode) => (
                        <span data-palette={choice.slug} data-theme={mode} key={mode}>
                          <span />
                          <span />
                          <span />
                        </span>
                      ))}
                    </span>
                    {paletteLabel(choice)}
                  </>
                ),
                value: choice.slug
              }))}
              className="payloadpack-appearance-panel__palettes"
              labelledBy={labelId}
              onChange={(next) => {
                setFocusFirstColorField(false)
                setPalette(next)
              }}
              selected={palette}
            />
            {!customPalette && (
              <button
                aria-label={t('payloadpack:customColors')}
                className="payloadpack-appearance-panel__add"
                ref={(element) => {
                  if (element && focusCustomButtonNext.current) {
                    focusCustomButtonNext.current = false
                    element.focus()
                  }
                }}
                onClick={(event) => {
                  const paletteCards = event.currentTarget
                    .closest('section')
                    ?.querySelector('.payloadpack-appearance-panel__halves')
                  if (paletteCards) {
                    setFocusFirstColorField(true)
                    setCustomPalette(readRenderedPaletteColors(paletteCards, palette))
                  }
                }}
                type="button">
                {t('payloadpack:paletteCustom')}
              </button>
            )}
          </div>
          {palette === customPaletteSlug && customPalette && customCss && (
            <div className="payloadpack-appearance-panel__editor">
              <span />
              {paletteModes.map((mode) => (
                <span key={mode}>{t(`payloadpack:${mode}`)}</span>
              ))}
              {customPaletteBaseColorNames.map((baseColorName, row) => (
                <Fragment key={baseColorName}>
                  <span>{t(`payloadpack:${baseColorName}`)}</span>
                  {paletteModes.map((mode, column) => (
                    <ColorField
                      autoFocus={focusFirstColorField && row === 0 && column === 0}
                      key={mode}
                      label={`${t(`payloadpack:${baseColorName}`)}, ${t(`payloadpack:${mode}`)}`}
                      onChange={(value, persist) =>
                        setCustomPalette(
                          { ...customPalette, [mode]: { ...customPalette[mode], [baseColorName]: value } },
                          persist
                        )
                      }
                      value={customPalette[mode][baseColorName]}
                    />
                  ))}
                </Fragment>
              ))}
              <span>{t('payloadpack:accent')}</span>
              <ColorField
                label={`${t('payloadpack:accent')}, ${t('payloadpack:bothModes')}`}
                onChange={(value, persist) => setCustomPalette({ ...customPalette, accent: value }, persist)}
                value={customPalette.accent}
              />
              <div className="payloadpack-appearance-panel__actions">
                <button
                  className="payloadpack-appearance-panel__link"
                  onClick={() => copyToClipboard(customCss, t('payloadpack:cssCopied'))}
                  type="button">
                  {t('payloadpack:copyCss')}
                </button>
                <button
                  className="payloadpack-appearance-panel__link"
                  onClick={() => {
                    focusCustomButtonNext.current = true
                    removeCustomPalette()
                  }}
                  type="button">
                  {t('payloadpack:removeColors')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </PanelSection>
  )
}

export function AppearanceSheet() {
  const {
    allowedCharacters,
    allowedPalettes,
    changedOptionCount,
    character,
    optionValues,
    pasteSetup,
    resetCharacterOptions,
    saveFailed,
    setCharacter,
    setOption,
    shareableSetup
  } = useAppearance()
  const { autoMode, setTheme, theme } = useTheme()
  const { config } = useConfig()
  const { t } = useTranslation<object, TranslationKey>()
  const fineTuneSummary = useRef<HTMLElement>(null)
  const focusUndoButton = useCallback((element: HTMLButtonElement | null) => {
    element?.focus()
    return () => {
      if (element && document.activeElement === element) {
        fineTuneSummary.current?.focus()
      }
    }
  }, [])
  const [statusMessage, setStatusMessage] = useStatusMessage()
  const visibleStatusMessage: StatusMessage | undefined =
    statusMessage ?? (saveFailed ? { message: t('payloadpack:setupUnsaved'), tone: 'error' } : undefined)
  const characterName = t(`payloadpack:character${capitalize(character)}` as TranslationKey)
  const characterOptions = Object.keys(registry[character].defaults) as OptionName[]

  const reportClipboardBlocked = () => setStatusMessage({ message: t('payloadpack:clipboardBlocked'), tone: 'error' })

  const copyToClipboard = (text: string, message: string) =>
    navigator.clipboard
      ? void navigator.clipboard.writeText(text).then(() => setStatusMessage({ message }), reportClipboardBlocked)
      : reportClipboardBlocked()

  const pasteFromClipboard = () =>
    navigator.clipboard
      ? void navigator.clipboard
          .readText()
          .then(
            (text) =>
              setStatusMessage(
                pasteSetup(text)
                  ? { message: t('payloadpack:setupPasted') }
                  : { message: t('payloadpack:invalidSetup'), tone: 'error' }
              ),
            reportClipboardBlocked
          )
      : reportClipboardBlocked()

  const resetCharacterWithUndo = () =>
    setStatusMessage({ message: t('payloadpack:resetDone', { character: characterName }), undo: resetCharacterOptions() })

  return (
    <div className="payloadpack-appearance-panel">
      <dialog aria-labelledby={`${SHEET_ID}-title`} className="payloadpack-appearance-panel__sheet" id={SHEET_ID} popover="auto">
        <header className="payloadpack-appearance-panel__header">
          <div>
            <h2 id={`${SHEET_ID}-title`}>{t('payloadpack:appearance')}</h2>
            <p>{t('payloadpack:appearanceDescription')}</p>
          </div>
          <button
            aria-label={t('payloadpack:close')}
            className="payloadpack-appearance-panel__close"
            popoverTarget={SHEET_ID}
            popoverTargetAction="hide"
            type="button">
            <XIcon size={16} />
          </button>
        </header>
        <div className="payloadpack-appearance-panel__body">
          {config.admin.theme === 'all' && (
            <PanelSection label={t('payloadpack:colorMode')}>
              {(labelId) => (
                <RadioGroup
                  choices={themeModes.map((mode) => ({ label: t(`payloadpack:${mode}`), value: mode }))}
                  className="payloadpack-appearance-panel__segments"
                  labelledBy={labelId}
                  onChange={setTheme}
                  selected={autoMode ? 'auto' : theme}
                />
              )}
            </PanelSection>
          )}
          {allowedPalettes.length > 1 && <PaletteSection copyToClipboard={copyToClipboard} />}
          <PanelSection label={t('payloadpack:character')}>
            {(labelId) => (
              <>
                {allowedCharacters.length > 1 && (
                  <RadioGroup
                    choices={allowedCharacters.map((name) => ({
                      label: (
                        <>
                          <span
                            aria-hidden="true"
                            className={`payloadpack-appearance-panel__preview payloadpack-appearance-panel__preview--${name}`}>
                            <span>
                              <span />
                              <span />
                              <span />
                            </span>
                            <span>
                              <span />
                              <span />
                              <span />
                              <span />
                            </span>
                          </span>
                          {t(`payloadpack:character${capitalize(name)}` as TranslationKey)}
                        </>
                      ),
                      value: name
                    }))}
                    className="payloadpack-appearance-panel__cards"
                    labelledBy={labelId}
                    onChange={setCharacter}
                    selected={character}
                  />
                )}
                <p className="payloadpack-appearance-panel__description">
                  {t(`payloadpack:character${capitalize(character)}Description` as TranslationKey)}
                </p>
                {characterOptions.length > 0 && (
                  <details className="payloadpack-appearance-panel__fine-tune">
                    <summary ref={fineTuneSummary}>
                      {t('payloadpack:fineTune', { character: characterName })}
                      {changedOptionCount > 0 && <span>{t('payloadpack:fineTuneChanged', { count: changedOptionCount })}</span>}
                    </summary>
                    {characterOptions.map((option) => (
                      <FineTuneRow
                        key={option}
                        label={t(`payloadpack:${option}`)}
                        onChange={(value) => setOption(option, value)}
                        option={option}
                        selected={optionValues[option]}
                      />
                    ))}
                    <button
                      className="payloadpack-appearance-panel__link"
                      disabled={changedOptionCount === 0}
                      onClick={resetCharacterWithUndo}
                      type="button">
                      {t('payloadpack:reset', { character: characterName })}
                    </button>
                  </details>
                )}
              </>
            )}
          </PanelSection>
        </div>
        <footer className="payloadpack-appearance-panel__footer">
          <button
            className="payloadpack-appearance-panel__link payloadpack-appearance-panel__share"
            popoverTarget={SHARE_ID}
            type="button">
            {t('payloadpack:shareSetup')}
          </button>
          <p className="payloadpack-appearance-panel__status" data-tone={visibleStatusMessage?.tone} role="status">
            {visibleStatusMessage?.message}
            {visibleStatusMessage?.undo && (
              <button
                ref={focusUndoButton}
                onClick={() => {
                  visibleStatusMessage.undo?.()
                  setStatusMessage(undefined)
                }}
                type="button">
                {t('payloadpack:undo')}
              </button>
            )}
          </p>
          <div className="payloadpack-appearance-panel__menu" id={SHARE_ID} popover="auto">
            <button
              onClick={() => copyToClipboard(JSON.stringify(shareableSetup, null, 2), t('payloadpack:setupCopied'))}
              popoverTarget={SHARE_ID}
              popoverTargetAction="hide"
              type="button">
              {t('payloadpack:copySetup')}
            </button>
            <button onClick={pasteFromClipboard} popoverTarget={SHARE_ID} popoverTargetAction="hide" type="button">
              {t('payloadpack:pasteSetup')}
            </button>
          </div>
        </footer>
      </dialog>
    </div>
  )
}

function LucideLogo() {
  return (
    <svg fill="none" height="100%" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width="100%">
      <path
        d="M14 12C14 9.79086 12.2091 8 10 8C7.79086 8 6 9.79086 6 12C6 16.4183 9.58172 20 14 20C18.4183 20 22 16.4183 22 12C22 8.446 20.455 5.25285 18 3.05557"
        stroke="currentColor"
      />
      <path
        d="M10 12C10 14.2091 11.7909 16 14 16C16.2091 16 18 14.2091 18 12C18 7.58172 14.4183 4 10 4C5.58172 4 2 7.58172 2 12C2 15.5841 3.57127 18.8012 6.06253 21"
        stroke="#f56565"
      />
    </svg>
  )
}

function FineTuneRow<O extends OptionName>({
  label,
  onChange,
  option,
  selected
}: {
  label: string
  onChange: (value: (typeof allowedOptionValues)[O][number]) => void
  option: O
  selected: (typeof allowedOptionValues)[O][number] | undefined
}) {
  const id = useId()
  const { t } = useTranslation<object, TranslationKey>()

  return (
    <div className="payloadpack-appearance-panel__row" data-option={option}>
      <span id={id}>{label}</span>
      <RadioGroup
        choices={allowedOptionValues[option].map((value) => ({
          label:
            option === 'radius' ? (
              <span aria-hidden="true" className="payloadpack-appearance-panel__corner" data-value={value} />
            ) : (
              <>
                {option === 'icons' && (
                  <span aria-hidden="true" className="payloadpack-appearance-panel__logo">
                    {value === 'payload' ? <PayloadIcon fill="currentColor" /> : <LucideLogo />}
                  </span>
                )}
                <span data-font={option === 'font' ? value : undefined}>
                  {t(`payloadpack:${option}${capitalize(value)}` as TranslationKey)}
                </span>
              </>
            ),
          name: option === 'radius' ? t(`payloadpack:${option}${capitalize(value)}` as TranslationKey) : undefined,
          value
        }))}
        className="payloadpack-appearance-panel__segments"
        labelledBy={id}
        onChange={onChange}
        selected={selected}
      />
    </div>
  )
}
