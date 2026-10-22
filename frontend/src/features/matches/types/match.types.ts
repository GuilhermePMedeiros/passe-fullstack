import type { Formation } from '@/features/clubs/types/club.types'
import type { Player } from '@/features/players/types/player.types'

export interface MatchClub {
  club_id: number
  club_name: string
  formation: Formation
  goals: number
}

export interface DuelPlayer {
  player_id: number
  player_name: string
  position: Player['position']
  condition: Player['condition']
  attribute: 'shooting' | 'passing' | 'dribbling' | 'defending'
  value: number
}

export interface MatchDuel {
  order: number
  attacking_club_id: number
  attacker: DuelPlayer
  defender: DuelPlayer
  goal: boolean
}

export interface MatchSummary {
  id: number
  played_at: string
  home: MatchClub
  away: MatchClub
  result: 'MANDANTE' | 'VISITANTE' | 'EMPATE'
}

export interface MatchDetails extends MatchSummary {
  duels: MatchDuel[]
}

export interface MatchRequest {
  home_club_id: number
  away_club_id: number
}
