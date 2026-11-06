'use client'

import { SidebarToggle, useNav, useTranslation } from '@payloadcms/ui'
import { useEffect, useRef } from 'react'

import { AppearanceButton } from './appearance-panel.js'
import { useAppearance } from './appearance-provider.js'

export function NavBar() {
  const { editable, rail, toggleRail, values } = useAppearance()
  const { navOpen, navToggleRef, setNavOpen } = useNav()
  const { t } = useTranslation()
  const returnsFocus = useRef(false)
  const collapsed = values.nav === 'rail' && rail

  useEffect(() => {
    if (!navOpen && returnsFocus.current) {
      returnsFocus.current = false
      navToggleRef?.current?.focus({ preventScroll: true })
    }
  }, [navOpen, navToggleRef])

  if (!values.nav && !editable) {
    return null
  }

  return (
    <div className="payloadpack-nav-bar">
      {values.nav && (
        <button
          aria-expanded={values.nav === 'rail' ? !collapsed : navOpen}
          aria-label={t(collapsed ? 'general:showSidebar' : 'general:hideSidebar')}
          className="payloadpack-nav-toggle"
          onClick={() => {
            if (values.nav === 'hidden') {
              returnsFocus.current = true
              setNavOpen(false, true)
              return
            }
            if (!collapsed) {
              document.querySelector<HTMLElement>('.sidebar-tabs__tab:first-child:not(.sidebar-tabs__tab--active)')?.click()
            }
            toggleRail()
          }}
          type="button">
          <SidebarToggle isActive={!collapsed} />
        </button>
      )}
      {editable && <AppearanceButton place="nav" />}
    </div>
  )
}
