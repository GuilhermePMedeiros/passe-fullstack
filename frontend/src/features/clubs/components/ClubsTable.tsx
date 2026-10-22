import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { DataTable, type TableColumn } from '@/components/ui/DataTable'
import type { ClubSummary } from '@/lib/api.types'
import { formatMoney } from '@/lib/formatters'

export function ClubsTable({ clubs, loading, detailsTab }: { clubs: ClubSummary[]; loading?: boolean; detailsTab?: 'history' | 'lineup' }) {
  function clubPath(id: number) {
    return `/clubs/${id}${detailsTab ? `?tab=${detailsTab}` : ''}`
  }

  const columns: TableColumn<ClubSummary>[] = [
    { key: 'name', label: 'Clube', render: club => <Link className="club-identity" to={clubPath(club.id)}><span className="club-crest">{club.acronym}</span>{club.name}</Link> },
    { key: 'acronym', label: 'Sigla', render: club => <Badge variant="outline">{club.acronym}</Badge> },
    { key: 'cash', label: 'Caixa', render: club => formatMoney(club.cash) },
    { key: 'squad', label: 'Valor do elenco', render: club => formatMoney(club.squad_value) },
    { key: 'worth', label: 'Patrimônio', render: club => <strong>{formatMoney(club.net_worth)}</strong> },
    { key: 'actions', label: <span className="sr-only">Ações</span>, render: club => <Button asChild variant="ghost" size="sm"><Link to={clubPath(club.id)} aria-label={`Ver clube ${club.name}`}>Ver clube <ChevronRight aria-hidden="true" /></Link></Button> },
  ]
  return <DataTable rows={clubs} columns={columns} loading={loading} label="Clubes" />
}
