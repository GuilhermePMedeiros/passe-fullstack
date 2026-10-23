import type { ReactNode } from 'react'
import { Info, LoaderCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { PlayerIdentity } from '@/features/players/components/PlayerIdentity'
import type { Player } from '@/features/players/types/player.types'
import { formatMoney } from '@/lib/formatters'

export interface TransferFact {
  label: string
  value: ReactNode
  hint?: string
  emphasize?: boolean
  tone?: 'positive' | 'negative'
}

export function TransferFacts({ items }: { items: TransferFact[] }) {
  return (
    <dl className="transfer-facts">
      {items.map(({ label, value, hint, emphasize, tone }) => (
        <div key={label} className={emphasize ? 'transfer-fact-emphasis' : undefined}>
          <dt><span>{label}</span>{hint && <small>{hint}</small>}</dt>
          <dd className={tone ? `transfer-value-${tone}` : undefined}>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function TransferPlayerSummary({ player }: { player: Player }) {
  return (
    <div className="transfer-player-summary">
      <PlayerIdentity player={player} showAge />
      <div><small>Valor de mercado</small><strong>{formatMoney(player.market_value)}</strong></div>
    </div>
  )
}

export function TransferNotice({ children, pending = false }: { children: ReactNode; pending?: boolean }) {
  const Icon = pending ? LoaderCircle : Info
  return (
    <Alert className="transfer-notice" role={pending ? 'status' : 'note'}>
      <Icon aria-hidden="true" className={pending ? 'transfer-spinner' : undefined} />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

export function ContractStatusBadge({ status }: { status: string }) {
  const tone = status === 'ATIVO' ? 'status-apto' : status === 'RESCINDIDO' ? 'status-mal_condicionado' : ''
  return <Badge variant="outline" className={`status-badge ${tone}`}>{status}</Badge>
}
