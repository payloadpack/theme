export const palettes = ['payload', 'neutral', 'warm'] as const

export type Palette = (typeof palettes)[number]

export const defaultPalette: Palette = 'neutral'
