import { useCallback, useLayoutEffect, useRef } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Feedback } from '@/components/ui/Feedback'
import { ErrorState, LoadingState } from '@/components/ui/ListStates'
import { useClubQuery } from '@/features/clubs/hooks/useClubQuery'
import { MatchDuelsTable } from '../components/MatchDuelsTable'
import { MatchFieldPreview } from '../components/MatchFieldPreview'
import { MatchScoreCard } from '../components/MatchScoreCard'
import { getMatch } from '../services/matchService'
import '../matches.css'

export function MatchDetailsPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const load = useCallback((signal: AbortSignal) => getMatch(id, signal), [id])
  const { state, refresh } = useClubQuery(load)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useLayoutEffect(() => {
    if (state.status === 'success') headingRef.current?.focus()
  }, [id, state.status])

  return (
    <article className="league-page match-details">
      <Button asChild variant="ghost" className="match-back"><Link to="/matches"><ArrowLeft aria-hidden="true" /> Voltar para partidas</Link></Button>
      <h1 ref={headingRef} tabIndex={-1} className="match-detail-title">Detalhes da partida</h1>
      {state.status === 'loading' && <LoadingState label="Carregando partida…" />}
      {state.status === 'error' && <ErrorState title={state.notFound ? 'Partida não encontrada' : 'Não foi possível carregar a partida'} message={state.message} onRetry={refresh} />}
      {state.status === 'success' && <>
        {location.state?.played && <Feedback message="Partida jogada. Placar e duelos devolvidos pela API." />}
        <MatchScoreCard match={state.data} details />
        <MatchFieldPreview match={state.data} />
        <section className="club-panel">
          <header className="league-panel-heading"><div><h2>Duelos</h2><p>Os 3 ataques do mandante e depois os 3 do visitante. Os jogadores de linha vão do 1º (o mais recuado) ao 4º (o mais avançado), pela ordem do elenco: o 4º enfrenta o goleiro, o 3º ataca o 1º e o 2º ataca o 2º.</p></div></header>
          <MatchDuelsTable match={state.data} />
        </section>
        <p className="club-footnote">Nomes, posições, condições, formações e valores são os gravados na partida. Deslize a tabela para consultar todos os dados dos seis duelos.</p>
      </>}
    </article>
  )
}
