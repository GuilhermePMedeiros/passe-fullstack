import { CircleCheck, CircleAlert, X } from 'lucide-react'
import { Alert, AlertDescription } from './alert'
import { Button } from './Button'

export function Feedback({ message, error = false, onClose }: { message: string; error?: boolean; onClose?: () => void }) {
  if (!message) return null

  const Icon = error ? CircleAlert : CircleCheck

  return (
    <Alert variant={error ? 'destructive' : 'default'} className={`feedback ${error ? 'feedback-error' : 'feedback-success'}`} role={error ? 'alert' : 'status'}>
      <Icon aria-hidden="true" />
      <AlertDescription>{message}</AlertDescription>
      {onClose && (
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Dispensar mensagem">
          <X aria-hidden="true" />
        </Button>
      )}
    </Alert>
  )
}
