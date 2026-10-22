import { describe, expect, it } from 'vitest'
import { isLineupValid, placePlayers } from './lineup'
import type { Player } from '@/features/players/types/player.types'
import type { Formation } from '../types/club.types'

function player(id: number, position: Player['position'], condition: Player['condition'] = 'APTO', club_id = 1): Player {
  return { id, name: `Jogador ${id}`, position, condition, club_id } as Player
}

describe('escolhas da escalação RN19', () => {
  it.each<[Formation, Player['position'][]]>([
    ['3-1', ['GOL', 'ZAG', 'LAT', 'LAT', 'ATA']],
    ['2-2', ['GOL', 'ZAG', 'LAT', 'ATA', 'ATA']],
    ['2-1-1', ['GOL', 'ZAG', 'LAT', 'MEI', 'ATA']],
    ['1-2-1', ['GOL', 'LAT', 'MEI', 'MEI', 'ATA']],
  ])('aceita cinco titulares de %s com os setores corretos', (formation, positions) => {
    const players = positions.map((position, index) => player(index + 1, position))
    const ids = placePlayers(formation, players)
    expect(isLineupValid(formation, ids, players, 1)).toBe(true)
  })

  it('preserva vaga após venda sem deslocar jogador de outro setor', () => {
    const players = [player(1, 'GOL'), player(3, 'LAT'), player(4, 'MEI'), player(5, 'ATA')]
    const ids = placePlayers('2-1-1', players)
    expect(ids).toEqual(['1', '3', '', '4', '5'])
    expect(isLineupValid('2-1-1', ids, players, 1)).toBe(false)
  })

  it('exclui DOENTE, permite mal condicionado e impede repetição ou outro clube', () => {
    const players = [player(1, 'GOL'), player(2, 'ZAG'), player(3, 'LAT'), player(4, 'MEI', 'MAL_CONDICIONADO'), player(5, 'ATA')]
    expect(isLineupValid('2-1-1', ['1', '2', '3', '4', '5'], players, 1)).toBe(true)
    expect(isLineupValid('2-1-1', ['1', '2', '2', '4', '5'], players, 1)).toBe(false)
    expect(isLineupValid('2-1-1', ['1', '2', '3', '4', '5'], players, 2)).toBe(false)
    players[3].condition = 'DOENTE'
    expect(placePlayers('2-1-1', players)[3]).toBe('')
    expect(isLineupValid('2-1-1', ['1', '2', '3', '4', '5'], players, 1)).toBe(false)
  })
})
