import type { ServerProps } from 'payload'

import { type AppearancePanelAccess, canUserEditAppearance } from '../lib/appearance.js'
import { AppearanceButton } from './appearance-panel.js'

export function AppearanceServerPanel({ panel, user }: ServerProps & { panel: AppearancePanelAccess }) {
  if (!canUserEditAppearance(panel, user)) {
    return null
  }
  return <AppearanceButton />
}
