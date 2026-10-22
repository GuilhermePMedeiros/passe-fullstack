import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime } from '@/lib/formatters'
import type { MatchSummary } from '../types/match.types'
import { MATCH_RESULTS } from '../utils/matchLabels'

export function MatchScoreCard({ match, details = false }: { match: MatchSummary; details?: boolean }) {
  return (
    <Card className="match-score-card">
      <CardContent>
        <div className="match-club">
          <Link to={`/clubs/${match.home.club_id}`}>{match.home.club_name}</Link>
          <small>Mandante{details && ` · ${match.home.formation}`}</small>
        </div>
        <div className="match-score">
          <strong>{match.home.goals} × {match.away.goals}</strong>
          <time dateTime={match.played_at}>{formatDateTime(match.played_at)}</time>
          <Badge variant="outline">{MATCH_RESULTS[match.result]}</Badge>
        </div>
        <div className="match-club">
          <Link to={`/clubs/${match.away.club_id}`}>{match.away.club_name}</Link>
          <small>Visitante{details && ` · ${match.away.formation}`}</small>
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
