'use client'

import { PayloadIcon, useConfig, useTheme, useTranslation, XIcon } from '@payloadcms/ui'
import { Fragment, type ReactNode, useEffect, useId, useRef, useState } from 'react'

import { characters as registry, type Option, options } from '../characters/index.js'
import { type Base, bases, baseTokens, type CustomPalette, customPalette, isHex, paletteCss } from '../lib/appearance.js'
import type { TranslationKey } from '../translations.js'
import { useAppearance } from './appearance-provider.js'

const colorModes = ['light', 'dark', 'auto'] as const

const halves = ['light', 'dark'] as const

const SHEET_ID = 'payloadpack-appearance'

const SHARE_ID = 'payloadpack-appearance-share'

const STATUS_MS = 3000

const UNDO_MS = 8000

const capitalize = (text: string) => `${text[0].toUpperCase()}${text.slice(1)}`

const toHex = (color: string) => {
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('A 2D canvas is needed to read palette colors')
  }
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  return `#${[...context.getImageData(0, 0, 1, 1).data.slice(0, 3)].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

const readPalette = (cards: Element, name: string): CustomPalette => {
  const color = (probe: HTMLElement, value: string) => {
    probe.style.color = value
    return toHex(getComputedStyle(probe).color)
  }
  const read = (half: (typeof halves)[number]) => {
    const probe = document.createElement('span')
    Object.assign(probe.dataset, { palette: name, theme: half })
    cards.append(probe)
    const base = Object.fromEntries(bases.map((key) => [key, color(probe, `var(${baseTokens[key]})`)])) as Base
    const accent = color(probe, 'var(--payloadpack-accent, var(--ramp-blue-500))')
    probe.remove()
    return { accent, base }
  }
  const [light, dark] = [read('light'), read('dark')]
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
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const element = input.current
    const commit = () => element && onChange(element.value)
    element?.addEventListener('change', commit)
    return () => element?.removeEventListener('change', commit)
  }, [onChange])

  const commitHex = (field: HTMLInputElement) => {
    const typed = field.value.trim().toLowerCase().replace(/^#?/, '#')
    if (isHex(typed)) {
      onChange(typed)
    } else {
      field.value = value
    }
  }

  return (
    <div className="payloadpack-appearance-panel__color">
      <input
        aria-label={label}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value, false)}
        ref={input}
        type="color"
        value={value}
      />
      <input
        aria-label={`${label} hex`}
        defaultValue={value}
        key={value}
        onBlur={(event) => commitHex(event.currentTarget)}
        onKeyDown={(event) => event.key === 'Enter' && commitHex(event.currentTarget)}
        spellCheck={false}
      />
    </div>
  )
}

type Status = { message: string; tone?: 'error'; undo?: () => void }

function useStatus() {
  const [status, setStatus] = useState<Status>()

  useEffect(() => {
    if (!status) {
      return
    }
    const timeout = setTimeout(() => setStatus(undefined), status.undo ? UNDO_MS : STATUS_MS)
    return () => clearTimeout(timeout)
  }, [status])

  return [status, setStatus] as const
}

type Choice<V extends string> = { label: ReactNode; name?: string; value: V }

function RadioGroup<V extends string>({
  children,
  choices,
  className,
  labelledBy,
  onChange,
  selected
}: {
  children?: ReactNode
  choices: Choice<V>[]
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
      {children}
    </div>
  )
}

function Section({ children, label }: { children: (labelId: string) => ReactNode; label: string }) {
  const id = useId()

  return (
    <section className="payloadpack-appearance-panel__section">
      <h3 id={id}>{label}</h3>
      {children(id)}
    </section>
  )
}

export function AppearanceSheet() {
  const {
    changed,
    character,
    characters,
    custom,
    palette,
    palettes,
    paste,
    removeCustom,
    reset,
    setCharacter,
    setCustom,
    setOption,
    setPalette,
    setup,
    unsaved,
    values
  } = useAppearance()
  const { autoMode, setTheme, theme } = useTheme()
  const { config } = useConfig()
  const { t } = useTranslation<object, TranslationKey>()
  const [focusEditor, setFocusEditor] = useState(false)
  const [status, setStatus] = useStatus()
  const shown: Status | undefined = unsaved ? { message: t('payloadpack:setupUnsaved'), tone: 'error' } : status
  const characterName = t(`payloadpack:character${capitalize(character)}` as TranslationKey)
  const css = custom && paletteCss(customPalette, custom)
  const supported = Object.keys(registry[character].defaults) as Option[]

  const blocked = () => setStatus({ message: t('payloadpack:clipboardBlocked'), tone: 'error' })

  const copy = (text: string, message: string) =>
    navigator.clipboard ? void navigator.clipboard.writeText(text).then(() => setStatus({ message }), blocked) : blocked()

  const pasteFromClipboard = () =>
    navigator.clipboard
      ? void navigator.clipboard
          .readText()
          .then(
            (text) =>
              setStatus(
                paste(text)
                  ? { message: t('payloadpack:setupPasted') }
                  : { message: t('payloadpack:invalidSetup'), tone: 'error' }
              ),
            blocked
          )
      : blocked()

  const resetCharacter = () => setStatus({ message: t('payloadpack:resetDone', { character: characterName }), undo: reset() })

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
            <Section label={t('payloadpack:colorMode')}>
              {(labelId) => (
                <RadioGroup
                  choices={colorModes.map((mode) => ({ label: t(`payloadpack:${mode}`), value: mode }))}
                  className="payloadpack-appearance-panel__segments"
                  labelledBy={labelId}
                  onChange={setTheme}
                  selected={autoMode ? 'auto' : theme}
                />
              )}
            </Section>
          )}
          {palettes.length > 1 && (
            <Section label={t('payloadpack:palette')}>
              {(labelId) => (
                <>
                  <RadioGroup
                    choices={[...palettes, ...(custom ? [customPalette] : [])].map((name) => ({
                      label: (
                        <>
                          <span aria-hidden="true" className="payloadpack-appearance-panel__halves">
                            {halves.map((half) => (
                              <span data-palette={name} data-theme={half} key={half}>
                                <span />
                                <span />
                                <span />
                              </span>
                            ))}
                          </span>
                          {t(`payloadpack:palette${capitalize(name)}` as TranslationKey)}
                        </>
                      ),
                      value: name
                    }))}
                    className="payloadpack-appearance-panel__cards"
                    labelledBy={labelId}
                    onChange={setPalette}
                    selected={palette}>
                    {!custom && (
                      <button
                        aria-label={t('payloadpack:customColors')}
                        className="payloadpack-appearance-panel__add"
                        onClick={(event) => {
                          const cards = event.currentTarget
                            .closest('section')
                            ?.querySelector('.payloadpack-appearance-panel__halves')
                          if (cards) {
                            setFocusEditor(true)
                            setCustom(readPalette(cards, palette))
                          }
                        }}
                        type="button">
                        {t('payloadpack:paletteCustom')}
                      </button>
                    )}
                  </RadioGroup>
                  {palette === customPalette && custom && css && (
                    <div className="payloadpack-appearance-panel__editor">
                      <span />
                      {halves.map((half) => (
                        <span key={half}>{t(`payloadpack:${half}`)}</span>
                      ))}
                      {bases.map((base, row) => (
                        <Fragment key={base}>
                          <span>{t(`payloadpack:${base}`)}</span>
                          {halves.map((half, column) => (
                            <ColorField
                              autoFocus={focusEditor && row === 0 && column === 0}
                              key={half}
                              label={`${t(`payloadpack:${base}`)}, ${t(`payloadpack:${half}`)}`}
                              onChange={(value, persist) =>
                                setCustom({ ...custom, [half]: { ...custom[half], [base]: value } }, persist)
                              }
                              value={custom[half][base]}
                            />
                          ))}
                        </Fragment>
                      ))}
                      <span>{t('payloadpack:accent')}</span>
                      <ColorField
                        label={`${t('payloadpack:accent')}, ${t('payloadpack:bothModes')}`}
                        onChange={(value, persist) => setCustom({ ...custom, accent: value }, persist)}
                        value={custom.accent}
                      />
                      <div className="payloadpack-appearance-panel__actions">
                        <button
                          className="payloadpack-appearance-panel__link"
                          onClick={() => copy(css, t('payloadpack:cssCopied'))}
                          type="button">
                          {t('payloadpack:copyCss')}
                        </button>
                        <button className="payloadpack-appearance-panel__link" onClick={removeCustom} type="button">
                          {t('payloadpack:removeColors')}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Section>
          )}
          <Section label={t('payloadpack:character')}>
            {(labelId) => (
              <>
                {characters.length > 1 && (
                  <RadioGroup
                    choices={characters.map((name) => ({
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
                {supported.length > 0 && (
                  <details className="payloadpack-appearance-panel__fine-tune">
                    <summary>
                      {t('payloadpack:fineTune', { character: characterName })}
                      {changed > 0 && <span>{t('payloadpack:fineTuneChanged', { count: changed })}</span>}
                    </summary>
                    {supported.map((option) => (
                      <FineTuneRow
                        key={option}
                        label={t(`payloadpack:${option}`)}
                        onChange={(value) => setOption(option, value)}
                        option={option}
                        selected={values[option]}
                      />
                    ))}
                    <button
                      className="payloadpack-appearance-panel__link"
                      disabled={changed === 0}
                      onClick={resetCharacter}
                      type="button">
                      {t('payloadpack:reset', { character: characterName })}
                    </button>
                  </details>
                )}
              </>
            )}
          </Section>
        </div>
        <footer className="payloadpack-appearance-panel__footer">
          <button
            className="payloadpack-appearance-panel__link payloadpack-appearance-panel__share"
            popoverTarget={SHARE_ID}
            type="button">
            {t('payloadpack:shareSetup')}
          </button>
          <p className="payloadpack-appearance-panel__status" data-tone={shown?.tone} role="status">
            {shown?.message}
            {shown?.undo && (
              <button
                onClick={() => {
                  shown.undo?.()
                  setStatus(undefined)
                }}
                type="button">
                {t('payloadpack:undo')}
              </button>
            )}
          </p>
          <div className="payloadpack-appearance-panel__menu" id={SHARE_ID} popover="auto">
            <button
              onClick={() => copy(JSON.stringify(setup, null, 2), t('payloadpack:setupCopied'))}
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

function FineTuneRow<O extends Option>({
  label,
  onChange,
  option,
  selected
}: {
  label: string
  onChange: (value: (typeof options)[O][number]) => void
  option: O
  selected: (typeof options)[O][number] | undefined
}) {
  const id = useId()
  const { t } = useTranslation<object, TranslationKey>()

  return (
    <div className="payloadpack-appearance-panel__row" data-option={option}>
      <span id={id}>{label}</span>
      <RadioGroup
        choices={options[option].map((value) => ({
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
