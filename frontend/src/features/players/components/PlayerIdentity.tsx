import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getInitials } from '@/lib/formatters'
import { CONDITIONS, POSITIONS, type Player } from '../types/player.types'

export function PlayerIdentity({ player, showAge = false }: { player: Player; showAge?: boolean }) {
  return (
    <div className="player-identity">
      <Avatar className={`player-avatar avatar-tone-${player.id % 5}`} aria-hidden="true">
        <AvatarFallback>{getInitials(player.name)}</AvatarFallback>
      </Avatar>
      <span>
        <strong>{player.name}</strong>
        <small>{showAge ? `${player.position} · ${POSITIONS[player.position]} · ${player.age} anos` : POSITIONS[player.position]}</small>
      </span>
    </div>
  )
}

export function PlayerConditionBadge({ player }: { player: Player }) {
  return (
    <Badge variant="outline" className={`status-badge status-${player.condition.toLowerCase()}`}>
      <span className="status-dot" aria-hidden="true" />
      {CONDITIONS[player.condition]}
    </Badge>
  )
}
