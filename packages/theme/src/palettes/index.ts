import type { StaticLabel } from 'payload'

export const BUILT_IN_PALETTES = ['payload', 'neutral', 'warm', 'soft'] as const

export type BuiltInPalette = (typeof BUILT_IN_PALETTES)[number]

export type Palette = { label?: StaticLabel; slug: BuiltInPalette } | { label: StaticLabel; slug: string }

export const DEFAULT_PALETTE: BuiltInPalette = 'neutral'
