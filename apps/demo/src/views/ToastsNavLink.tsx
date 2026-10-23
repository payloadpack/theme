'use client'

import { Link, NavGroup, useConfig, usePathname } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'

export function ToastsNavLink() {
  const { config } = useConfig()
  const pathname = usePathname()
  const href = formatAdminURL({ adminRoute: config.routes.admin, path: '/toasts' })
  const isActive = pathname === href

  return (
    <NavGroup label="Previews">
      <div className="nav__link-wrapper">
        <Link
          aria-current={isActive ? 'page' : undefined}
          className={isActive ? 'nav__link nav__link--selected' : 'nav__link'}
          href={href}
          prefetch={false}>
          <span className="nav__link-label">Toasts</span>
        </Link>
      </div>
    </NavGroup>
  )
}
