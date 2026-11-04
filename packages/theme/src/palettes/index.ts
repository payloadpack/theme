export const palettes = ['payload', 'warm', 'studio'] as const

export type Palette = (typeof palettes)[number]

export const defaultPalette: Palette = 'warm'
