'use client'

import { RenderDefaultCell } from '@payloadcms/ui'
import type { CheckboxFieldClient, DefaultCellComponentProps } from 'payload'

export function CheckboxCell(props: DefaultCellComponentProps<CheckboxFieldClient>) {
  return (
    <span className="payloadpack-checkbox-cell" data-value={props.cellData === true}>
      <RenderDefaultCell clientProps={props} columnIndex={props.columnIndex ?? 0} isLinkedColumn={props.link} />
    </span>
  )
}
