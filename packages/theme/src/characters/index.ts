import { enhanced } from './enhanced/index.js'
import { studio } from './studio/index.js'

export const allowedOptionValues = {
  radius: ['none', 'sm', 'md', 'lg', 'full'],
  font: ['inter', 'geist', 'system'],
  frame: ['boxed', 'flat'],
  density: ['compact', 'comfortable'],
  icons: ['payload', 'lucide'],
  motion: ['off', 'auto'],
  nav: ['rail', 'hidden']
} as const

export type OptionName = keyof typeof allowedOptionValues

export const personalOptions: readonly OptionName[] = ['density', 'motion', 'nav']

export type OptionValue<O extends OptionName> = (typeof allowedOptionValues)[O][number]

export type OptionValues = { [O in OptionName]?: OptionValue<O> }

export const characters = {
  payload: { defaults: {} },
  enhanced,
  studio
} satisfies Record<string, { defaults: OptionValues }>

export type Character = keyof typeof characters

export const defaultCharacter: Character = 'enhanced'

export type CharacterOptionValues<C extends Character> = {
  [O in keyof (typeof characters)[C]['defaults'] & OptionName]?: OptionValue<O>
}
