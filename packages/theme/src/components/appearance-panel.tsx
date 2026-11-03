'use client'

import { Button, useConfig, useTheme, useTranslation, XIcon } from '@payloadcms/ui'
import { type ReactNode, useEffect, useId, useState } from 'react'

import { characters as registry, type Option, options } from '../characters/index.js'
import { hexPattern } from '../lib/appearance.js'
import { payloadBlue, palettes as paletteRegistry } from '../palettes/index.js'
import type { TranslationKey } from '../translations.js'
import { useAppearance } from './appearance-provider.js'

const colorModes = ['light', 'dark', 'auto'] as const

const halves = ['light', 'dark'] as const

const swatches = [payloadBlue, '#c2410c', '#b45309', '#4d7c0f', '#0f766e', '#1d4ed8', '#7c3aed', '#be185d']

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
    accent,
    character,
    characters,
    palette,
    palettes,
    paste,
    reset,
    setAccent,
    setCharacter,
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
  const [hex, setHex] = useState<string>()
  const json = JSON.stringify(setup, null, 2)
  const isRejected = rejectedAt !== undefined
  const supported = Object.keys(registry[character].defaults) as Option[]

  const typeHex = (text: string) => {
    setHex(text)
    if (hexPattern.test(text.toLowerCase())) {
      setAccent(text.toLowerCase())
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(json)
    setCopied(json)
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
              choices={palettes.map((name) => ({
                label: (
                  <>
                    <span aria-hidden="true" className="payloadpack-appearance-panel__halves">
                      {halves.map((half) => (
                        <span
                          key={half}
                          style={{
                            backgroundColor: paletteRegistry[name].preview[half].background,
                            color: paletteRegistry[name].preview[half].text
                          }}>
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
              selected={palette}
            />
          )}
          <ChoiceGroup
            choices={swatches.map((swatch) => ({
              label: <span style={{ backgroundColor: swatch }} />,
              name: swatch,
              value: swatch
            }))}
            className="payloadpack-appearance-panel__swatches"
            label={t('payloadpack:accent')}
            onChange={setAccent}
            selected={accent}>
            <label className="payloadpack-appearance-panel__hex">
              <span aria-hidden="true" />
              {t('payloadpack:hex')}
              <input
                aria-label={t('payloadpack:accentHex')}
                onBlur={() => setHex(undefined)}
                onChange={(event) => typeHex(event.target.value)}
                spellCheck={false}
                value={hex ?? accent}
              />
            </label>
          </ChoiceGroup>
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
          <Button buttonStyle="secondary" onClick={copy} size="large">
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
