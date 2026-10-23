import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CircleDot } from 'lucide-react'
import { useWorkspace } from '@/components/layout/WorkspaceContext'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CONDITIONS } from '@/features/players/types/player.types'
import { getInitials } from '@/lib/formatters'
import type { DuelPlayer, MatchDetails } from '../types/match.types'
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
  const { data } = useWorkspace()

  return (
    <div className="table-scroll match-duels" tabIndex={0} role="region" aria-label="Duelos da partida: tabela com rolagem horizontal">
      <Table>
        <TableCaption className="sr-only">Duelos da partida</TableCaption>
        <TableHeader><TableRow>{['Duelo', 'Atacante', 'Ataque', 'Defensor', 'Defesa', 'Resultado'].map(label => <TableHead scope="col" key={label}>{label}</TableHead>)}</TableRow></TableHeader>
        {[match.home, match.away].map((club, index) => {
          const acronym = data?.clubs.find(item => item.id === club.club_id)?.acronym
          const duels = match.duels.filter(duel => duel.attacking_club_id === club.club_id)
          return (
            <TableBody key={club.club_id}>
              <TableRow className="duel-club-heading">
                <TableHead scope="rowgroup" colSpan={6}>
                  <div>{acronym && <Badge variant="secondary">{acronym}</Badge>}<span>Ataques de {club.club_name} ({index === 0 ? 'mandante' : 'visitante'})</span><small>{club.goals} {club.goals === 1 ? 'gol' : 'gols'}</small></div>
                </TableHead>
              </TableRow>
              {duels.map(duel => (
                <TableRow key={duel.order} className="duel-row">
                  <TableCell><Badge variant="secondary">{duel.order}</Badge></TableCell>
                  <TableCell><DuelPlayerIdentity player={duel.attacker} /></TableCell>
                  <TableCell>{DUEL_ATTRIBUTES[duel.attacker.attribute]} <strong>{duel.attacker.value}</strong></TableCell>
                  <TableCell><DuelPlayerIdentity player={duel.defender} /></TableCell>
                  <TableCell>{DUEL_ATTRIBUTES[duel.defender.attribute]} <strong>{duel.defender.value}</strong></TableCell>
                  <TableCell><Badge variant="outline" className={duel.goal ? 'status-apto duel-goal' : undefined}>{duel.goal && <CircleDot aria-hidden="true" />}{duel.goal ? 'Gol' : 'Sem gol'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          )
        })}
      </Table>
    </div>
  )
}
