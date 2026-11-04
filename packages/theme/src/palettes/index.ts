export const palettes = ['payload', 'neutral', 'studio'] as const

export type Palette = (typeof palettes)[number]

export const defaultPalette: Palette = 'neutral'
