import { enhanced } from './enhanced/index.js'

export const options = {
  radius: ['none', 'sm', 'md', 'lg', 'full'],
  density: ['compact', 'comfortable'],
  icons: ['payload', 'lucide']
} as const

export type Option = keyof typeof options

export type OptionValue<O extends Option> = (typeof options)[O][number]

export type Values = { [O in Option]?: OptionValue<O> }

export const characters = {
  stock: { defaults: {} },
  enhanced
} satisfies Record<string, { defaults: Values }>

export type Character = keyof typeof characters

export const defaultCharacter: Character = 'enhanced'

export type CharacterValues<C extends Character> = { [O in keyof (typeof characters)[C]['defaults'] & Option]?: OptionValue<O> }
