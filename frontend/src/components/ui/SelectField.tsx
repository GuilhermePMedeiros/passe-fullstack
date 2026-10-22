import type { LucideIcon } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

interface SelectFieldProps {
  label: string
  icon: LucideIcon
  value: string
  options: { value: string; label: string }[]
  disabled?: boolean
  onChange: (value: string) => void
}

export function SelectField({ label, icon: Icon, value, options, disabled, onChange }: SelectFieldProps) {
  return (
    <Select value={value || '__all__'} onValueChange={next => onChange(next === '__all__' ? '' : next)} disabled={disabled}>
      <SelectTrigger aria-label={label} className="filter-select">
        <Icon aria-hidden="true" />
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent position="popper" align="start" className="passe-select-content">
        <SelectItem value="__all__">{label}</SelectItem>
        {options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}
