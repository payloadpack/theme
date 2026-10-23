import type { AdminViewServerProps } from 'payload'

import { Gutter, Link, NavGroup, SetStepNav } from '@payloadcms/ui'
import { DefaultTemplate } from '@payloadcms/ui/rsc'

import { ToastButtons } from './ToastButtons'

export function ToastsView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { locale, permissions, req, visibleEntities } = initPageResult

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}>
      <SetStepNav nav={[{ label: 'Toasts' }]} />
      <header className="list-header">
        <h1 className="list-header__title">Toasts</h1>
      </header>
      <Gutter>
        <ToastButtons />
      </Gutter>
    </DefaultTemplate>
  )
}

export function ToastsNavLink() {
  return (
    <NavGroup label="Previews">
      <div className="nav__link-wrapper">
        <Link className="nav__link" href="/admin/toasts" prefetch={false}>
          <span className="nav__link-label">Toasts</span>
        </Link>
      </div>
    </NavGroup>
  )
}
