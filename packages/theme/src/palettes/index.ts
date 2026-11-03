export const payloadBlue = '#0d99ff'

export const palettes = {
  payload: { accent: payloadBlue },
  warm: { accent: payloadBlue }
} satisfies Record<string, { accent: string }>

export type Palette = keyof typeof palettes

export const defaultPalette: Palette = 'warm'
