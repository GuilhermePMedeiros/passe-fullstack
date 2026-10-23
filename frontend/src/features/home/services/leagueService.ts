import { apiRequest } from '@/lib/api'
import type { LeagueSummary } from '../types/league.types'

interface PlayerCountResponse { meta: { total_items: number } }
interface ClubResponse { id: number }
interface MatchResponse { id: number }
interface StandingResponse { club_name: string; points: number }

export async function getLeagueSummary(signal?: AbortSignal): Promise<LeagueSummary> {
  const [players, freePlayers, clubs, matches, standings] = await Promise.all([
    apiRequest<PlayerCountResponse>('/players', { query: { limit: 1 }, signal }),
    apiRequest<PlayerCountResponse>('/players', { query: { free: true, limit: 1 }, signal }),
    apiRequest<ClubResponse[]>('/clubs', { signal }),
    apiRequest<MatchResponse[]>('/matches', { signal }),
    apiRequest<StandingResponse[]>('/standings', { signal }),
  ])
  const firstPlace = matches.length > 0 ? standings[0] : undefined
  return {
    totalPlayers: players.meta.total_items,
    freePlayers: freePlayers.meta.total_items,
    totalClubs: clubs.length,
    totalMatches: matches.length,
    leader: firstPlace ? { name: firstPlace.club_name, points: firstPlace.points } : null,
  }
}
