import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { DataTable, type TableColumn } from '@/components/ui/DataTable'
import { formatDateTime } from '@/lib/formatters'
import type { MatchSummary } from '../types/match.types'
import { MATCH_RESULTS } from '../utils/matchLabels'

export function MatchesTable({ matches, loading = false }: { matches: MatchSummary[]; loading?: boolean }) {
  const columns: TableColumn<MatchSummary>[] = [
    { key: 'date', label: 'Data e hora (Brasília)', render: match => formatDateTime(match.played_at) },
    { key: 'home', label: 'Mandante', render: match => <Link to={`/clubs/${match.home.club_id}`}>{match.home.club_name}</Link> },
    { key: 'score', label: 'Placar', render: match => <Badge variant="secondary">{match.home.goals} × {match.away.goals}</Badge> },
    { key: 'away', label: 'Visitante', render: match => <Link to={`/clubs/${match.away.club_id}`}>{match.away.club_name}</Link> },
    { key: 'result', label: 'Resultado', render: match => <Badge variant="outline">{MATCH_RESULTS[match.result]}</Badge> },
    { key: 'actions', label: 'Detalhes', render: match => (
      <Button asChild variant="ghost" size="sm">
        <Link to={`/matches/${match.id}`} aria-label={`Ver duelos de ${match.home.club_name} contra ${match.away.club_name}`}>
          Ver duelos <ChevronRight aria-hidden="true" />
        </Link>
      </Button>
    ) },
  ]

  return <DataTable rows={matches} columns={columns} label="Histórico de partidas" loading={loading} />
}
