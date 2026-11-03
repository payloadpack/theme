'use client'

import { SidebarToggle, useTranslation } from '@payloadcms/ui'

import { useAppearance } from './appearance-provider.js'

export function RailToggle() {
  const { rail, toggleRail, values } = useAppearance()
  const { t } = useTranslation()

  if (values.nav !== 'icons') {
    return null
  }

  return (
    <button
      aria-expanded={!rail}
      aria-label={t(rail ? 'general:showSidebar' : 'general:hideSidebar')}
      className="payloadpack-rail-toggle"
      onClick={toggleRail}
      type="button">
      <SidebarToggle isActive={!rail} />
    </button>
  )
}
