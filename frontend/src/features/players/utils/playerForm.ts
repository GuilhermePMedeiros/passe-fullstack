import { ATTRIBUTES, POSITIONS } from '../types/player.types'
import type { Player, PlayerCreateRequest, PlayerEditRequest, PlayerPosition } from '../types/player.types'

export interface PlayerFormValues {
  name: string
  position: string
  age: string
  agility: string
  pace: string
  shooting: string
  passing: string
  dribbling: string
  defending: string
  physical: string
  potential: string
}

export type PlayerFormErrors = Partial<Record<keyof PlayerFormValues, string>>

export function getInitialValues(player?: Player): PlayerFormValues {
  return {
    name: player?.name ?? '',
    position: player?.position ?? '',
    age: player ? String(player.age) : '',
    agility: player ? String(player.agility) : '',
    pace: player ? String(player.pace) : '',
    shooting: player ? String(player.shooting) : '',
    passing: player ? String(player.passing) : '',
    dribbling: player ? String(player.dribbling) : '',
    defending: player ? String(player.defending) : '',
    physical: player ? String(player.physical) : '',
    potential: player ? String(player.potential) : '',
  }
}

function isIntegerInRange(value: string, min: number, max: number) {
  return /^\d+$/u.test(value) && Number(value) >= min && Number(value) <= max
}

export function normalizePlayerName(name: string) {
  return name.replace(/^ +| +$/gu, '').replace(/ +/gu, ' ')
}

export function validatePlayerForm(values: PlayerFormValues, player?: Player): PlayerFormErrors {
  const errors: PlayerFormErrors = {}
  const name = normalizePlayerName(values.name)

  if (Array.from(name).length < 3 || Array.from(name).length > 100) {
    errors.name = 'Use de 3 a 100 caracteres.'
  } else if (/\p{Cc}|\d/u.test(name) || name.split(' ').filter(word => /\p{L}/u.test(word)).length < 2) {
    errors.name = 'Informe pelo menos duas palavras, sem números ou caracteres de controle.'
  }

  if (!(values.position in POSITIONS)) errors.position = 'Escolha uma posição.'
  if (!isIntegerInRange(values.age, 16, 45)) errors.age = 'Use uma idade de 16 a 45 anos.'
  if (!isIntegerInRange(values.agility, 1, 100)) errors.agility = 'Use uma agilidade de 1 a 100.'
  if (Number(values.age) >= 35 && Number(values.agility) > 85) errors.agility = 'Com 35 anos ou mais, a agilidade máxima é 85.'

  if (player) {
    if (Number(values.age) < player.age) errors.age = `A idade não pode ser menor que ${player.age}.`
    if (player.club_id !== null && values.position !== player.position) errors.position = 'Jogador com clube não pode mudar de posição.'
    return errors
  }

  for (const { key } of ATTRIBUTES) {
    if (!isIntegerInRange(values[key], 1, 99)) errors[key] = 'Use um valor inteiro de 1 a 99.'
  }

  if (!isIntegerInRange(values.potential, 1, 99)) errors.potential = 'Informe o potencial de 1 a 99.'

  if (ATTRIBUTES.every(({ key }) => !errors[key])) {
    const attributes = ATTRIBUTES.map(({ key }) => Number(values[key]))
    const highest = Math.max(...attributes)

    if (attributes.reduce((sum, value) => sum + value, 0) > 480) errors.physical = 'A soma dos seis atributos não pode passar de 480.'
    if (!errors.potential && Number(values.potential) < highest) errors.potential = 'O potencial não pode ser menor que o maior atributo.'
    if (!errors.potential && Number(values.age) >= 33 && Number(values.potential) !== highest) errors.potential = 'Com 33 anos ou mais, o potencial deve ser igual ao maior atributo.'
  }

  return errors
}

export function toEditRequest(values: PlayerFormValues): PlayerEditRequest {
  return {
    name: normalizePlayerName(values.name),
    position: values.position as PlayerPosition,
    age: Number(values.age),
    agility: Number(values.agility),
  }
}

export function toCreateRequest(values: PlayerFormValues): PlayerCreateRequest {
  return {
    ...toEditRequest(values),
    pace: Number(values.pace),
    shooting: Number(values.shooting),
    passing: Number(values.passing),
    dribbling: Number(values.dribbling),
    defending: Number(values.defending),
    physical: Number(values.physical),
    potential: Number(values.potential),
  }
}
