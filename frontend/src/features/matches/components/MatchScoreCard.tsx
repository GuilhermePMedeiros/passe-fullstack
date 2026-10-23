import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { useWorkspace } from '@/components/layout/WorkspaceContext'
import { formatDateTime } from '@/lib/formatters'
import type { MatchSummary } from '../types/match.types'
import { MATCH_RESULTS } from '../utils/matchLabels'

export function MatchScoreCard({ match, details = false }: { match: MatchSummary; details?: boolean }) {
  const { data } = useWorkspace()
  const homeAcronym = data?.clubs.find(club => club.id === match.home.club_id)?.acronym
  const awayAcronym = data?.clubs.find(club => club.id === match.away.club_id)?.acronym

  return (
    <Card className="match-score-card">
      <CardContent>
        <div className="match-club match-club-home">
          <div><Link to={`/clubs/${match.home.club_id}`}>{match.home.club_name}</Link>
          <small>Mandante{details && ` · ${match.home.formation}`}</small></div>
          {homeAcronym && <span className="match-club-crest" aria-label={`Sigla: ${homeAcronym}`}>{homeAcronym}</span>}
        </div>
        <div className="match-score">
          <strong>{match.home.goals} × {match.away.goals}</strong>
          <time dateTime={match.played_at}>{formatDateTime(match.played_at)}</time>
          <Badge variant="outline">{MATCH_RESULTS[match.result]}</Badge>
        </div>
        <div className="match-club match-club-away">
          {awayAcronym && <span className="match-club-crest" aria-label={`Sigla: ${awayAcronym}`}>{awayAcronym}</span>}
          <div><Link to={`/clubs/${match.away.club_id}`}>{match.away.club_name}</Link>
          <small>Visitante{details && ` · ${match.away.formation}`}</small></div>
        </div>
        {!details && (
          <Button asChild variant="outline">
            <Link to={`/matches/${match.id}`}>Ver duelos <ChevronRight aria-hidden="true" /></Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
