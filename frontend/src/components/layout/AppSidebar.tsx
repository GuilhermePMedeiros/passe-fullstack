import { ListOrdered, Clock3, Shield, Swords, Trophy, UsersRound } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router'
import { PasseLogo } from './PasseLogo'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { useWorkspace } from './WorkspaceContext'

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { data, error, refresh } = useWorkspace()
  const location = useLocation()
  const requestedTab = new URLSearchParams(location.search).get('tab')
  const clubSuffix = location.pathname === '/clubs' && (requestedTab === 'history' || requestedTab === 'lineup')
    ? `?tab=${requestedTab}` : ''
  const latest = data?.matches[0]
  const year = new Intl.DateTimeFormat('pt-BR', { year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date())

  return (
    <div className="sidebar-inner">
      <Link to="/" className="sidebar-brand" aria-label="Voltar ao início" onClick={onNavigate}>
        <PasseLogo />
        <span>Gestão da liga</span>
      </Link>
      <nav aria-label="Navegação principal" onClick={onNavigate}>
        <p className="sidebar-group-title">Mercado</p>
        <NavLink to="/players"><UsersRound aria-hidden="true" /> Jogadores <span>{data?.totalPlayers ?? '—'}</span></NavLink>
        <NavLink to="/clubs"><Shield aria-hidden="true" /> Clubes <span>{data?.clubs.length ?? '—'}</span></NavLink>
        <p className="sidebar-group-title">Liga</p>
        <NavLink to="/matches"><Swords aria-hidden="true" /> Partidas <span>{data?.matches.length ?? '—'}</span></NavLink>
        <NavLink to="/standings"><ListOrdered aria-hidden="true" /> Classificação</NavLink>
        <p className="sidebar-group-title">Clubes</p>
        {data?.clubs.map(club => (
          <NavLink key={club.id} to={`/clubs/${club.id}${clubSuffix}`}>
            <Badge variant="secondary" className="club-monogram" aria-hidden="true">{club.name.slice(0, 1).toLocaleUpperCase('pt-BR')}</Badge>
            {club.name}
          </NavLink>
        ))}
        {data?.clubs.length === 0 && <p className="sidebar-note">Nenhum clube cadastrado.</p>}
      </nav>
      {error && <Button variant="ghost" className="sidebar-retry" onClick={refresh}>Recarregar menu: {error}</Button>}
      <Card className="sidebar-footer">
        <CardContent>
        <p><Trophy aria-hidden="true" /> Liga Fictícia {year}</p>
        <small>{data ? `${data.clubs.length} clubes · ${data.totalPlayers} jogadores` : 'Carregando resumo…'}</small>
        <p><Swords aria-hidden="true" /> Última partida</p>
        <small>{latest ? `${latest.home.club_name} ${latest.home.goals} × ${latest.away.goals} ${latest.away.club_name}` : 'Nenhuma partida ainda'}</small>
        <Separator />
        <small><Clock3 aria-hidden="true" /> Horário de Brasília (UTC−3)</small>
        </CardContent>
      </Card>
    </div>
  )
}
