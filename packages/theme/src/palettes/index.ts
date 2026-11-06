import type { StaticLabel } from 'payload'

export const builtInPalettes = ['payload', 'neutral', 'warm', 'soft'] as const

export type BuiltInPalette = (typeof builtInPalettes)[number]

export type Palette = { label?: StaticLabel; slug: BuiltInPalette } | { label: StaticLabel; slug: string }

export const defaultPalette: BuiltInPalette = 'neutral'
