import type { Option, OptionValue } from './characters/index.js'

type OptionKey = { [O in Option]: O | `${O}${Capitalize<OptionValue<O>>}` }[Option]

const payloadpack = {
  appearance: 'Appearance',
  appearanceDescription: 'Changes how the admin looks for you only.',
  auto: 'Auto',
  character: 'Character',
  close: 'Close',
  colorMode: 'Color mode',
  copied: 'Copied',
  copyConfig: 'Copy config',
  dark: 'Dark',
  density: 'Density',
  densityComfortable: 'Comfortable',
  densityCompact: 'Compact',
  icons: 'Icons',
  iconsLucide: 'Lucide',
  iconsPayload: 'Payload',
  light: 'Light',
  reset: 'Reset',
  stockNote: 'Stock shows Payload exactly as it ships. It has no options, so only color mode applies.'
} satisfies Record<OptionKey, string> & Record<string, string>

export const translations = { en: { payloadpack } }

export type TranslationKey = `payloadpack:${keyof typeof payloadpack}`
