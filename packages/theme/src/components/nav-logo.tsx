import { RenderServerComponent } from '@payloadcms/ui/elements/RenderServerComponent'
import { PayloadIcon } from '@payloadcms/ui/shared'
import type { ServerProps } from 'payload'

export function NavLogo(props: ServerProps) {
  const { payload } = props

  return (
    <div className="payloadpack-nav-logo">
      {RenderServerComponent({
        Component: payload.config.admin.components.graphics?.Icon,
        Fallback: PayloadIcon,
        importMap: payload.importMap,
        serverProps: props
      })}
    </div>
  )
}
