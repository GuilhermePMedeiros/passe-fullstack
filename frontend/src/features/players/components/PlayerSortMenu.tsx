import { ArrowDownUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const SORT_OPTIONS = {
  name: 'Nome',
  value_desc: 'Maior valor de mercado',
  value_asc: 'Menor valor de mercado',
  age_desc: 'Maior idade',
  age_asc: 'Menor idade',
  position: 'Posição (GOL a ATA)',
}

export function PlayerSortMenu({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const label = SORT_OPTIONS[value as keyof typeof SORT_OPTIONS] ?? value

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="sort-trigger" aria-label="Ordenar por">
          <ArrowDownUp aria-hidden="true" /> Ordenar: {label.toLocaleLowerCase('pt-BR')} <ChevronDown aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="sort-menu">
        <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {Object.entries(SORT_OPTIONS).map(([key, option]) => <DropdownMenuRadioItem key={key} value={key}>{option}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
