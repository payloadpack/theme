'use client'

import { SidebarToggle, useNav, useTranslation } from '@payloadcms/ui'
import { useEffect, useRef } from 'react'

import { AppearanceButton } from './appearance-panel.js'
import { useAppearance } from './appearance-provider.js'

export function NavBar() {
  const { canEdit, optionValues, showsRail, toggleNavRail } = useAppearance()
  const { navOpen, navToggleRef, setNavOpen } = useNav()
  const { t } = useTranslation()
  const refocusNavToggle = useRef(false)

  useEffect(() => {
    if (!navOpen && refocusNavToggle.current) {
      refocusNavToggle.current = false
      navToggleRef?.current?.focus({ preventScroll: true })
    }
  }, [navOpen, navToggleRef])

  if (!optionValues.nav && !canEdit) {
    return null
  }

  return (
    <div className="payloadpack-nav-bar">
      {optionValues.nav && (
        <button
          aria-expanded={optionValues.nav === 'rail' ? !showsRail : navOpen}
          aria-label={t(showsRail ? 'general:showSidebar' : 'general:hideSidebar')}
          className="payloadpack-nav-toggle"
          onClick={() => {
            if (optionValues.nav === 'hidden') {
              refocusNavToggle.current = true
              setNavOpen(false, true)
              return
            }
            if (!showsRail) {
              document.querySelector<HTMLElement>('.sidebar-tabs__tab:first-child:not(.sidebar-tabs__tab--active)')?.click()
            }
            toggleNavRail()
          }}
          type="button">
          <SidebarToggle isActive={!showsRail} />
        </button>
      )}
      {canEdit && <AppearanceButton place="nav" />}
    </div>
  )
}
