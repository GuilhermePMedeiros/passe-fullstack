import { apiRequest } from '@/lib/api'
import type { ClubSummary } from '@/lib/api.types'

interface MatchSummary {
  id: number
  home: { club_name: string; goals: number }
  away: { club_name: string; goals: number }
}

export async function getWorkspaceOverview(signal?: AbortSignal) {
  const [clubs, players, matches] = await Promise.all([
    apiRequest<ClubSummary[]>('/clubs', { signal }),
    apiRequest<{ meta: { total_items: number } }>('/players', { query: { limit: 1 }, signal }),
    apiRequest<MatchSummary[]>('/matches', { signal }),
  ])

  return { clubs, totalPlayers: players.meta.total_items, matches }
}
