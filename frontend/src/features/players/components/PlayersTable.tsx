import { Link } from 'react-router'
import { ShoppingCart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/progress'
import { DataTable, type TableColumn } from '@/components/ui/DataTable'
import { formatMoney } from '@/lib/formatters'
import type { ClubSummary } from '@/lib/api.types'
import type { Player, PlayerAction } from '../types/player.types'
import { PlayerConditionBadge, PlayerIdentity } from './PlayerIdentity'
import { PlayerActionsMenu } from './PlayerActionsMenu'

interface PlayersTableProps {
  players: Player[]
  clubs: ClubSummary[]
  loading?: boolean
  onAction: (action: PlayerAction, player: Player) => void
}

export function PlayersTable({ players, clubs, loading, onAction }: PlayersTableProps) {
  function renderClub(player: Player) {
    if (player.club_id === null) {
      return (
        <div className="club-cell">
          <Badge variant="secondary" className="free-label">Livre</Badge>
          <Button asChild variant="outline" size="sm">
            <Link to={`/transfers/buy?player_id=${player.id}`}><ShoppingCart aria-hidden="true" /> Comprar</Link>
          </Button>
        </div>
      )
    }

    const club = clubs.find(item => item.id === player.club_id)

    return (
      <Link to={`/clubs/${player.club_id}`} className="club-link">
        <Badge variant="secondary" className="club-acronym">{club?.acronym ?? '#'}</Badge>
        <span>{club?.name ?? `Clube #${player.club_id}`}</span>
      </Link>
    )
  }

  function renderAgility(player: Player) {
    const tone = player.agility >= 80 ? 'high' : player.agility <= 30 ? 'low' : 'normal'

    return (
      <span className={`agility-value agility-${tone}`}>
        {player.agility}
        <Progress value={player.agility} aria-label={`Agilidade de ${player.name}`} />
      </span>
    )
  }

  const columns: TableColumn<Player>[] = [
    { key: 'name', label: 'Jogador', render: player => <PlayerIdentity player={player} /> },
    { key: 'position', label: 'Posição', render: player => <Badge variant="outline" className="position-badge">{player.position}</Badge> },
    { key: 'overall', label: 'Overall', render: player => <strong>{player.overall}</strong> },
    { key: 'agility', label: 'Agilidade', render: renderAgility },
    { key: 'age', label: 'Idade', render: player => player.age },
    { key: 'condition', label: 'Condição', render: player => <PlayerConditionBadge player={player} /> },
    { key: 'base', label: 'Valor base', render: player => <span className="muted-text">{formatMoney(player.base_value)}</span> },
    { key: 'market', label: 'Valor de mercado', render: player => <strong>{formatMoney(player.market_value)}</strong> },
    { key: 'club', label: 'Clube', render: renderClub },
    { key: 'actions', label: <span className="sr-only">Ações</span>, render: player => <PlayerActionsMenu player={player} onAction={onAction} /> },
  ]

  return <DataTable rows={players} columns={columns} label="Jogadores" loading={loading} />
}
