import type { ServerProps } from 'payload'

import { isEditable, type Panel } from '../lib/appearance.js'
import { AppearanceNavButton, AppearancePanel } from './appearance-panel.js'

export function AppearanceServerPanel({ panel, place, user }: ServerProps & { panel: Panel; place?: 'nav' }) {
  if (!isEditable(panel, user)) {
    return null
  }
  return place === 'nav' ? <AppearanceNavButton /> : <AppearancePanel />
}
