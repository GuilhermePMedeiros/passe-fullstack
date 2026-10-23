import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Feedback } from '@/components/ui/Feedback'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { TriangleAlert } from 'lucide-react'
import { useSubmission } from '@/hooks/useSubmission'
import { getErrorMessage } from '@/lib/errors'
import { changePlayerCondition, getClubLineup } from '../services/playerService'
import { CONDITIONS, type Player, type PlayerCondition } from '../types/player.types'
import { PlayerConditionBadge, PlayerIdentity } from './PlayerIdentity'

interface PlayerConditionProps {
  clubName?: string
  player: Player
  onSaved: (player: Player, removedFromLineup: boolean) => void
  onCancel: () => void
  onBusy: (busy: boolean) => void
}

export function PlayerConditionDialog({ player, clubName, onSaved, onCancel, onBusy }: PlayerConditionProps) {
  const [condition, setCondition] = useState(player.condition)
  const [starter, setStarter] = useState<boolean | null>(player.club_id === null ? false : null)
  const [lineupError, setLineupError] = useState('')
  const submission = useSubmission()

  useEffect(() => {
    if (player.club_id === null) return

    const controller = new AbortController()

    getClubLineup(player.club_id, controller.signal).then(
      lineup => { if (!controller.signal.aborted) setStarter(lineup.players.some(item => item.id === player.id)) },
      cause => { if (!controller.signal.aborted) setLineupError(getErrorMessage(cause)) },
    )

    return () => controller.abort()
  }, [player.club_id, player.id])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    void submission.run(async () => {
      onBusy(true)

      try {
        const saved = await changePlayerCondition(player.id, condition)
        onSaved(saved, starter === true && condition === 'DOENTE')
      } finally {
        onBusy(false)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="condition-form">
      <div className="player-summary">
        <PlayerIdentity player={player} showAge />
        <PlayerConditionBadge player={player} />
      </div>
      <Feedback error message={submission.error} />
      <RadioGroup name="condition" aria-label="Nova condição física" value={condition} disabled={submission.pending} onValueChange={value => setCondition(value as PlayerCondition)}>
        {Object.entries(CONDITIONS).map(([code, label]) => (
          <Label className="condition-option" key={code} htmlFor={`condition-${code}`}>
            <RadioGroupItem id={`condition-${code}`} value={code} disabled={player.condition === 'DOENTE' && code === 'APTO'} />
            <span>
              <strong>{label}{player.condition === code && <Badge variant="secondary">Atual</Badge>}</strong>
              <small>{code === 'APTO' ? 'Sem desconto por condição. De Doente não passa direto para Apto.' : `Desconto de ${code === 'DOENTE' ? '30' : '15'}%. Agilidade de 80 a 100 corta pela metade; de 1 a 30 soma 10 pontos.`}</small>
            </span>
          </Label>
        ))}
      </RadioGroup>
      {starter === null && !lineupError && <p role="status" className="field-hint">Verificando escalação do clube…</p>}
      {lineupError && <Feedback error message={`Não foi possível verificar a escalação: ${lineupError}`} />}
      {condition === 'DOENTE' && player.club_id !== null && (
        <Alert className="warning-notice" role="status">
          <TriangleAlert aria-hidden="true" />
          <AlertDescription>
          {starter ? `${player.name} é titular. Ao passar para Doente, ele sai da escalação; ${clubName ?? 'o clube'} só volta a jogar partidas depois de escalar de novo os 5 titulares.` : 'Se o jogador for titular, ao passar para Doente ele sai da escalação e o clube precisa escalar novamente.'}
          </AlertDescription>
        </Alert>
      )}
      <footer className="modal-actions">
        <Button variant="outline" disabled={submission.pending} onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={submission.pending}>{submission.pending ? 'Salvando…' : 'Salvar condição'}</Button>
      </footer>
    </form>
  )
}
