import { enhanced } from './enhanced/index.js'
import { studio } from './studio/index.js'

export const options = {
  radius: ['none', 'sm', 'md', 'lg', 'full'],
  font: ['payload', 'geist', 'system'],
  frame: ['boxed', 'flat'],
  density: ['compact', 'comfortable'],
  icons: ['payload', 'lucide'],
  motion: ['off', 'on'],
  nav: ['icons', 'hidden']
} as const

export type Option = keyof typeof options

export type OptionValue<O extends Option> = (typeof options)[O][number]

export type Values = { [O in Option]?: OptionValue<O> }

export const characters = {
  stock: { defaults: {} },
  enhanced,
  studio
} satisfies Record<string, { defaults: Values }>

export type Character = keyof typeof characters

export const defaultCharacter: Character = 'enhanced'

export type CharacterValues<C extends Character> = { [O in keyof (typeof characters)[C]['defaults'] & Option]?: OptionValue<O> }
