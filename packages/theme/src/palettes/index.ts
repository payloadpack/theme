export const payloadBlue = '#0d99ff'

type Half = { background: string; text: string }

const payloadLight: Half = { background: '#ffffff', text: '#1a1a1a' }

export const palettes = {
  payload: { accent: payloadBlue, preview: { dark: { background: '#2c2c2c', text: '#ffffff' }, light: payloadLight } },
  warm: { accent: payloadBlue, preview: { dark: { background: '#0f0f0e', text: '#f3f2ed' }, light: payloadLight } }
} satisfies Record<string, { accent: string; preview: { dark: Half; light: Half } }>

export type Palette = keyof typeof palettes

export const defaultPalette: Palette = 'warm'
