import { Link } from 'react-router'
import { HandCoins, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { DataTable, type TableColumn } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/ListStates'
import { PlayerConditionBadge, PlayerIdentity } from '@/features/players/components/PlayerIdentity'
import { formatDateTime, formatMoney } from '@/lib/formatters'
import type { SquadPlayer } from '../types/club.types'

export function ClubSquadTab({ players, onSell }: { players: SquadPlayer[]; onSell: (player: SquadPlayer) => void }) {
  if (!players.length) return <section className="club-panel"><EmptyState message="Nenhum jogador no elenco" description="Compre jogadores livres para montar o elenco. O limite é de 12 jogadores, e o custo de cada compra não pode passar de 50% do caixa." action={<Button asChild variant="outline"><Link to="/players?free=true"><ShoppingCart aria-hidden="true" /> Ver jogadores livres</Link></Button>} /></section>

  const columns: TableColumn<SquadPlayer>[] = [
    { key: 'name', label: 'Jogador', render: player => <PlayerIdentity player={player} /> },
    { key: 'position', label: 'Posição', render: player => <Badge variant="outline">{player.position}</Badge> },
    { key: 'overall', label: 'Overall', render: player => <strong>{player.overall}</strong> },
    { key: 'condition', label: 'Condição', render: player => <PlayerConditionBadge player={player} /> },
    { key: 'market', label: 'Valor de mercado', render: player => <strong>{formatMoney(player.market_value)}</strong> },
    { key: 'purchase', label: 'Valor de compra', render: player => player.contract ? formatMoney(player.contract.purchase_value) : '—' },
    { key: 'loyalty', label: 'Fim da fidelidade', render: player => player.contract ? formatDateTime(player.contract.loyalty_until) : 'Contrato indisponível' },
    { key: 'days', label: 'Dias restantes', render: player => player.contract?.remaining_days ?? '—' },
    { key: 'penalty', label: '% de multa', render: player => player.contract ? <Badge variant="outline" className={`status-badge ${player.contract.penalty_rate === 0 ? 'status-apto' : 'status-mal_condicionado'}`}>{player.contract.penalty_rate}%</Badge> : '—' },
    { key: 'actions', label: <span className="sr-only">Ações</span>, render: player => <Button variant="outline" size="sm" data-sell-player={player.id} aria-label={`Vender ${player.name}`} onClick={() => onSell(player)}><HandCoins aria-hidden="true" /> Vender</Button> },
  ]

  return (
    <>
      <section className="club-panel">
        <header className="club-panel-header"><h2>Elenco</h2><p>Ordem por posição (GOL, ZAG, LAT, MEI, ATA), depois pelo nome. Contrato calculado para uma venda agora.</p></header>
        <DataTable rows={players} columns={columns} label="Elenco do clube" />
      </section>
      <p className="club-footnote">Valor de mercado, dias restantes e percentual de multa vêm da API. A multa tem teto de 10,00.</p>
    </>
  )
}
