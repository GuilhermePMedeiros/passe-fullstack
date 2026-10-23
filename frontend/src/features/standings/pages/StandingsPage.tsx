import { useCallback, useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ListOrdered, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/ListStates'
import { useClubQuery } from '@/features/clubs/hooks/useClubQuery'
import { listMatches } from '@/features/matches/services/matchService'
import { formatDateTime } from '@/lib/formatters'
import { StandingsTable } from '../components/StandingsTable'
import { getStandings } from '../services/standingService'
import '@/features/matches/matches.css'

export function StandingsPage() {
  const load = useCallback((signal: AbortSignal) => getStandings(signal), [])
  const loadMatches = useCallback((signal: AbortSignal) => listMatches('', signal), [])
  const { state, refresh } = useClubQuery(load)
  const matches = useClubQuery(loadMatches)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useLayoutEffect(() => { headingRef.current?.focus() }, [])

  function renderStandings() {
    if (state.status === 'loading') return <><p role="status" className="club-panel-header">Carregando classificação…</p><StandingsTable standings={[]} loading /></>
    if (state.status === 'error') return <ErrorState title="Não foi possível carregar a classificação" message={state.message} onRetry={refresh} />
    if (!state.data.length) return <EmptyState message="Nenhum clube cadastrado" description="Cadastre clubes para acompanhar a classificação da liga." action={<Button asChild variant="outline"><Link to="/clubs?create=true">Criar clube</Link></Button>} />
    return <StandingsTable standings={state.data} />
  }

  return (
    <article className="league-page">
      <header className="page-header">
        <span className="page-icon"><ListOrdered aria-hidden="true" /></span>
        <div><h1 ref={headingRef} tabIndex={-1}>Classificação</h1><p>Todos os clubes, com 3 pontos por vitória e 1 por empate.</p></div>
        <Button asChild variant="outline"><Link to="/matches?create=true"><Plus aria-hidden="true" /> Nova partida</Link></Button>
      </header>
      <div className="standings-layout">
        <section className="club-panel" aria-label="Tabela de classificação" aria-busy={state.status === 'loading'}>
          {renderStandings()}
          <p className="club-panel-header league-legend">J: jogos · V: vitórias · E: empates · D: derrotas · GP: gols marcados · GC: gols sofridos · SG: saldo · Pts: pontos. Deslize para ver todas as colunas.</p>
        </section>
        <aside className="standings-aside">
          <Card>
            <CardHeader><CardTitle>Últimas partidas</CardTitle><CardDescription>Da mais recente para a mais antiga.</CardDescription></CardHeader>
            <CardContent>
              {matches.state.status === 'loading' && <LoadingState label="Carregando últimas partidas…" />}
              {matches.state.status === 'error' && <ErrorState message={matches.state.message} onRetry={matches.refresh} />}
              {matches.state.status === 'success' && (matches.state.data.length ? <ul className="recent-matches">{matches.state.data.slice(0, 2).map(match => (
                <li key={match.id}><Link to={`/matches/${match.id}`}><time dateTime={match.played_at}>{formatDateTime(match.played_at)}</time><span className="recent-match-score"><span className={match.result === 'MANDANTE' ? 'recent-match-winner' : undefined}>{match.home.club_name}</span><Badge variant="secondary">{match.home.goals} × {match.away.goals}</Badge><span className={match.result === 'VISITANTE' ? 'recent-match-winner' : undefined}>{match.away.club_name}</span></span></Link></li>
              ))}</ul> : <p className="field-hint">Nenhuma partida jogada ainda.</p>)}
              <Button asChild variant="link"><Link to="/matches">Ver todas as partidas <ArrowRight aria-hidden="true" /></Link></Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Ordem da tabela</CardTitle><CardDescription>Critérios de classificação, nesta ordem.</CardDescription></CardHeader>
            <CardContent><ol className="standing-rules" role="list">{['Mais pontos', 'Maior saldo de gols', 'Mais gols marcados', 'Nome do clube, de A a Z'].map((rule, index) => <li key={rule}><span className="standing-rule-number" aria-hidden="true">{index + 1}</span>{rule}</li>)}</ol></CardContent>
          </Card>
        </aside>
      </div>
      <p className="club-footnote">Inclui clubes sem partidas. Posição, pontos, saldo e desempates são devolvidos pela API, na ordem exibida.</p>
    </article>
  )
}
