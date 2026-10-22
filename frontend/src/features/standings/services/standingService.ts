import { apiRequest } from '@/lib/api'
import type { Standing } from '../types/standing.types'

export function getStandings(signal?: AbortSignal) {
  return apiRequest<Standing[]>('/standings', { signal })
}
