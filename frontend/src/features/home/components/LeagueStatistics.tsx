import { CircleCheck, Shield, Swords, UserRound, UsersRound } from 'lucide-react'
import type { LeagueSummaryState } from '../types/league.types'

export function LeagueStatistics({ state }: { state: LeagueSummaryState }) {
  const data = state.status === 'success' ? state.data : null
  const statistics = [
    { label: 'jogadores', value: data?.totalPlayers, icon: UsersRound },
    { label: 'livres', value: data?.freePlayers, icon: UserRound },
    { label: 'clubes', value: data?.totalClubs, icon: Shield },
    { label: 'partidas', value: data?.totalMatches, icon: Swords },
  ]
  
  return (
    <div className="league-statistics" aria-busy={state.status === 'loading'}>
      <dl>
        {statistics.map(({ label, value, icon: Icon }) => (
          
          <div key={label}>
       
            <Icon aria-hidden="true" />
            <dd>{value === undefined ? '—' : value.toLocaleString('pt-BR')}</dd>
            <dt>{label}</dt>
       
          </div>
       
       ))}
      </dl>
     
      <span className="login-note"><CircleCheck aria-hidden="true" /> Não precisa de login</span>
    
    </div>
  )
}
