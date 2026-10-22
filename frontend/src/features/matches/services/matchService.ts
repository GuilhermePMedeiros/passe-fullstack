import { apiRequest } from '@/lib/api'
import type { MatchDetails, MatchRequest, MatchSummary } from '../types/match.types'

export function listMatches(clubId = '', signal?: AbortSignal) {
  return apiRequest<MatchSummary[]>('/matches', {
    query: clubId ? { club_id: clubId } : {},
    signal,
  })
}

export function getMatch(id: string, signal?: AbortSignal) {
  return apiRequest<MatchDetails>(`/matches/${id}`, { signal })
}

export function playMatch(request: MatchRequest) {
  return apiRequest<MatchDetails>('/matches', { method: 'POST', json: request })
}
