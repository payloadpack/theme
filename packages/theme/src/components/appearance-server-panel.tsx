import type { ServerProps } from 'payload'

import { isEditable, type Panel } from '../lib/appearance.js'
import { AppearanceButton } from './appearance-panel.js'

export function AppearanceServerPanel({ panel, user }: ServerProps & { panel: Panel }) {
  if (!isEditable(panel, user)) {
    return null
  }
  return <AppearanceButton />
}
