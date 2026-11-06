'use client'

import { SidebarToggle, useTranslation } from '@payloadcms/ui'

import { useAppearance } from './appearance-provider.js'

export function RailToggle() {
  const { rail, toggleRail, values } = useAppearance()
  const { t } = useTranslation()

  if (values.nav !== 'rail') {
    return null
  }

  return (
    <button
      aria-expanded={!rail}
      aria-label={t(rail ? 'general:showSidebar' : 'general:hideSidebar')}
      className="payloadpack-rail-toggle"
      onClick={() => {
        if (!rail) {
          document.querySelector<HTMLElement>('.sidebar-tabs__tab:first-child:not(.sidebar-tabs__tab--active)')?.click()
        }
        toggleRail()
      }}
      type="button">
      <SidebarToggle isActive={!rail} />
    </button>
  )
}
