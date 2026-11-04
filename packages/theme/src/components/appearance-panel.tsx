'use client'

import { Button, useConfig, useTheme, useTranslation, XIcon } from '@payloadcms/ui'
import { type ReactNode, useEffect, useId, useState } from 'react'

import { characters as registry, type Option, options } from '../characters/index.js'
import { type Base, bases, type CustomPalette, customPalette, paletteCss } from '../lib/appearance.js'
import type { TranslationKey } from '../translations.js'
import { useAppearance } from './appearance-provider.js'

const colorModes = ['light', 'dark', 'auto'] as const

const halves = ['light', 'dark'] as const

const FEEDBACK_MS = 2000

const capitalize = (text: string) => `${text[0].toUpperCase()}${text.slice(1)}`

type ChoiceGroupProps<V extends string> = {
  children?: ReactNode
  choices: { label: ReactNode; name?: string; value: V }[]
  className: string
  label: string
  onChange: (value: V) => void
  selected: V | undefined
}

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
    const base = Object.fromEntries(bases.map((key) => [key, color(probe, `var(--payloadpack-${key})`)])) as Base
    const accent = color(probe, 'var(--payloadpack-accent, var(--ramp-blue-500))')
    probe.remove()
    return { accent, base }
  }
  const [light, dark] = [read('light'), read('dark')]
  return { accent: light.accent, dark: dark.base, light: light.base }
}

function ColorField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="payloadpack-appearance-panel__color">
      <input onChange={(event) => onChange(event.target.value)} type="color" value={value} />
      {label}
    </label>
  )
}

function ChoiceGroup<V extends string>({ children, choices, className, label, onChange, selected }: ChoiceGroupProps<V>) {
  const id = useId()

  return (
    <section className="payloadpack-appearance-panel__section">
      <h3 id={id}>{label}</h3>
      <div aria-labelledby={id} className={className} role="group">
        {choices.map((choice) => (
          <button
            aria-label={choice.name}
            aria-pressed={choice.value === selected}
            key={choice.value}
            onClick={() => onChange(choice.value)}
            type="button">
            {choice.label}
          </button>
        ))}
      </div>
      {children}
    </section>
  )
}

