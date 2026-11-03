'use client'

import { useConfig, useTheme, useTranslation, XIcon } from '@payloadcms/ui'
import { type ReactNode, useId, useState } from 'react'

import { characters as registry, type Option, options } from '../characters/index.js'
import type { TranslationKey } from '../translations.js'
import { useAppearance } from './appearance-provider.js'

const colorModes = ['light', 'dark', 'auto'] as const

const capitalize = (text: string) => `${text[0].toUpperCase()}${text.slice(1)}`

type ChoicesProps<V extends string> = {
  choices: { label: ReactNode; value: V }[]
  className: string
  label: string
  onChange: (value: V) => void
  selected: V | undefined
}

function Choices<V extends string>({ choices, className, label, onChange, selected }: ChoicesProps<V>) {
  const id = useId()

  return (
    <section className="payloadpack-appearance-panel__section">
      <h3 id={id}>{label}</h3>
      <div aria-labelledby={id} className={className} role="group">
        {choices.map((choice) => (
          <button
            aria-pressed={choice.value === selected}
            key={choice.value}
            onClick={() => onChange(choice.value)}
            type="button">
            {choice.label}
          </button>
        ))}
      </div>
    </section>
  )
}

export function AppearancePanel() {
  const id = useId()
  const { character, characters, paste, reset, setCharacter, setOption, setup, values } = useAppearance()
  const { autoMode, setTheme, theme } = useTheme()
  const { config } = useConfig()
  const { t } = useTranslation<object, TranslationKey>()
  const [copied, setCopied] = useState<string>()
  const [draft, setDraft] = useState<{ isInvalid: boolean; text: string }>()
  const json = JSON.stringify(setup, null, 2)
  const supported = Object.keys(registry[character].defaults) as Option[]

  const copy = async () => {
    await navigator.clipboard.writeText(json)
    setCopied(json)
  }

  const apply = (text: string) => setDraft(paste(text) ? undefined : { isInvalid: true, text })

  return (
    <div className="payloadpack-appearance-panel">
      <button
        aria-label={t('payloadpack:appearance')}
        className="payloadpack-appearance-panel__icon-button"
        popoverTarget={id}
        type="button">
        <svg
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24">
          <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" />
          <circle cx="13.5" cy="6.5" fill="currentColor" r=".5" />
          <circle cx="17.5" cy="10.5" fill="currentColor" r=".5" />
          <circle cx="6.5" cy="12.5" fill="currentColor" r=".5" />
          <circle cx="8.5" cy="7.5" fill="currentColor" r=".5" />
        </svg>
      </button>
      <dialog aria-labelledby={`${id}-title`} className="payloadpack-appearance-panel__sheet" id={id} popover="auto">
        <header className="payloadpack-appearance-panel__header">
          <div>
            <h2 id={`${id}-title`}>{t('payloadpack:appearance')}</h2>
            <p>{t('payloadpack:appearanceDescription')}</p>
          </div>
          <button
            aria-label={t('payloadpack:close')}
            className="payloadpack-appearance-panel__icon-button"
            popoverTarget={id}
            popoverTargetAction="hide"
            type="button">
            <XIcon size={16} />
          </button>
        </header>
        <div className="payloadpack-appearance-panel__body">
          {characters.length > 1 && (
            <Choices
              choices={characters.map((name) => ({
                label: (
                  <>
                    <span
                      aria-hidden="true"
                      className={`payloadpack-appearance-panel__preview payloadpack-appearance-panel__preview--${name}`}>
                      <span />
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
              className="payloadpack-appearance-panel__characters"
              label={t('payloadpack:character')}
              onChange={setCharacter}
              selected={character}
            />
          )}
          {supported.length ? (
            supported.map((option) => (
              <Choices
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
          {config.admin.theme === 'all' && (
            <Choices
              choices={colorModes.map((mode) => ({ label: t(`payloadpack:${mode}`), value: mode }))}
              className="payloadpack-appearance-panel__segments"
              label={t('payloadpack:colorMode')}
              onChange={setTheme}
              selected={autoMode ? 'auto' : theme}
            />
          )}
        </div>
        <footer className="payloadpack-appearance-panel__footer">
          <button onClick={reset} type="button">
            {t('payloadpack:reset')}
          </button>
          <button onClick={copy} type="button">
            {t(copied === json ? 'payloadpack:copied' : 'payloadpack:copySetup')}
          </button>
          <button
            aria-expanded={draft !== undefined}
            onClick={() => setDraft(draft ? undefined : { isInvalid: false, text: '' })}
            type="button">
            {t('payloadpack:pasteSetup')}
          </button>
          {draft && (
            <div className="payloadpack-appearance-panel__paste">
              <textarea
                aria-invalid={draft.isInvalid}
                aria-label={t('payloadpack:pasteSetup')}
                onChange={(event) => setDraft({ isInvalid: false, text: event.target.value })}
                spellCheck={false}
                value={draft.text}
              />
              {draft.isInvalid && <p role="alert">{t('payloadpack:invalidSetup')}</p>}
              <button onClick={() => apply(draft.text)} type="button">
                {t('payloadpack:apply')}
              </button>
            </div>
          )}
        </footer>
      </dialog>
    </div>
  )
}
