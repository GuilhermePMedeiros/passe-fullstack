import { Coins, Landmark, Shirt, Wallet } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatMoney } from '@/lib/formatters'
import type { ClubDetails } from '../types/club.types'

export function ClubSummaryCards({ club }: { club: ClubDetails }) {
  const metrics = [
    { label: 'Caixa', value: formatMoney(club.cash), note: 'Só muda por compras e vendas', icon: Wallet },
    { label: 'Valor do elenco', value: formatMoney(club.squad_value), note: 'Soma dos valores de mercado', icon: Coins },
    { label: 'Patrimônio', value: formatMoney(club.net_worth), note: 'Caixa + valor do elenco', icon: Landmark },
    { label: 'Elenco', value: `${club.players.length} de 12`, note: 'Limite de 12 jogadores', icon: Shirt },
  ]
  return (
    <div className="club-summary-cards">
      {metrics.map(({ label, value, note, icon: Icon }) => (
        <Card key={label} className="club-summary-card">
          <CardContent>
            <div>{label}<Icon aria-hidden="true" /></div>
            <p><strong>{value}</strong>{label !== 'Elenco' && <span> moedas</span>}</p>
            <small>{note}</small>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
