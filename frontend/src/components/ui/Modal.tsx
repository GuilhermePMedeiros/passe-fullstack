import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog'
import { cn } from '@/lib/utils'

interface ModalProps {
  title: string
  description: string
  children: ReactNode
  onClose: () => void
  busy?: boolean
  className?: string
}

export function Modal({ title, description, children, onClose, busy = false, className }: ModalProps) {
  return (
    <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}>
      <DialogContent
        className={cn('passe-dialog', className)}
        closeDisabled={busy}
        onEscapeKeyDown={event => { if (busy) event.preventDefault() }}
        onPointerDownOutside={event => event.preventDefault()}
        onCloseAutoFocus={event => event.preventDefault()}
      >
        <DialogHeader className="modal-header">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
