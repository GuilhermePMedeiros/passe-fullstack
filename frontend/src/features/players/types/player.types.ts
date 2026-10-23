import type { PageMeta } from '@/lib/api.types'

export type PlayerPosition = 'GOL' | 'ZAG' | 'LAT' | 'MEI' | 'ATA'
export type PlayerCondition = 'APTO' | 'MAL_CONDICIONADO' | 'DOENTE'
export type AttributeKey = 'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical'

export interface Player {
  id: number
  name: string
  position: PlayerPosition
  agility: number
  age: number
  condition: PlayerCondition
  base_value: number
  market_value: number
  pace: number
  shooting: number
  passing: number
  dribbling: number
  defending: number
  physical: number
  potential: number
  overall: number
  club_id: number | null
}

export interface PlayersResponse {
  data: Player[]
  meta: PageMeta
}

export type PlayerEditRequest = Pick<Player, 'name' | 'position' | 'agility' | 'age'>
export type PlayerCreateRequest = PlayerEditRequest & Pick<Player, AttributeKey | 'potential'>
export type PlayerFiltersQuery = Record<string, string>
export type PlayerAction = 'details' | 'edit' | 'condition' | 'delete' | 'buy'

export const POSITIONS: Record<PlayerPosition, string> = {
  GOL: 'Goleiro',
  ZAG: 'Zagueiro',
  LAT: 'Lateral',
  MEI: 'Meio-campo',
  ATA: 'Atacante',
}

export const CONDITIONS: Record<PlayerCondition, string> = {
  APTO: 'Apto',
  MAL_CONDICIONADO: 'Mal condicionado',
  DOENTE: 'Doente',
}

export const ATTRIBUTES: { key: AttributeKey; label: string }[] = [
  { key: 'pace', label: 'Velocidade' },
  { key: 'shooting', label: 'Finalização' },
  { key: 'passing', label: 'Passe' },
  { key: 'dribbling', label: 'Drible' },
  { key: 'defending', label: 'Defesa' },
  { key: 'physical', label: 'Físico' },
]
