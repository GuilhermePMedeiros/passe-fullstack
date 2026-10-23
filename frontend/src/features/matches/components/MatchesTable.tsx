import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { DataTable, type TableColumn } from '@/components/ui/DataTable'
import { useWorkspace } from '@/components/layout/WorkspaceContext'
import { formatDateTime } from '@/lib/formatters'
import type { MatchSummary } from '../types/match.types'
import { MATCH_RESULTS } from '../utils/matchLabels'

export function MatchesTable({ matches, loading = false }: { matches: MatchSummary[]; loading?: boolean }) {
  const { data } = useWorkspace()

  function clubIdentity(match: MatchSummary, side: 'home' | 'away') {
    const club = match[side]
    const acronym = data?.clubs.find(item => item.id === club.club_id)?.acronym
    return (
      <Link to={`/clubs/${club.club_id}`} className={`match-table-club match-table-${side}`}>
        <span>{club.club_name}</span>
        {acronym && <Badge variant="secondary">{acronym}</Badge>}
      </Link>
    )
  }

  const columns: TableColumn<MatchSummary>[] = [
    { key: 'date', label: 'Data e hora (Brasília)', render: match => formatDateTime(match.played_at) },
    { key: 'home', label: 'Mandante', render: match => clubIdentity(match, 'home') },
    { key: 'score', label: 'Placar', render: match => <Badge variant="secondary">{match.home.goals} × {match.away.goals}</Badge> },
    { key: 'away', label: 'Visitante', render: match => clubIdentity(match, 'away') },
    { key: 'result', label: 'Resultado', render: match => <Badge variant="outline">{MATCH_RESULTS[match.result]}</Badge> },
    { key: 'actions', label: 'Detalhes', render: match => (
      <Button asChild variant="ghost" size="sm">
        <Link to={`/matches/${match.id}`} aria-label={`Ver duelos de ${match.home.club_name} contra ${match.away.club_name}`}>
          Ver duelos <ChevronRight aria-hidden="true" />
        </Link>
      </Button>
    ) },
  ]

  return <div className="matches-history-table"><DataTable rows={matches} columns={columns} label="Histórico de partidas" loading={loading} /></div>
}
