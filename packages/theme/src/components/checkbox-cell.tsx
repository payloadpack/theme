'use client'

import { useTranslation } from '@payloadcms/ui'
import type { CheckboxFieldClient, DefaultCellComponentProps } from 'payload'

export function CheckboxCell({ cellData }: DefaultCellComponentProps<CheckboxFieldClient>) {
  const { t } = useTranslation()
  const checked = cellData === true

  return (
    <code className="bool-cell" data-value={checked}>
      <span>{t(checked ? 'general:true' : 'general:false').toLowerCase()}</span>
    </code>
  )
}
