import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ArrowDownUp, ChevronDown, Plus, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { EmptyState, ErrorState } from '@/components/ui/ListStates'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useWorkspace } from '@/components/layout/WorkspaceContext'
import { formatMoney } from '@/lib/formatters'
import { useClubQuery } from '../hooks/useClubQuery'
import { listClubs } from '../services/clubService'
import { ClubCreateDialog } from '../components/ClubCreateDialog'
import { ClubsTable } from '../components/ClubsTable'
import type { ClubSort } from '../types/club.types'
import '@/features/players/players.css'
import '../clubs.css'

const SORTS: Record<ClubSort, string> = {
  name: 'Nome',
  net_worth_desc: 'Patrimônio (maior para o menor)',
  net_worth_asc: 'Patrimônio (menor para o maior)',
}

export function ClubsPage() {
  const [params, setParams] = useSearchParams()
  const sort = (params.get('sort') ?? 'name') as ClubSort
  const load = useCallback((signal: AbortSignal) => listClubs(sort, signal), [sort])
  const { state, refresh } = useClubQuery(load)
  const workspace = useWorkspace()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(params.get('create') === 'true')
  const headingRef = useRef<HTMLHeadingElement>(null)

  useLayoutEffect(() => { headingRef.current?.focus() }, [])

  function closeCreate() {
    setCreating(false)
    if (params.has('create')) setParams(sort === 'name' ? {} : { sort }, { replace: true })
    window.requestAnimationFrame(() => document.getElementById('new-club-button')?.focus())
  }

  function renderList() {
    if (state.status === 'loading') return <><p className="club-panel-header" role="status">Carregando clubes…</p><ClubsTable clubs={[]} loading /></>
    if (state.status === 'error') return <ErrorState title="Não foi possível carregar os clubes" message={state.message} onRetry={refresh} />
    if (!state.data.length) return <EmptyState message="Nenhum clube cadastrado" description="Crie o primeiro clube com nome e sigla para começar." action={<Button variant="outline" onClick={() => setCreating(true)}><Plus aria-hidden="true" /> Novo clube</Button>} />
    return (
      <>
        <div className="club-list-toolbar">
          <p>{state.data.length} clubes <Badge variant="secondary">{state.data.length} de 20</Badge></p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" className="club-sort"><ArrowDownUp aria-hidden="true" /> Ordenar: {SORTS[sort] ?? sort}<ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="sort-menu">
              <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={sort} onValueChange={value => setParams({ sort: value })}>
                {Object.entries(SORTS).map(([value, label]) => <DropdownMenuRadioItem key={value} value={value}>{label}</DropdownMenuRadioItem>)}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <ClubsTable clubs={state.data} />
      </>
    )
  }

  return (
    <article className="clubs-page">
      <header className="page-header">
        <span className="page-icon"><Shield aria-hidden="true" /></span>
        <div><h1 ref={headingRef} tabIndex={-1}>Clubes</h1><p>Cadastre clubes e acompanhe o caixa, o elenco e o patrimônio. A liga aceita no máximo 20 clubes.</p></div>
        <Button id="new-club-button" onClick={() => setCreating(true)}><Plus aria-hidden="true" /> Novo clube</Button>
      </header>
      <section className="club-panel" aria-label="Lista de clubes" aria-busy={state.status === 'loading'}>{renderList()}</section>
      <p className="club-footnote">Clubes pelo nome por padrão ou pelo patrimônio, com empate desfeito pelo nome. Valores em moedas, devolvidos pela API.</p>
      {creating && <ClubCreateDialog onClose={closeCreate} onCreated={club => {
        workspace.refresh()
        toast.success('Clube criado', { description: `${club.name} (${club.acronym}) começa com ${formatMoney(club.cash)} em caixa.` })
        navigate(`/clubs/${club.id}`, { state: { created: true } })
      }} />}
    </article>
  )
}
