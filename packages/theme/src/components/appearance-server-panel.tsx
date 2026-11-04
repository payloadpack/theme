import type { ServerProps } from 'payload'

import { isEditable, type Panel } from '../lib/appearance.js'
import { AppearanceButton } from './appearance-panel.js'

export function AppearanceServerPanel({ panel, place, user }: ServerProps & { panel: Panel; place?: 'nav' }) {
  if (!isEditable(panel, user)) {
    return null
  }
  return <AppearanceButton place={place} />
}
