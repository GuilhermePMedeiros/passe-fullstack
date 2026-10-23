import { useEffect, useState } from 'react'
import { CircleCheck, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ErrorState, LoadingState } from '@/components/ui/ListStates'
import { getErrorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/formatters'
import { useWorkspace } from '@/components/layout/WorkspaceContext'
import { getPlayer } from '../services/playerService'
import { POSITIONS, type Player, type PlayerAction } from '../types/player.types'
import { PlayerForm } from './PlayerForm'
import { PlayerConditionDialog } from './PlayerConditionDialog'
import { PlayerDeleteDialog } from './PlayerDeleteDialog'
import { PlayerDetailsDrawer } from './PlayerDetailsDrawer'

export type PlayerDialogState = { kind: 'create' } | { kind: Exclude<PlayerAction, 'buy'> | 'created'; player: Player }

interface PlayerDialogsProps {
  dialog: PlayerDialogState
  onClose: () => void
  onAction: (action: PlayerAction, player: Player) => void
  onSaved: (player: Player, created: boolean, removedFromLineup?: boolean) => void
  onDeleted: (player: Player) => void
}

const TITLES = {
  create: 'Novo jogador',
  created: 'Jogador cadastrado',
  edit: 'Editar jogador',
  details: 'Detalhes do jogador',
  condition: 'Alterar condição física',
  delete: 'Excluir jogador?',
}

const DESCRIPTIONS = {
  create: 'Preencha os dados e os indicadores técnicos. O valor base, o overall e o valor de mercado são calculados ao salvar.',
  created: 'O jogador entrou livre e Apto. Valores em moedas, calculados pela API ao salvar.',
  edit: 'Edite nome, posição, idade e agilidade. Os demais dados não mudam.',
  details: 'Indicadores, valores e dados do jogador.',
  condition: 'A condição muda o desconto do valor de mercado, recalculado ao salvar.',
  delete: 'O jogador sai da lista e da busca, mas as transações e as partidas antigas dele continuam como foram gravadas.',
}

export function PlayerDialogs({ dialog, onClose, onAction, onSaved, onDeleted }: PlayerDialogsProps) {
  const [player, setPlayer] = useState<Player | null>(dialog.kind === 'created' ? dialog.player : null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const { data } = useWorkspace()
  const playerId = 'player' in dialog ? dialog.player.id : null
  const needsFetch = dialog.kind !== 'create' && dialog.kind !== 'created'

  useEffect(() => {
    if (!needsFetch || playerId === null) return
    const controller = new AbortController()
    setPlayer(null)
    setError('')

    getPlayer(playerId, controller.signal).then(
      result => { if (!controller.signal.aborted) setPlayer(result) },
      cause => { if (!controller.signal.aborted) setError(getErrorMessage(cause)) },
    )

    return () => controller.abort()
  }, [needsFetch, playerId, revision])

  function renderContent() {
    if (dialog.kind === 'create') return <PlayerForm onSaved={saved => onSaved(saved, true)} onCancel={onClose} onBusy={setBusy} />
    if (error) return <ErrorState message={error} onRetry={() => setRevision(value => value + 1)} />
    if (!player) return <LoadingState label="Carregando jogador…" />
    if (dialog.kind === 'edit') return <PlayerForm player={player} onSaved={saved => onSaved(saved, false)} onCancel={onClose} onBusy={setBusy} />
    if (dialog.kind === 'condition') return <PlayerConditionDialog player={player} clubName={data?.clubs.find(club => club.id === player.club_id)?.name} onSaved={(saved, removed) => onSaved(saved, false, removed)} onCancel={onClose} onBusy={setBusy} />
    if (dialog.kind === 'delete') return <PlayerDeleteDialog player={player} onDeleted={onDeleted} onCancel={onClose} onBusy={setBusy} />
    if (dialog.kind === 'details') return <PlayerDetailsDrawer player={player} clubs={data?.clubs ?? []} onAction={onAction} />

    return (
      <div className="created-result">
        <dl className="player-facts">
          <div><dt>Valor base<small>Calculado no cadastro; não muda depois</small></dt><dd>{formatMoney(player.base_value)}</dd></div>
          <div><dt>Valor de mercado<small>Com condição, agilidade e idade</small></dt><dd>{formatMoney(player.market_value)}</dd></div>
          <div><dt>Overall<small>Pelos pesos da posição {POSITIONS[player.position]}</small></dt><dd>{player.overall}</dd></div>
        </dl>
        <footer className="modal-actions">
          <Button variant="outline" onClick={() => onAction('details', player)}><Eye aria-hidden="true" /> Ver detalhes</Button>
          <Button onClick={onClose}>Fechar</Button>
        </footer>
      </div>
    )
  }

  function closeIfAllowed(open: boolean) {
    if (!open && !busy) onClose()
  }

  if (dialog.kind === 'details') {
    return (
      <Sheet open onOpenChange={closeIfAllowed}>
        <SheetContent className="player-details-sheet" onCloseAutoFocus={event => event.preventDefault()}>
          <SheetHeader className="sr-only">
            <SheetTitle>{TITLES.details}</SheetTitle>
            <SheetDescription>{DESCRIPTIONS.details}</SheetDescription>
          </SheetHeader>
          {renderContent()}
        </SheetContent>
      </Sheet>
    )
  }

  if (dialog.kind === 'delete') {
    return (
      <AlertDialog open onOpenChange={closeIfAllowed}>
        <AlertDialogContent className="passe-dialog player-delete-modal" onEscapeKeyDown={event => { if (busy) event.preventDefault() }} onCloseAutoFocus={event => event.preventDefault()}>
          <AlertDialogHeader className="modal-header">
            <AlertDialogTitle>{player ? `Excluir ${player.name}?` : TITLES.delete}</AlertDialogTitle>
            <AlertDialogDescription>{DESCRIPTIONS.delete}</AlertDialogDescription>
          </AlertDialogHeader>
          {renderContent()}
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  return (
    <Modal title={TITLES[dialog.kind]} description={dialog.kind === 'created' && player ? `${player.name} entrou livre e Apto. Valores em moedas, calculados pela API ao salvar.` : DESCRIPTIONS[dialog.kind]} onClose={onClose} busy={busy} className={`player-${dialog.kind}-modal`}>
      {dialog.kind === 'created' && <CircleCheck className="created-success-icon" aria-hidden="true" />}
      {renderContent()}
    </Modal>
  )
}
