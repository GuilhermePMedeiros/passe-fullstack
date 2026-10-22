import { Trash2 } from 'lucide-react'
import { AlertDialogAction, AlertDialogCancel, AlertDialogFooter } from '@/components/ui/alert-dialog'
import { Feedback } from '@/components/ui/Feedback'
import { Badge } from '@/components/ui/badge'
import { useSubmission } from '@/hooks/useSubmission'
import { deletePlayer } from '../services/playerService'
import type { Player } from '../types/player.types'
import { PlayerIdentity } from './PlayerIdentity'

interface PlayerDeleteProps {
  player: Player
  onDeleted: (player: Player) => void
  onCancel: () => void
  onBusy: (busy: boolean) => void
}

export function PlayerDeleteDialog({ player, onDeleted, onCancel, onBusy }: PlayerDeleteProps) {
  const submission = useSubmission()

  function handleConfirm() {
    void submission.run(async () => {
      onBusy(true)

      try {
        await deletePlayer(player.id)
        onDeleted(player)
      } finally {
        onBusy(false)
      }
    })
  }

  return (
    <>
      <div className="player-summary">
        <PlayerIdentity player={player} showAge />
        <Badge variant="secondary">Livre</Badge>
      </div>
      <Feedback error message={submission.error} />
      <AlertDialogFooter className="modal-actions">
        <AlertDialogCancel disabled={submission.pending} onClick={onCancel}>Cancelar</AlertDialogCancel>
        <AlertDialogAction
          className="delete-confirm-button"
          disabled={submission.pending}
          onClick={event => { event.preventDefault(); handleConfirm() }}
        >
          <Trash2 aria-hidden="true" />
          {submission.pending ? 'Excluindo…' : 'Excluir jogador'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  )
}
