import type { Option, OptionValue } from './characters/index.js'

type OptionKey = { [O in Option]: O | `${O}${Capitalize<OptionValue<O>>}` }[Option]

const payloadpack = {
  accent: 'Accent',
  accentHex: 'Accent hex color',
  appearance: 'Appearance',
  appearanceDescription: 'Changes how the admin looks for you only.',
  apply: 'Apply',
  auto: 'Auto',
  character: 'Character',
  close: 'Close',
  colorMode: 'Color mode',
  copied: 'Copied',
  copySetup: 'Copy setup',
  dark: 'Dark',
  density: 'Density',
  densityComfortable: 'Comfortable',
  densityCompact: 'Compact',
  icons: 'Icons',
  iconsLucide: 'Lucide',
  iconsPayload: 'Payload',
  invalidSetup: 'This text is not a valid setup.',
  light: 'Light',
  palette: 'Palette',
  pasteSetup: 'Paste setup',
  radius: 'Corners',
  radiusFull: 'Round',
  radiusLg: 'L',
  radiusMd: 'M',
  radiusNone: 'None',
  radiusSm: 'S',
  reset: 'Reset',
  stockNote: "Stock keeps Payload's own layout. It has no options."
} satisfies Record<OptionKey, string> & Record<string, string>

export const translations = { payloadpack }

export type TranslationKey = `payloadpack:${keyof typeof payloadpack}`
