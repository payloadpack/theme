'use client'

import { Link, NavGroup, useConfig, usePathname } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'

const previewPages = [
  { label: 'Toasts', path: '/toasts' },
  { label: 'Nav icons', path: '/nav-icons' }
] as const

export function PreviewNavLinks() {
  const { config } = useConfig()
  const pathname = usePathname()

  return (
    <NavGroup label="Previews">
      {previewPages.map(({ label, path }) => {
        const href = formatAdminURL({ adminRoute: config.routes.admin, path })
        const isActive = pathname === href

        return (
          <div className="nav__link-wrapper" key={path}>
            <Link
              aria-current={isActive ? 'page' : undefined}
              className={isActive ? 'nav__link nav__link--selected' : 'nav__link'}
              href={href}
              prefetch={false}>
              <span className="nav__link-label">{label}</span>
            </Link>
          </div>
        )
      })}
    </NavGroup>
  )
}
