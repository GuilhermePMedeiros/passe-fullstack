import { Badge } from '@/components/ui/badge'
import { getInitials } from '@/lib/formatters'
import type { DuelPlayer, MatchDetails } from '../types/match.types'
import { DUEL_ATTRIBUTES } from '../utils/matchLabels'

interface HistoricalPlayer {
  player: DuelPlayer
  values: Map<DuelPlayer['attribute'], number>
}

function historicalPlayers(match: MatchDetails, clubId: number) {
  const players = new Map<number, HistoricalPlayer>()
  for (const duel of match.duels) {
    const snapshot = duel.attacking_club_id === clubId ? duel.attacker : duel.defender
    const entry = players.get(snapshot.player_id) ?? { player: snapshot, values: new Map() }
    entry.values.set(snapshot.attribute, snapshot.value)
    players.set(snapshot.player_id, entry)
  }
  return [...players.values()]
}

export function MatchFieldPreview({ match }: { match: MatchDetails }) {
  return (
    <section className="club-panel">
      <header className="league-panel-heading"><div><h2>Em campo</h2><p>Titulares e valores gravados nos duelos, já com o efeito da condição.</p></div></header>
      <div className="match-field">
        <svg viewBox="0 0 800 300" preserveAspectRatio="none" aria-hidden="true">
          <rect x="12" y="12" width="776" height="276" rx="3" />
          <path d="M400 12V288M12 80H110V220H12M788 80H690V220H788" />
          <circle cx="400" cy="150" r="48" />
        </svg>
        {[match.home, match.away].map((club, teamIndex) => {
          const players = historicalPlayers(match, club.club_id)
          const sectors = [['GOL'], ['ZAG', 'LAT'], ['MEI'], ['ATA']]
          if (teamIndex === 1) sectors.reverse()
          return (
            <div className={`match-team match-team-${teamIndex}`} key={club.club_id}>
              <h3>{club.club_name} · {club.formation}</h3>
              <div className="match-team-sectors">
                {sectors.map(positions => {
                  const entries = players.filter(entry => positions.includes(entry.player.position))
                  if (!entries.length) return null
                  return (
                    <div className="match-field-sector" key={positions[0]}>
                      {entries.map(({ player, values }) => (
                        <div className="match-field-player" key={player.player_id}>
                          <span className="field-marker">{getInitials(player.player_name)}</span>
                          <strong>{player.player_name}</strong>
                          <small>{player.position} · {[...values].map(([attribute, value]) => `${DUEL_ATTRIBUTES[attribute]} ${value}`).join(' · ')}</small>
                          {player.condition === 'MAL_CONDICIONADO' && <Badge variant="secondary">Mal condicionado</Badge>}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
