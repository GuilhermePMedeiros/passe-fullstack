import type { Player, PlayerPosition } from '@/features/players/types/player.types'
import type { ClubLineup, Formation } from '../types/club.types'

export interface LineupSlot {
  key: string
  label: string
  positions: PlayerPosition[]
  sector: 'goal' | 'defense' | 'midfield' | 'attack'
}

export const FORMATIONS: Record<Formation, [number, number, number]> = {
  '3-1': [3, 0, 1],
  '2-2': [2, 0, 2],
  '2-1-1': [2, 1, 1],
  '1-2-1': [1, 2, 1],
}

export function getSlots(formation: Formation): LineupSlot[] {
  const [defense, midfield, attack] = FORMATIONS[formation]
  const slots: LineupSlot[] = [{ key: 'goal', label: 'Goleiro', positions: ['GOL'], sector: 'goal' }]
  const sectors: { count: number; sector: LineupSlot['sector']; label: string; positions: PlayerPosition[] }[] = [
    { count: defense, sector: 'defense', label: 'Defesa', positions: ['ZAG', 'LAT'] },
    { count: midfield, sector: 'midfield', label: 'Meio', positions: ['MEI'] },
    { count: attack, sector: 'attack', label: 'Ataque', positions: ['ATA'] },
  ]
  for (const { count, sector, label, positions } of sectors) {
    for (let index = 0; index < count; index++) {
      slots.push({ key: `${sector}-${index}`, label, positions, sector })
    }
  }
  return slots
}

export function placePlayers(formation: Formation, players: Player[]): string[] {
  const available = [...players]
  return getSlots(formation).map(slot => {
    const index = available.findIndex(player => slot.positions.includes(player.position) && player.condition !== 'DOENTE')
    if (index < 0) return ''
    return String(available.splice(index, 1)[0].id)
  })
}

export function isLineupValid(formation: Formation, ids: string[], players: Player[], clubId: number) {
  return ids.length === 5 && new Set(ids).size === 5 && getSlots(formation).every((slot, index) => {
    const player = players.find(item => String(item.id) === ids[index])
    return player && player.club_id === clubId && player.condition !== 'DOENTE' && slot.positions.includes(player.position)
  })
}

export function lineupDraft(lineup: ClubLineup) {
  const formation = lineup.formation ?? '2-1-1'
  return { formation, ids: placePlayers(formation, lineup.players) }
}
