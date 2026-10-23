import type { ClubSummary } from '@/lib/api.types'
import type { Player } from '@/features/players/types/player.types'

export interface SquadPlayer extends Player {
  contract: {
    purchase_value: number
    loyalty_until: string
    remaining_days: number
    penalty_rate: number
  } | null
}

export interface ClubDetails extends ClubSummary {
  players: SquadPlayer[]
}

export type ClubSort = 'name' | 'net_worth_desc' | 'net_worth_asc'
export type Formation = '3-1' | '2-2' | '2-1-1' | '1-2-1'

export interface ClubLineup {
  club_id: number
  formation: Formation | null
  complete: boolean
  players: Player[]
}

export interface Transaction {
  id: number
  club_id: number
  player_id: number
  player_name: string
  type: 'COMPRA' | 'VENDA'
  value: number
  fee: number
  penalty: number
  profit: number | null
  cash_change: number
  created_at: string
}

export interface TransactionHistory {
  data: Transaction[]
  summary: {
    total_spent: number
    total_received: number
    total_fees: number
    total_penalties: number
    total_profit: number
  }
}

export interface SaleResult extends Transaction {
  purchase_value: number
  remaining_days: number
  penalty_rate: number
  contract_status: string
  club_cash: number
}

export interface HistoryFilters {
  type?: string
  player_id?: string
}
