import type { AdminViewServerProps } from 'payload'

import { Gutter, SetStepNav } from '@payloadcms/ui'
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
      visibleEntities={{ collections: visibleEntities.collections, globals: visibleEntities.globals }}>
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
