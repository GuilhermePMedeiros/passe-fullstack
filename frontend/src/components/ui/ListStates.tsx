import { RefreshCw, SearchX, ServerOff, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './Button'
import { Skeleton } from './skeleton'

export function LoadingState({ label = 'Carregando dados…' }: { label?: string }) {
  return (
    <div className="list-state" role="status">
      <RefreshCw aria-hidden="true" />
      <p>{label}</p>
      <Skeleton className="loading-skeleton" aria-hidden="true" />
    </div>
  )
}

export function ErrorState({ message, onRetry, title = 'Não foi possível carregar os dados' }: { message: string; onRetry: () => void; title?: string }) {
  return (
    <div className="list-state" role="alert">
      <ServerOff aria-hidden="true" />
      <h2>{title}</h2>
      <p>{message}</p>
      <Button variant="outline" onClick={onRetry}><RefreshCw aria-hidden="true" /> Tentar novamente</Button>
    </div>
  )
}

export function EmptyState({ message, onClear, description = 'Confira a busca ou altere os filtros. A busca ignora maiúsculas, minúsculas e acentos.', action }: { message: string; onClear?: () => void; description?: string; action?: ReactNode }) {
  return (
    <div className="list-state">
      <SearchX aria-hidden="true" />
      <h2>{message}</h2>
      <p>{description}</p>
      {action}
      {onClear && <Button variant="outline" onClick={onClear}><X aria-hidden="true" /> Limpar filtros</Button>}
    </div>
  )
}
