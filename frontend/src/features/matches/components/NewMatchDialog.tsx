import { useCallback, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Info, Shield, Swords } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/Button'
import { Feedback } from '@/components/ui/Feedback'
import { ErrorState, LoadingState } from '@/components/ui/ListStates'
import { Modal } from '@/components/ui/Modal'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useClubQuery } from '@/features/clubs/hooks/useClubQuery'
import { listClubs } from '@/features/clubs/services/clubService'
import { useSubmission } from '@/hooks/useSubmission'
import { playMatch } from '../services/matchService'
import type { MatchDetails } from '../types/match.types'

export function NewMatchDialog({ onClose, onPlayed }: { onClose: () => void; onPlayed: (match: MatchDetails) => void }) {
  const load = useCallback((signal: AbortSignal) => listClubs('name', signal), [])
  const { state, refresh } = useClubQuery(load)
  const [homeId, setHomeId] = useState('')
  const [awayId, setAwayId] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const submission = useSubmission()
  const homeError = !homeId ? 'Escolha o mandante.' : ''
  let awayError = !awayId ? 'Escolha o visitante.' : ''
  if (awayId && awayId === homeId) awayError = 'Escolha um clube diferente do mandante.'

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (homeError || awayError) {
      window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    void submission.run(async () => {
      const match = await playMatch({ home_club_id: Number(homeId), away_club_id: Number(awayId) })
      onPlayed(match)
    })
  }

  return (
    <Modal title="Nova partida" description="Escolha o mandante e o visitante. O placar sai dos atributos dos titulares, sem sorteio." onClose={onClose} busy={submission.pending} className="new-match-dialog">
      {state.status === 'loading' && <LoadingState label="Carregando clubes…" />}
      {state.status === 'error' && <ErrorState message={state.message} onRetry={refresh} />}
      {state.status === 'success' && (
        <form className="match-form" ref={formRef} onSubmit={submit} noValidate aria-busy={submission.pending}>
          <Feedback error title="Não foi possível jogar a partida" message={submission.error} />
          {[
            { id: 'match-home', label: 'Mandante', value: homeId, onChange: setHomeId, error: homeError, hint: 'Faz os 3 primeiros ataques.' },
            { id: 'match-away', label: 'Visitante', value: awayId, onChange: setAwayId, error: awayError, hint: 'Precisa ser um clube diferente do mandante.' },
          ].map(field => (
            <div className="form-field" key={field.id}>
              <Label htmlFor={field.id}>{field.label}</Label>
              <Select value={field.value} onValueChange={field.onChange} disabled={submission.pending}>
                <SelectTrigger id={field.id} className="match-select" aria-invalid={submitted && Boolean(field.error)} aria-describedby={`${field.id}-hint`}>
                  <span className="match-selected-club"><Shield aria-hidden="true" /><SelectValue placeholder={`Escolha o ${field.label.toLocaleLowerCase('pt-BR')}`} /></span>
                </SelectTrigger>
                <SelectContent position="popper" className="passe-select-content">
                  {state.data.map(club => <SelectItem key={club.id} value={String(club.id)}>{club.name} ({club.acronym})</SelectItem>)}
                </SelectContent>
              </Select>
              <p id={`${field.id}-hint`} className={submitted && field.error ? 'field-error' : 'field-hint'}>
                {submitted && field.error ? field.error : field.hint}
              </p>
            </div>
          ))}
          {!state.data.length && <p className="field-hint">Nenhum clube cadastrado. <Link to="/clubs?create=true">Criar clube</Link></p>}
          <Alert className="match-rules">
            <Info aria-hidden="true" />
            <AlertTitle>Como sai o placar</AlertTitle>
            <AlertDescription>
              Cada time faz 3 ataques. Pela ordem do elenco, os jogadores de linha vão do 1º (o mais recuado) ao 4º (o mais avançado): o 4º enfrenta o goleiro, o 3º enfrenta o 1º e o 2º enfrenta o 2º do adversário. O atacante usa finalização (ATA), passe (MEI) ou drible (ZAG e LAT), e enfrenta a defesa. É gol só quando o ataque é maior; mal condicionado joga com 15% a menos.
              <p>Os dois clubes precisam ter os 5 titulares escalados. A partida não mexe no caixa.</p>
            </AlertDescription>
          </Alert>
          {submission.pending && <p role="status" className="field-hint">Jogando partida… Aguarde a resposta.</p>}
          <footer className="modal-actions">
            <Button type="button" variant="outline" onClick={onClose} disabled={submission.pending}>Cancelar</Button>
            <Button type="submit" disabled={submission.pending}>
              <Swords aria-hidden="true" /> {submission.pending ? 'Jogando…' : 'Jogar partida'}
            </Button>
          </footer>
        </form>
      )}
    </Modal>
  )
}
