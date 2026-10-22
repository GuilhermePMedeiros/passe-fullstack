import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { DataTable, type TableColumn } from '@/components/ui/DataTable'
import type { Standing } from '../types/standing.types'

export function StandingsTable({ standings, loading = false }: { standings: Standing[]; loading?: boolean }) {
  const columns: TableColumn<Standing & { id: number }>[] = [
    { key: 'position', label: '#', render: row => <Badge variant={row.position === 1 ? 'default' : 'secondary'}>{row.position}</Badge> },
    { key: 'name', label: 'Clube', render: row => <Link to={`/clubs/${row.club_id}`}>{row.club_name}</Link> },
    { key: 'played', label: <abbr title="Jogos">J</abbr>, render: row => row.played },
    { key: 'wins', label: <abbr title="Vitórias">V</abbr>, render: row => row.wins },
    { key: 'draws', label: <abbr title="Empates">E</abbr>, render: row => row.draws },
    { key: 'losses', label: <abbr title="Derrotas">D</abbr>, render: row => row.losses },
    { key: 'goals_for', label: <abbr title="Gols marcados">GP</abbr>, render: row => row.goals_for },
    { key: 'goals_against', label: <abbr title="Gols sofridos">GC</abbr>, render: row => row.goals_against },
    { key: 'goal_difference', label: <abbr title="Saldo de gols">SG</abbr>, render: row => `${row.goal_difference > 0 ? '+' : ''}${row.goal_difference}` },
    { key: 'points', label: <abbr title="Pontos">Pts</abbr>, render: row => <strong>{row.points}</strong> },
  ]

  return <DataTable rows={standings.map(row => ({ ...row, id: row.club_id }))} columns={columns} label="Classificação" loading={loading} />
}
