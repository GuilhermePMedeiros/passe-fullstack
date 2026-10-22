import { apiDownload, apiRequest } from '@/lib/api'
import type { ClubSummary } from '@/lib/api.types'
import type { ClubDetails, ClubLineup, ClubSort, Formation, HistoryFilters, SaleResult, TransactionHistory } from '../types/club.types'

export const listClubs = (sort: ClubSort, signal?: AbortSignal) =>
  apiRequest<ClubSummary[]>('/clubs', { query: { sort }, signal })

export const getClub = (id: string, signal?: AbortSignal) =>
  apiRequest<ClubDetails>(`/clubs/${id}`, { signal })

export const createClub = (request: { name: string; acronym: string }) =>
  apiRequest<ClubSummary>('/clubs', { method: 'POST', json: request })

export const getLineup = (id: string, signal?: AbortSignal) =>
  apiRequest<ClubLineup>(`/clubs/${id}/lineup`, { signal })

export const saveLineup = (id: string, formation: Formation, player_ids: number[]) =>
  apiRequest<ClubLineup>(`/clubs/${id}/lineup`, { method: 'PUT', json: { formation, player_ids } })

export const sellPlayer = (id: number) =>
  apiRequest<SaleResult>(`/players/${id}/sell`, { method: 'POST' })

export const getHistory = (id: string, filters: HistoryFilters, signal?: AbortSignal) =>
  apiRequest<TransactionHistory>(`/clubs/${id}/transactions`, { query: { ...filters }, signal })

export async function downloadHistory(id: string, filters: HistoryFilters) {
  const blob = await apiDownload(`/clubs/${id}/transactions/export`, { query: { ...filters } })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `clube-${id}-transacoes.csv`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
