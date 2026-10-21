export const settings = {
  adminTheme: {
    cookie: 'admin-theme',
    default: 'neutral',
    label: 'Style',
    options: { stock: 'Stock', neutral: 'Neutral' }
  },
  density: {
    cookie: 'density',
    default: 'comfortable',
    label: 'Density',
    options: { compact: 'Compact', comfortable: 'Comfortable' }
  },
  icons: {
    cookie: 'icons',
    default: 'lucide',
    label: 'Icons',
    options: { payload: 'Payload', lucide: 'Lucide' }
  }
} as const

export type Setting = keyof typeof settings

export type Appearance = Record<Setting, string>

export function getCookieName(cookiePrefix: string, setting: Setting) {
  return `${cookiePrefix}-${settings[setting].cookie}`
}
