'use client'

import { Button, FieldErrorsToast, toast } from '@payloadcms/ui'

const settle = (outcome: 'reject' | 'resolve') =>
  new Promise((resolve, reject) => setTimeout(outcome === 'resolve' ? resolve : reject, 2000))

const publishing = { error: 'Could not publish the showcase.', loading: 'Publishing…', success: 'Showcase published.' }

const triggers: { label: string; show: () => void }[] = [
  { label: 'Default', show: () => toast('Changes saved as a draft.') },
  { label: 'Success', show: () => toast.success('Showcase published.') },
  { label: 'Error', show: () => toast.error('Could not reach the server.') },
  { label: 'Warning', show: () => toast.warning('This document is locked by another user.') },
  { label: 'Info', show: () => toast.info('A newer version of this document exists.') },
  { label: 'Loading', show: () => toast.loading('Uploading image…') },
  { label: 'Promise resolves', show: () => toast.promise(settle('resolve'), publishing) },
  { label: 'Promise rejects', show: () => toast.promise(settle('reject'), publishing) },
  {
    label: 'Field errors',
    show: () =>
      toast.error(<FieldErrorsToast errorMessage="The following fields are invalid: Title, Links 1 > Label, Links 2 > Label" />)
  },
  {
    label: 'With description',
    show: () => toast.success('Showcase published.', { description: 'It is live on the site now.' })
  },
  {
    label: 'With action',
    show: () =>
      toast('Showcase moved to trash.', {
        action: { label: 'Undo', onClick: () => toast.success('Showcase restored.') }
      })
  },
  {
    label: 'Long text',
    show: () =>
      toast.info(
        'The import finished, but 12 of 48 rows were skipped because their slugs already exist. Open the import log to see which rows to fix and retry.'
      )
  },
  {
    label: 'Stack',
    show: () => {
      toast.success('Showcase published.')
      toast.info('A newer version of this document exists.')
      toast.warning('This document is locked by another user.')
      toast.error('Could not reach the server.')
    }
  }
]

export function ToastButtons() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacer-2)', paddingBlock: 'var(--spacer-3)' }}>
      {triggers.map(({ label, show }) => (
        <Button buttonStyle="secondary" key={label} onClick={show}>
          {label}
        </Button>
      ))}
    </div>
  )
}
