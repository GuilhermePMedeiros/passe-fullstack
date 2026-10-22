import { apiRequest } from '@/lib/api'
import { listClubs } from '@/features/clubs/services/clubService'
import type { Player } from '@/features/players/types/player.types'
import type { PurchaseRequest, PurchaseResult } from '../types/transfer.types'

export async function getPurchaseContext(playerId: string, signal?: AbortSignal) {
  const [player, clubs] = await Promise.all([
    apiRequest<Player>(`/players/${playerId}`, { signal }),
    listClubs('name', signal),
  ])
  return { player, clubs }
}

export function purchasePlayer(playerId: string, request: PurchaseRequest) {
  return apiRequest<PurchaseResult>(`/players/${playerId}/buy`, {
    method: 'POST',
    json: request,
  })
}
