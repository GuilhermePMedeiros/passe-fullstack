import type { Transaction } from '@/features/clubs/types/club.types'

export interface PurchaseRequest {
  club_id: number
  loyalty_until: string
}

export interface PurchaseResult extends Transaction {
  club_cash: number
  contract: {
    purchase_value: number
    loyalty_until: string
    status: string
  }
}
