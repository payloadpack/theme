export const appearanceControls = {
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

export type AppearanceControl = keyof typeof appearanceControls

export type Appearance = Record<AppearanceControl, string>

export function getCookieName(cookiePrefix: string, control: AppearanceControl) {
  return `${cookiePrefix}-${appearanceControls[control].cookie}`
}
