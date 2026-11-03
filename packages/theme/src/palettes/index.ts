export const palettes = {
  payload: {},
  warm: {}
}

export type Palette = keyof typeof palettes

export const defaultPalette: Palette = 'warm'
