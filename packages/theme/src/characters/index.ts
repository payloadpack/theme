import { ENHANCED_CHARACTER } from './enhanced/config.js'
import { STUDIO_CHARACTER } from './studio/config.js'

export const ALLOWED_OPTION_VALUES = {
  radius: ['none', 'sm', 'md', 'lg', 'full'],
  font: ['inter', 'geist', 'system'],
  frame: ['boxed', 'flat'],
  density: ['compact', 'comfortable'],
  icons: ['payload', 'lucide'],
  motion: ['off', 'auto'],
  nav: ['rail', 'hidden']
} as const

export type OptionName = keyof typeof ALLOWED_OPTION_VALUES

export const PERSONAL_OPTIONS: readonly OptionName[] = ['density', 'motion', 'nav']

export type OptionValue<O extends OptionName> = (typeof ALLOWED_OPTION_VALUES)[O][number]

export type OptionValues = { [O in OptionName]?: OptionValue<O> }

export const CHARACTERS = {
  payload: { defaults: {} },
  enhanced: ENHANCED_CHARACTER,
  studio: STUDIO_CHARACTER
} satisfies Record<string, { defaults: OptionValues }>

export type Character = keyof typeof CHARACTERS

export const DEFAULT_CHARACTER: Character = 'enhanced'

export type CharacterOptionValues<C extends Character> = {
  [O in keyof (typeof CHARACTERS)[C]['defaults'] & OptionName]?: OptionValue<O>
}