export function AppearancePanel() {
  const id = useId()
  const {
    character,
    characters,
    custom,
    palette,
    palettes,
    paste,
    reset,
    setCharacter,
    setCustom,
    setOption,
    setPalette,
    setup,
    values
  } = useAppearance()
  const { autoMode, setTheme, theme } = useTheme()
  const { config } = useConfig()
  const { t } = useTranslation<object, TranslationKey>()
  const [copied, setCopied] = useState<string>()
  const [rejectedAt, setRejectedAt] = useState<number>()
  const json = JSON.stringify(setup, null, 2)
  const css = custom && paletteCss(customPalette, custom)
  const isRejected = rejectedAt !== undefined
  const supported = Object.keys(registry[character].defaults) as Option[]

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(text)
  }

  const pasteFromClipboard = async () => {
    setRejectedAt(paste(await navigator.clipboard.readText()) ? undefined : Date.now())
  }

  useEffect(() => {
    if (rejectedAt === undefined) {
      return
    }
    const timeout = setTimeout(() => setRejectedAt(undefined), FEEDBACK_MS)
    return () => clearTimeout(timeout)
  }, [rejectedAt])

  return (
    <div className="payloadpack-appearance-panel">
      <button
        aria-label={t('payloadpack:appearance')}
        className="payloadpack-appearance-panel__trigger"
        popoverTarget={id}
        type="button">
        <span aria-hidden="true" className="payloadpack-appearance-panel__palette-icon" />
      </button>
      <dialog aria-labelledby={`${id}-title`} className="payloadpack-appearance-panel__sheet" id={id} popover="auto">
        <header className="payloadpack-appearance-panel__header">
          <div>
            <h2 id={`${id}-title`}>{t('payloadpack:appearance')}</h2>
            <p>{t('payloadpack:appearanceDescription')}</p>
          </div>
          <button
            aria-label={t('payloadpack:close')}
            className="payloadpack-appearance-panel__close"
            popoverTarget={id}
            popoverTargetAction="hide"
            type="button">
            <XIcon size={16} />
          </button>
        </header>
        <div className="payloadpack-appearance-panel__body">
          {characters.length > 1 && (
            <ChoiceGroup
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
                    {capitalize(name)}
                  </>
                ),
                value: name
              }))}
              className="payloadpack-appearance-panel__cards"
              label={t('payloadpack:character')}
              onChange={setCharacter}
              selected={character}
            />
          )}
          {supported.length ? (
            supported.map((option) => (
              <ChoiceGroup
                choices={options[option].map((value) => ({
                  label: t(`payloadpack:${option}${capitalize(value)}` as TranslationKey),
                  value
                }))}
                className="payloadpack-appearance-panel__segments"
                key={option}
                label={t(`payloadpack:${option}`)}
                onChange={(value) => setOption(option, value)}
                selected={values[option]}
              />
            ))
          ) : (
            <p className="payloadpack-appearance-panel__note">{t('payloadpack:stockNote')}</p>
          )}
          {palettes.length > 1 && (
            <ChoiceGroup
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
                    {capitalize(name)}
                  </>
                ),
                value: name
              }))}
              className="payloadpack-appearance-panel__cards"
              label={t('payloadpack:palette')}
              onChange={setPalette}
              selected={palette}>
              {!custom && (
                <Button
                  buttonStyle="secondary"
                  onClick={(event) => {
                    const cards = event.currentTarget.closest('section')?.querySelector('.payloadpack-appearance-panel__halves')
                    if (cards) {
                      setCustom(readPalette(cards, palette))
                    }
                  }}
                  size="medium">
                  {t('payloadpack:newPalette')}
                </Button>
              )}
              {palette === customPalette && custom && css && (
                <div className="payloadpack-appearance-panel__editor">
                  {halves.map((half) => (
                    <fieldset key={half}>
                      <legend>{t(`payloadpack:${half}`)}</legend>
                      {bases.map((base) => (
                        <ColorField
                          key={base}
                          label={t(`payloadpack:${base}`)}
                          onChange={(value) => setCustom({ ...custom, [half]: { ...custom[half], [base]: value } })}
                          value={custom[half][base]}
                        />
                      ))}
                    </fieldset>
                  ))}
                  <ColorField
                    label={t('payloadpack:accent')}
                    onChange={(value) => setCustom({ ...custom, accent: value })}
                    value={custom.accent}
                  />
                  <Button buttonStyle="secondary" onClick={() => copy(css)} size="medium">
                    {t(copied === css ? 'payloadpack:copied' : 'payloadpack:copyCss')}
                  </Button>
                </div>
              )}
            </ChoiceGroup>
          )}
          {config.admin.theme === 'all' && (
            <ChoiceGroup
              choices={colorModes.map((mode) => ({ label: t(`payloadpack:${mode}`), value: mode }))}
              className="payloadpack-appearance-panel__segments"
              label={t('payloadpack:colorMode')}
              onChange={setTheme}
              selected={autoMode ? 'auto' : theme}
            />
          )}
        </div>
        <footer className="payloadpack-appearance-panel__footer">
          <Button buttonStyle="secondary" onClick={reset} size="large">
            {t('payloadpack:reset')}
          </Button>
          <Button buttonStyle="secondary" onClick={() => copy(json)} size="large">
            {t(copied === json ? 'payloadpack:copied' : 'payloadpack:copySetup')}
          </Button>
          <Button buttonStyle="secondary" onClick={pasteFromClipboard} size="large">
            {t(isRejected ? 'payloadpack:invalidSetup' : 'payloadpack:pasteSetup')}
          </Button>
          <span className="sr-only" role="status">
            {isRejected && t('payloadpack:invalidSetup')}
          </span>
        </footer>
      </dialog>
    </div>
  )
}
