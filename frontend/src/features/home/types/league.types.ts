export interface LeagueSummary {
  totalPlayers: number
  freePlayers: number
  totalClubs: number
  totalMatches: number
  leader: { name: string; points: number } | null
}

export type LeagueSummaryState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: LeagueSummary }
