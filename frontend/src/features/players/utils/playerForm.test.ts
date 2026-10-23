import { describe, expect, it } from 'vitest'
import { getInitialValues, toCreateRequest, toEditRequest, validatePlayerForm } from './playerForm'
import type { Player } from '../types/player.types'

const valid = {
  name: 'Davi Melo', position: 'MEI', age: '23', agility: '70',
  pace: '66', shooting: '62', passing: '74', dribbling: '70',
  defending: '48', physical: '58', potential: '82',
}

describe('validação do formulário de jogador', () => {
  it('aceita cadastro válido sem calcular overall ou moedas', () => {
    expect(validatePlayerForm(valid)).toEqual({})
    const request = toCreateRequest(valid)
    expect(request).toMatchObject({ name: 'Davi Melo', age: 23, potential: 82 })
    expect(request).not.toHaveProperty('overall')
    expect(request).not.toHaveProperty('base_value')
    expect(request).not.toHaveProperty('market_value')
  })

  it.each([
    ['name', '', 'name'], ['name', 'Davi', 'name'], ['name', 'Davi 2 Melo', 'name'],
    ['name', 'Davi\tMelo', 'name'], ['position', '', 'position'],
    ['age', '15', 'age'], ['age', '46', 'age'], ['age', '23.5', 'age'],
    ['agility', '0', 'agility'], ['agility', '101', 'agility'],
    ['pace', '0', 'pace'], ['shooting', '100', 'shooting'],
    ['passing', '', 'passing'], ['dribbling', '1.5', 'dribbling'],
    ['defending', '-1', 'defending'], ['physical', '120', 'physical'],
    ['potential', '', 'potential'], ['potential', '73', 'potential'],
  ])('recusa %s=%s com mensagem junto ao campo', (field, value, errorKey) => {
    expect(validatePlayerForm({ ...valid, [field]: value })).toHaveProperty(errorKey)
  })

  it('valida agilidade máxima para idade de 35 anos', () => {
    expect(validatePlayerForm({ ...valid, age: '35', agility: '86', potential: '74' })).toHaveProperty('agility')
    expect(validatePlayerForm({ ...valid, age: '35', agility: '85', potential: '74' })).toEqual({})
  })

  it('valida soma e potencial conforme as regras oficiais do cadastro', () => {
    expect(validatePlayerForm({ ...valid, pace: '99', shooting: '99', passing: '99', dribbling: '99', defending: '99', physical: '99', potential: '99' })).toHaveProperty('physical')
    expect(validatePlayerForm({ ...valid, age: '33' })).toHaveProperty('potential')
    expect(validatePlayerForm({ ...valid, age: '33', potential: '74' })).toEqual({})
  })

  it('envia somente os quatro campos editáveis e normaliza espaços', () => {
    expect(toEditRequest({ ...valid, name: '  Davi   Melo  ' })).toEqual({ name: 'Davi Melo', position: 'MEI', age: 23, agility: 70 })
  })

  it('não permite idade menor nem posição diferente com clube', () => {
    const player = { age: 24, position: 'ZAG', club_id: 1 } as Player
    expect(validatePlayerForm(valid, player)).toHaveProperty('age')
    expect(validatePlayerForm(valid, player)).toHaveProperty('position')
  })

  it('não exige atributos no formulário de edição', () => {
    const player = { age: 22, position: 'MEI', club_id: null } as Player
    expect(validatePlayerForm({ ...valid, pace: '', potential: '' }, player)).toEqual({})
  })

  it('começa sem valores fictícios no cadastro', () => {
    expect(Object.values(getInitialValues()).every(value => value === '')).toBe(true)
  })
})
