import { useState } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface PlayerRangeFilterProps {
  label: string
  icon: LucideIcon
  minimum: string
  maximum: string
  minimumLabel: string
  maximumLabel: string
  min: number
  max: number
  step?: number
  onApply: (minimum: string, maximum: string) => void
}

export function PlayerRangeFilter({ label, icon: Icon, minimum, maximum, minimumLabel, maximumLabel, min, max, step = 1, onApply }: PlayerRangeFilterProps) {
  const [open, setOpen] = useState(false)
  const [draftMinimum, setDraftMinimum] = useState(minimum)
  const [draftMaximum, setDraftMaximum] = useState(maximum)

  function changeOpen(next: boolean) {
    if (next) {
      setDraftMinimum(minimum)
      setDraftMaximum(maximum)
    }
    setOpen(next)
  }

  function apply() {
    onApply(draftMinimum, draftMaximum)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="range-filter-trigger" aria-label={label}>
          <Icon aria-hidden="true" />
          <span>{label}{minimum || maximum ? `: ${minimum || min} a ${maximum || max}` : ''}</span>
          <ChevronDown aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="range-filter-content">
        <h3>{label}</h3>
        <div className="range-fields">
          <FormField label={minimumLabel} type="number" min={min} max={max} step={step} value={draftMinimum} onChange={event => setDraftMinimum(event.target.value)} />
          <FormField label={maximumLabel} type="number" min={min} max={max} step={step} value={draftMaximum} onChange={event => setDraftMaximum(event.target.value)} />
        </div>
        <Button onClick={apply}>Aplicar filtros</Button>
      </PopoverContent>
    </Popover>
  )
}
