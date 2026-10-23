import { useId, type ComponentProps } from 'react'
import { Input } from './input'
import { Label } from './label'
import type { LucideIcon } from 'lucide-react'

interface FormFieldProps extends ComponentProps<'input'> {
  label: string
  error?: string
  hint?: string
  icon?: LucideIcon
}

export function FormField({ label, error, hint, id, icon: Icon, ...props }: FormFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const messageId = `${fieldId}-message`

  return (
    <div className="form-field">
      <Label htmlFor={fieldId}>{label}</Label>
      <div className={Icon ? 'field-input-icon' : undefined}>
        {Icon && <Icon aria-hidden="true" />}
        <Input
          id={fieldId}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? messageId : undefined}
          {...props}
        />
      </div>
      {(error || hint) && (
        <p id={messageId} className={error ? 'field-error' : 'field-hint'}>
          {error || hint}
        </p>
      )}
    </div>
  )
}
