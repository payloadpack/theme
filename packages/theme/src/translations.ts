import type { Option, OptionValue } from './characters/index.js'

type OptionKey = { [O in Option]: O | `${O}${Capitalize<OptionValue<O>>}` }[Option]

const payloadpack = {
  accent: 'Accent',
  appearance: 'Appearance',
  appearanceDescription: 'Changes how the admin looks for you only.',
  auto: 'Auto',
  background: 'Background',
  character: 'Character',
  close: 'Close',
  colorMode: 'Color mode',
  copied: 'Copied',
  copyCss: 'Copy as CSS',
  copySetup: 'Copy setup',
  dark: 'Dark',
  density: 'Density',
  densityComfortable: 'Comfortable',
  densityCompact: 'Compact',
  font: 'Typeface',
  fontGeist: 'Geist',
  fontPayload: 'Payload',
  fontSystem: 'System',
  frame: 'Frame',
  frameBoxed: 'Boxed',
  frameFlat: 'Flat',
  icons: 'Icons',
  iconsLucide: 'Lucide',
  iconsPayload: 'Payload',
  invalidSetup: 'Invalid setup',
  light: 'Light',
  motion: 'Motion',
  motionOff: 'Off',
  motionOn: 'On',
  nav: 'Collapsed nav',
  navHidden: 'Hidden',
  navIcons: 'Icons',
  newPalette: 'New palette',
  palette: 'Palette',
  pasteSetup: 'Paste setup',
  primary: 'Primary',
  radius: 'Corners',
  radiusFull: 'Round',
  radiusLg: 'L',
  radiusMd: 'M',
  radiusNone: 'None',
  radiusSm: 'S',
  reset: 'Reset',
  stockNote: "Stock keeps Payload's own layout. It has no options.",
  surface: 'Surface',
  text: 'Text'
} satisfies Record<OptionKey, string> & Record<string, string>

export const translations = { payloadpack }

export type TranslationKey = `payloadpack:${keyof typeof payloadpack}`
