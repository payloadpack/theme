import type { ServerProps } from 'payload'

import { isEditable, type Panel } from '../lib/appearance.js'
import { AppearancePanel } from './appearance-panel.js'

export function AppearanceServerPanel({ panel, user }: ServerProps & { panel: Panel }) {
  return isEditable(panel, user) ? <AppearancePanel /> : null
}
