export const clubs = [
  { id: 1, name: 'Zulu FC', acronym: 'ZUL', cash: 250, squad_value: 50, net_worth: 300, players: [] },
  { id: 2, name: 'Alpha FC', acronym: 'ALP', cash: 300, squad_value: 0, net_worth: 300, players: [] },
  { id: 3, name: 'Clube Sem Jogos', acronym: 'CSJ', cash: 300, squad_value: 0, net_worth: 300, players: [] },
]

function player(id, name, position, attribute, value, condition = 'APTO') {
  return { player_id: id, player_name: name, position, attribute, value, condition }
}

const home = [
  player(10, 'Goleiro Histórico', 'GOL', 'defending', 77),
  player(11, 'Zagueiro Histórico', 'ZAG', 'defending', 84),
  player(12, 'Lateral Histórico', 'LAT', 'dribbling', 63, 'MAL_CONDICIONADO'),
  player(13, 'Meia Histórico', 'MEI', 'passing', 82),
  player(14, 'Atacante Histórico', 'ATA', 'shooting', 75),
]
const away = [
  player(20, 'Goleiro Visitante', 'GOL', 'defending', 72),
  player(21, 'Zagueiro Visitante', 'ZAG', 'defending', 84),
  player(22, 'Lateral Visitante', 'LAT', 'dribbling', 79),
  player(23, 'Meia Visitante', 'MEI', 'passing', 70),
  player(24, 'Atacante Visitante', 'ATA', 'shooting', 81),
]

export const match = {
  id: 11, played_at: '2026-10-22T20:00:00-03:00',
  home: { club_id: 1, club_name: 'Zulu FC', formation: '2-1-1', goals: 1 },
  away: { club_id: 2, club_name: 'Alpha FC', formation: '2-1-1', goals: 2 },
  result: 'VISITANTE',
  duels: [
    { order: 1, attacking_club_id: 1, attacker: home[4], defender: away[0], goal: true },
    { order: 2, attacking_club_id: 1, attacker: home[3], defender: away[1], goal: false },
    { order: 3, attacking_club_id: 1, attacker: home[2], defender: { ...away[2], attribute: 'defending', value: 63 }, goal: false },
    { order: 4, attacking_club_id: 2, attacker: away[4], defender: home[0], goal: true },
    { order: 5, attacking_club_id: 2, attacker: away[3], defender: home[1], goal: false },
    { order: 6, attacking_club_id: 2, attacker: away[2], defender: { ...home[2], attribute: 'defending', value: 56 }, goal: true },
  ],
}

const { duels: _duels, ...summary } = match
export const matches = [summary, { ...summary, id: 10, played_at: '2026-10-21T20:00:00-03:00' }]

// A ordem intencionalmente não é alfabética: a interface deve preservar a API.
export const standings = [
  { position: 1, club_id: 1, club_name: 'Zulu FC', played: 3, wins: 1, draws: 1, losses: 1, goals_for: 5, goals_against: 3, goal_difference: 2, points: 4 },
  { position: 2, club_id: 2, club_name: 'Alpha FC', played: 3, wins: 1, draws: 1, losses: 1, goals_for: 4, goals_against: 2, goal_difference: 2, points: 4 },
  { position: 3, club_id: 3, club_name: 'Clube Sem Jogos', played: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, goal_difference: 0, points: 0 },
]

export const transactions = [
  { id: 3, club_id: 1, player_id: 12, player_name: 'Lateral Histórico', type: 'VENDA', value: 32.3, fee: 0, penalty: 6.46, profit: -5.7, cash_change: 25.84, created_at: '2026-10-22T08:30:00-03:00' },
  { id: 2, club_id: 1, player_id: 13, player_name: 'Meia Histórico', type: 'VENDA', value: 40, fee: 0.3, penalty: 4, profit: 3, cash_change: 35.7, created_at: '2026-10-21T16:40:00-03:00' },
  { id: 1, club_id: 1, player_id: 13, player_name: 'Meia Histórico', type: 'COMPRA', value: 37, fee: 1.85, penalty: 0, profit: null, cash_change: -38.85, created_at: '2026-10-20T10:15:00-03:00' },
]
export const zeroSummary = { total_spent: 0, total_received: 0, total_fees: 0, total_penalties: 0, total_profit: 0 }
export const csvHeader = 'data_hora;tipo;jogador;valor;taxa_ou_comissao;multa;lucro;variacao_caixa\n'
export const salesCsv = csvHeader + '2026-10-21T16:40:00-03:00;VENDA;Meia Histórico;40,00;0,30;4,00;3,00;35,70\n'

export function historyFor(query) {
  const type = query.get('type')
  const playerId = query.get('player_id')
  const data = transactions.filter(row => (!type || type.split(',').includes(row.type)) && (!playerId || String(row.player_id) === playerId))
  let summary = { total_spent: 38.85, total_received: 61.54, total_fees: 2.15, total_penalties: 10.46, total_profit: -2.7 }
  if (type === 'VENDA') summary = { ...summary, total_spent: 0, total_fees: 0.3 }
  if (playerId === '13') summary = type === 'VENDA'
    ? { total_spent: 0, total_received: 35.7, total_fees: 0.3, total_penalties: 4, total_profit: 3 }
    : { total_spent: 38.85, total_received: 35.7, total_fees: 2.15, total_penalties: 4, total_profit: 3 }
  return { data, summary }
}
