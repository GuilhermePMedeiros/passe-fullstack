import { useCallback, useLayoutEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Plus, Shield, Swords } from 'lucide-react'
import { useWorkspace } from '@/components/layout/WorkspaceContext'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/ListStates'
import { SelectField } from '@/components/ui/SelectField'
import { useClubQuery } from '@/features/clubs/hooks/useClubQuery'
import { listClubs } from '@/features/clubs/services/clubService'
import { MatchScoreCard } from '../components/MatchScoreCard'
import { MatchesTable } from '../components/MatchesTable'
import { NewMatchDialog } from '../components/NewMatchDialog'
import { listMatches } from '../services/matchService'
import type { MatchDetails } from '../types/match.types'
import '../matches.css'

export function MatchesPage() {
  const [params, setParams] = useSearchParams()
  const clubId = params.get('club_id') ?? ''
  const creating = params.get('create') === 'true'
  const load = useCallback((signal: AbortSignal) => listMatches(clubId, signal), [clubId])
  const loadClubs = useCallback((signal: AbortSignal) => listClubs('name', signal), [])
  const { state, refresh } = useClubQuery(load)
  const clubs = useClubQuery(loadClubs)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const navigate = useNavigate()
  const workspace = useWorkspace()

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
    window.requestAnimationFrame(() => document.getElementById('new-match-button')?.focus())
  }

  function changeClub(value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set('club_id', value)
    else next.delete('club_id')
    setParams(next)
  }

  function played(match: MatchDetails) {
    workspace.refresh()
    window.dispatchEvent(new Event('passe:refresh'))
    navigate(`/matches/${match.id}`, { state: { played: true } })
  }

  function renderList() {
    if (state.status === 'loading') return <><p role="status" className="club-panel-header">Carregando partidas…</p><MatchesTable matches={[]} loading /></>
    if (state.status === 'error') return <ErrorState message={state.message} title="Não foi possível carregar as partidas" onRetry={refresh} />
    if (!state.data.length) return <EmptyState message="Nenhuma partida encontrada" description={clubId ? 'Esse clube ainda não tem partidas. Altere o filtro ou jogue uma nova partida.' : 'Escale os titulares dos clubes e jogue a primeira partida.'} action={<Button variant="outline" onClick={openCreate}>Nova partida</Button>} />
    return <><MatchesTable matches={state.data} /><p className="club-panel-header">{state.data.length} partidas</p></>
  }

  return (
    <article className="league-page">
      <header className="page-header">
        <span className="page-icon"><Swords aria-hidden="true" /></span>
        <div><h1 ref={headingRef} tabIndex={-1}>Partidas</h1><p>Jogue partidas entre clubes com os 5 titulares escalados e acompanhe o histórico.</p></div>
        <Button id="new-match-button" onClick={openCreate}><Plus aria-hidden="true" /> Nova partida</Button>
      </header>
      {state.status === 'success' && state.data[0] && <section aria-label="Última partida" className="latest-match"><h2>Última partida{clubId ? ' do clube selecionado' : ''}</h2><MatchScoreCard match={state.data[0]} /></section>}
      <section className="club-panel" aria-busy={state.status === 'loading'}>
        <header className="league-panel-heading">
          <div><h2>Histórico de partidas</h2><p>Da mais recente para a mais antiga.</p></div>
          <div className="league-filters">
            <SelectField label="Clube: todos" icon={Shield} value={clubId} options={clubs.state.status === 'success' ? clubs.state.data.map(club => ({ value: String(club.id), label: club.name })) : []} onChange={changeClub} />
            {clubId && <Button variant="ghost" onClick={() => changeClub('')}>Limpar filtro</Button>}
          </div>
        </header>
        {clubs.state.status === 'error' && <ErrorState title="Não foi possível carregar os clubes do filtro" message={clubs.state.message} onRetry={clubs.refresh} />}
        {renderList()}
      </section>
      <p className="club-footnote">Horários de Brasília. Deslize a tabela horizontalmente para consultar todas as colunas.</p>
      {creating && <NewMatchDialog onClose={closeCreate} onPlayed={played} />}
    </article>
  )
}
