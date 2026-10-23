import { CircleCheck, CircleAlert, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from './alert'
import { Button } from './Button'

export function Feedback({ message, title, error = false, onClose }: { message: string; title?: string; error?: boolean; onClose?: () => void }) {
  if (!message) return null

  const Icon = error ? CircleAlert : CircleCheck

  return (
    <Alert variant={error ? 'destructive' : 'default'} className={`feedback [&>svg]:size-4 [&>svg+div]:translate-y-0 ${error ? 'feedback-error border-[var(--danger-border)] bg-[var(--danger-soft)]' : 'feedback-success border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success-foreground)] [&>svg]:text-[var(--success-foreground)]'}`} role={error ? 'alert' : 'status'}>
      <Icon aria-hidden="true" />
      {title && <AlertTitle className="text-xs leading-5">{title}</AlertTitle>}
      <AlertDescription>{message}</AlertDescription>
      {onClose && (
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Dispensar mensagem">
          <X aria-hidden="true" />
        </Button>
      )}
    </Alert>
  )
}
