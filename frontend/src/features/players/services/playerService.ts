import { apiRequest } from '@/lib/api'
import type {
  Player,
  PlayerCondition,
  PlayerCreateRequest,
  PlayerEditRequest,
  PlayerFiltersQuery,
  PlayersResponse,
} from '../types/player.types'

export function listPlayers(query: PlayerFiltersQuery, signal?: AbortSignal) {
  return apiRequest<PlayersResponse>('/players', { query, signal })
}

export function getPlayer(id: number, signal?: AbortSignal) {
  return apiRequest<Player>(`/players/${id}`, { signal })
}

export function createPlayer(json: PlayerCreateRequest) {
  return apiRequest<Player>('/players', { method: 'POST', json })
}

export function updatePlayer(id: number, json: PlayerEditRequest) {
  return apiRequest<Player>(`/players/${id}`, { method: 'PUT', json })
}

export function changePlayerCondition(id: number, condition: PlayerCondition) {
  return apiRequest<Player>(`/players/${id}/condition`, {
    method: 'PATCH',
    json: { condition },
  })
}

export function deletePlayer(id: number) {
  return apiRequest<void>(`/players/${id}`, { method: 'DELETE' })
}

export function getClubLineup(clubId: number, signal?: AbortSignal) {
  return apiRequest<{ complete: boolean; players: Player[] }>(`/clubs/${clubId}/lineup`, { signal })
}
