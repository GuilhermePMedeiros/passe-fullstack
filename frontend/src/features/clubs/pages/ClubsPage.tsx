import { useCallback, useLayoutEffect, useRef } from 'react'
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
  const creating = params.get('create') === 'true'
  const requestedTab = params.get('tab')
  const detailsTab = requestedTab === 'history' || requestedTab === 'lineup' ? requestedTab : undefined
  let description = 'Cadastre clubes e acompanhe o caixa, o elenco e o patrimônio. A liga aceita no máximo 20 clubes.'
  if (detailsTab === 'history') description = 'Escolha um clube para consultar o histórico de transações, os totais e o CSV.'
  else if (detailsTab === 'lineup') description = 'Escolha um clube para consultar ou montar a escalação dos titulares.'
  else if (params.get('action') === 'sell') description = 'Escolha um clube e use Vender na aba Elenco para negociar um jogador.'
  const headingRef = useRef<HTMLHeadingElement>(null)

  useLayoutEffect(() => { headingRef.current?.focus() }, [])

  function openCreate() {
    const next = new URLSearchParams(params)
    next.set('create', 'true')
    setParams(next)
  }

  function closeCreate() {
    const next = new URLSearchParams(params)
    next.delete('create')
    setParams(next, { replace: true })
    window.requestAnimationFrame(() => document.getElementById('new-club-button')?.focus())
  }

  function renderList() {
    if (state.status === 'loading') return <><p className="club-panel-header" role="status">Carregando clubes…</p><ClubsTable clubs={[]} loading /></>
    if (state.status === 'error') return <ErrorState title="Não foi possível carregar os clubes" message={state.message} onRetry={refresh} />
    if (!state.data.length) return <EmptyState message="Nenhum clube cadastrado" description="Crie o primeiro clube com nome e sigla para começar." action={<Button variant="outline" onClick={openCreate}><Plus aria-hidden="true" /> Novo clube</Button>} />
    return (
      <>
        <div className="club-list-toolbar">
          <p>{state.data.length} clubes <Badge variant="secondary">{state.data.length} de 20</Badge></p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" className="club-sort"><ArrowDownUp aria-hidden="true" /> Ordenar: {SORTS[sort] ?? sort}<ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="sort-menu">
              <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={sort} onValueChange={value => {
                const next = new URLSearchParams(params)
                next.set('sort', value)
                setParams(next)
              }}>
                {Object.entries(SORTS).map(([value, label]) => <DropdownMenuRadioItem key={value} value={value}>{label}</DropdownMenuRadioItem>)}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <ClubsTable clubs={state.data} detailsTab={detailsTab} />
      </>
    )
  }

  return (
    <article className="clubs-page">
      <header className="page-header">
        <span className="page-icon"><Shield aria-hidden="true" /></span>
        <div><h1 ref={headingRef} tabIndex={-1}>Clubes</h1><p>{description}</p></div>
        <Button id="new-club-button" onClick={openCreate}><Plus aria-hidden="true" /> Novo clube</Button>
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
