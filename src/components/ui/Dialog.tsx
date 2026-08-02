import * as DialogPrimitive from '@radix-ui/react-dialog'
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from 'react'

export function Dialog(props: ComponentPropsWithoutRef<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />
}

export function DialogClose(props: ComponentPropsWithoutRef<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close {...props} />
}

export function DialogTitle(props: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title {...props} />
}

export function DialogDescription(props: ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description {...props} />
}

type DialogContentProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  children: ReactNode
  overlayClassName?: string
  panelClassName?: string
  dismissible?: boolean
}

export const DialogContent = forwardRef<ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  ({ children, className = '', overlayClassName = '', panelClassName = '', dismissible = true, ...props }, ref) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={`modal-backdrop ${overlayClassName}`} />
      <DialogPrimitive.Content
        ref={ref}
        className={`dialog-positioner ${className}`}
        {...props}
        onEscapeKeyDown={dismissible ? props.onEscapeKeyDown : (event) => event.preventDefault()}
        onPointerDownOutside={dismissible ? props.onPointerDownOutside : (event) => event.preventDefault()}
      >
        <section className={`modal ${panelClassName}`}>{children}</section>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  ),
)

DialogContent.displayName = 'DialogContent'
