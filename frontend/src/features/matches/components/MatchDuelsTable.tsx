import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DataTable, type TableColumn } from '@/components/ui/DataTable'
import { CONDITIONS } from '@/features/players/types/player.types'
import { getInitials } from '@/lib/formatters'
import type { DuelPlayer, MatchDetails, MatchDuel } from '../types/match.types'
import { DUEL_ATTRIBUTES } from '../utils/matchLabels'

export function DuelPlayerIdentity({ player }: { player: DuelPlayer }) {
  return (
    <div className="player-identity">
      <Avatar className={`player-avatar avatar-tone-${player.player_id % 5}`} aria-hidden="true">
        <AvatarFallback>{getInitials(player.player_name)}</AvatarFallback>
      </Avatar>
      <span><strong>{player.player_name}</strong><small>{player.position} · {CONDITIONS[player.condition]}</small></span>
    </div>
  )
}

export function MatchDuelsTable({ match }: { match: MatchDetails }) {
  const rows = match.duels.map(duel => ({ ...duel, id: duel.order }))
  const columns: TableColumn<MatchDuel & { id: number }>[] = [
    { key: 'order', label: 'Duelo', render: duel => duel.order },
    { key: 'club', label: 'Clube atacante', render: duel => duel.attacking_club_id === match.home.club_id ? match.home.club_name : match.away.club_name },
    { key: 'attacker', label: 'Atacante', render: duel => <DuelPlayerIdentity player={duel.attacker} /> },
    { key: 'attack', label: 'Ataque', render: duel => <>{DUEL_ATTRIBUTES[duel.attacker.attribute]} <strong>{duel.attacker.value}</strong></> },
    { key: 'defender', label: 'Defensor', render: duel => <DuelPlayerIdentity player={duel.defender} /> },
    { key: 'defense', label: 'Defesa', render: duel => <>{DUEL_ATTRIBUTES[duel.defender.attribute]} <strong>{duel.defender.value}</strong></> },
    { key: 'result', label: 'Resultado', render: duel => <Badge variant="outline" className={duel.goal ? 'status-apto' : undefined}>{duel.goal ? 'Gol' : 'Sem gol'}</Badge> },
  ]

  return <DataTable rows={rows} columns={columns} label="Duelos da partida" />
}
