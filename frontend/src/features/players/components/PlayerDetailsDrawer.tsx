import { Coins, HeartPulse, Pencil, ShoppingCart, Tag, ChartBar, TrendingUp } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { SheetFooter } from '@/components/ui/sheet'
import { formatMoney } from '@/lib/formatters'
import type { ClubSummary } from '@/lib/api.types'
import type { Player, PlayerAction } from '../types/player.types'
import { PlayerAttributesPreview } from './PlayerAttributesPreview'
import { PlayerConditionBadge, PlayerIdentity } from './PlayerIdentity'

interface PlayerDetailsProps {
  player: Player
  clubs: ClubSummary[]
  onAction: (action: PlayerAction, player: Player) => void
  onClose: () => void
}

export function PlayerDetailsDrawer({ player, clubs, onAction, onClose }: PlayerDetailsProps) {
  const club = clubs.find(item => item.id === player.club_id)
  const metrics = [
    { label: 'Valor de mercado', value: formatMoney(player.market_value), hint: 'Calculado automaticamente', icon: Coins },
    { label: 'Valor base', value: formatMoney(player.base_value), hint: 'Calculado no cadastro', icon: Tag },
    { label: 'Overall', value: player.overall, hint: 'Calculado pela posição', icon: ChartBar },
    { label: 'Potencial', value: player.potential, hint: 'Informado no cadastro', icon: TrendingUp },
  ]

  return (
    <div className="player-details">
      <header className="details-player-header">
        <PlayerIdentity player={player} />
        <div className="details-badges">
          <Badge variant="outline" className="position-badge">{player.position}</Badge>
          <PlayerConditionBadge player={player} />
          <Badge variant="secondary">{player.club_id === null ? 'Livre' : club?.acronym ?? 'Com clube'}</Badge>
        </div>
      </header>
      <div className="player-metrics">
        {metrics.map(({ label, value, hint, icon: Icon }) => (
          <Card key={label} className="metric-card">
            <CardContent>
              <div><span>{label}</span><Icon aria-hidden="true" /></div>
              <strong>{value}</strong>
              <small>{hint}</small>
            </CardContent>
          </Card>
        ))}
      </div>
      <section>
        <div className="attributes-heading"><h3>Indicadores técnicos</h3><span>Escala de 1 a 99</span></div>
        <PlayerAttributesPreview values={player} potential={player.potential} />
      </section>
      <dl className="player-facts">
        <div><dt>Idade</dt><dd>{player.age} anos</dd></div>
        <div><dt>Agilidade</dt><dd>{player.agility}</dd></div>
        <div><dt>Clube</dt><dd>{player.club_id === null ? 'Livre' : club?.name ?? `Clube #${player.club_id}`}</dd></div>
      </dl>
      <SheetFooter className="modal-actions details-actions">
        <Button variant="outline" onClick={() => onAction('edit', player)}><Pencil aria-hidden="true" /> Editar</Button>
        <Button variant="outline" onClick={() => onAction('condition', player)}><HeartPulse aria-hidden="true" /> Alterar condição</Button>
        {player.club_id === null && <Button asChild><Link onClick={onClose} to={`/transfers/buy?player_id=${player.id}`}><ShoppingCart aria-hidden="true" /> Comprar</Link></Button>}
      </SheetFooter>
    </div>
  )
}
