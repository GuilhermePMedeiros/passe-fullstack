import type { LeagueSummaryState } from '../types/league.types'

export function LeagueStatus({ state, year }: { state: LeagueSummaryState; year: string }) {
  let description = 'Carregando a liga…'
  
  if (state.status === 'error') description = 'situação indisponível'
  
  if (state.status === 'success') {
    const { leader, totalMatches } = state.data
    description = totalMatches === 0 ? 'nenhuma partida ainda'
      : leader ? `líder: ${leader.name}, ${leader.points} ${leader.points === 1 ? 'ponto' : 'pontos'}`
        : 'classificação indisponível'
  }

  return (
    <div className="league-status" role="status">
      
      <span className={`league-status-dot${state.status === 'error' ? ' league-status-dot-error' : ''}`} aria-hidden="true" />
      <span>Liga Fictícia {year}</span>
      <span aria-hidden="true">·</span>
      <span className="league-status-description">{description}</span>
    
    </div>
  )
}
