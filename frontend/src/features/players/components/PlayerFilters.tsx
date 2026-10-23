import { useEffect, useState, type FormEvent } from 'react'
import { Coins, HeartPulse, Search, Shield, Shirt, UserRound, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/SelectField'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ClubSummary } from '@/lib/api.types'
import { formatMoney } from '@/lib/formatters'
import { CONDITIONS, POSITIONS, type PlayerFiltersQuery } from '../types/player.types'
import { PlayerRangeFilter } from './PlayerRangeFilter'

interface PlayerFiltersProps {
  query: PlayerFiltersQuery
  clubs: ClubSummary[]
  onChange: (query: PlayerFiltersQuery) => void
}

export function PlayerFilters({ query, clubs, onChange }: PlayerFiltersProps) {
  const [search, setSearch] = useState(query.search ?? '')
  const [error, setError] = useState('')
  const onlyFree = query.free === 'true'

  useEffect(() => { setSearch(query.search ?? '') }, [query.search])

  useEffect(() => {
    const normalized = search.trim().replace(/ +/gu, ' ')
    if (normalized === (query.search ?? '') || (normalized && Array.from(normalized).length < 2)) return
    const timeout = window.setTimeout(() => applySearch(), 400)
    return () => window.clearTimeout(timeout)
  })

  function applySearch(event?: FormEvent) {
    event?.preventDefault()
    const normalized = search.trim().replace(/ +/gu, ' ')

    if (normalized && (Array.from(normalized).length < 2 || Array.from(normalized).length > 100)) {
      setError('Use de 2 a 100 caracteres na busca.')
      return
    }

    setError('')
    onChange({ ...query, search: normalized, page: '1' })
  }

  function changeFilter(key: string, value: string) {
    onChange({ ...query, [key]: value, page: '1' })
  }

  function removeFilters(keys: string[]) {
    const next: PlayerFiltersQuery = { ...query, page: '1' }
    keys.forEach(key => { delete next[key] })
    onChange(next)
  }

  const chips = [
    { keys: ['search'], label: 'Busca', value: query.search },
    { keys: ['position'], label: 'Posição', value: POSITIONS[query.position as keyof typeof POSITIONS] },
    { keys: ['condition'], label: 'Condição', value: CONDITIONS[query.condition as keyof typeof CONDITIONS] },
    { keys: ['club_id'], label: 'Clube', value: clubs.find(club => String(club.id) === query.club_id)?.name },
    { keys: ['min_age', 'max_age'], label: 'Idade', value: query.min_age || query.max_age ? `${query.min_age || 16} a ${query.max_age || 45}` : '' },
    { keys: ['min_value', 'max_value'], label: 'Valor de mercado', value: query.min_value || query.max_value ? `${formatMoney(Number(query.min_value || 0))} a ${formatMoney(Number(query.max_value || 550))}` : '' },
  ].filter(chip => chip.value)

  return (
    <section aria-label="Busca e filtros" className="player-filter-section">
      <div className="player-filter-bar">
        <form className="filter-search" onSubmit={applySearch} noValidate>
          <Label htmlFor="player-search" className="sr-only">Buscar por nome</Label>
          <Search aria-hidden="true" />
          <Input id="player-search" name="search" type="search" placeholder="Buscar por nome" value={search} onChange={event => setSearch(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? 'search-error' : undefined} />
          <Button type="submit" className="sr-only" tabIndex={-1}>Aplicar filtros</Button>
          {error && <p id="search-error" className="field-error">{error}</p>}
        </form>
        <SelectField label="Posição" icon={Shirt} value={query.position ?? ''} options={Object.entries(POSITIONS).map(([value, label]) => ({ value, label: `${value} · ${label}` }))} onChange={value => changeFilter('position', value)} />
        <SelectField label="Condição" icon={HeartPulse} value={query.condition ?? ''} options={Object.entries(CONDITIONS).map(([value, label]) => ({ value, label }))} onChange={value => changeFilter('condition', value)} />
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="club-filter-wrapper" tabIndex={onlyFree ? 0 : undefined} aria-label={onlyFree ? 'Só livres não combina com filtro por clube.' : undefined}>
              <SelectField label="Clube" icon={Shield} value={query.club_id ?? ''} options={clubs.map(club => ({ value: String(club.id), label: club.name }))} disabled={onlyFree} onChange={value => changeFilter('club_id', value)} />
            </span>
          </TooltipTrigger>
          {onlyFree && <TooltipContent>“Livres” não combina com o filtro por clube.</TooltipContent>}
        </Tooltip>
        <PlayerRangeFilter label="Idade" icon={UserRound} minimum={query.min_age ?? ''} maximum={query.max_age ?? ''} minimumLabel="Idade mínima" maximumLabel="Idade máxima" min={16} max={45} onApply={(min_age, max_age) => onChange({ ...query, min_age, max_age, page: '1' })} />
        <PlayerRangeFilter label="Valor de mercado" icon={Coins} minimum={query.min_value ?? ''} maximum={query.max_value ?? ''} minimumLabel="Valor mínimo" maximumLabel="Valor máximo" min={0} max={550} step={0.01} onApply={(min_value, max_value) => onChange({ ...query, min_value, max_value, page: '1' })} />
      </div>
      {onlyFree && <p className="sr-only">O filtro de clube está desabilitado porque somente jogadores livres estão selecionados.</p>}
      {chips.length > 0 && (
        <div className="active-filters">
          <span>Filtros ativos:</span>
          {chips.map(chip => (
            <Badge key={chip.label} variant="secondary">
              {chip.label}: {chip.value}
              <Button variant="ghost" size="icon" onClick={() => removeFilters(chip.keys)} aria-label={`Remover filtro ${chip.label}`}><X aria-hidden="true" /></Button>
            </Badge>
          ))}
          <Button variant="link" className="clear-filters" onClick={() => onChange({})}>Limpar filtros</Button>
        </div>
      )}
    </section>
  )
}
