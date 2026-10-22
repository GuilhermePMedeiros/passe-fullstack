import { useCallback, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ArrowRight, CalendarDays, CircleCheck, Clock3, RefreshCw, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Feedback } from '@/components/ui/Feedback'
import { ErrorState, LoadingState } from '@/components/ui/ListStates'
import { Modal } from '@/components/ui/Modal'
import { useClubQuery } from '@/features/clubs/hooks/useClubQuery'
import { useSubmission } from '@/hooks/useSubmission'
import { ApiError } from '@/lib/errors'
import { formatDateTime, formatMoney } from '@/lib/formatters'
import { getPurchaseContext, purchasePlayer } from '../services/transferService'
import type { PurchaseResult } from '../types/transfer.types'
import { ContractStatusBadge, TransferFacts, TransferNotice, TransferPlayerSummary } from './TransferSummary'
import '../transfers.css'

interface PurchasePlayerDialogProps {
  playerId: string
  onClose: () => void
  onPurchased: (result: PurchaseResult) => void
}

export function PurchasePlayerDialog({ playerId, onClose, onPurchased }: PurchasePlayerDialogProps) {
  const load = useCallback((signal: AbortSignal) => getPurchaseContext(playerId, signal), [playerId])
  const { state, refresh } = useClubQuery(load)
  const [clubId, setClubId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [networkFailure, setNetworkFailure] = useState(false)
  const [result, setResult] = useState<PurchaseResult | null>(null)
  const submission = useSubmission()
  const formRef = useRef<HTMLFormElement>(null)
  const club = state.status === 'success' ? state.data.clubs.find(item => String(item.id) === clubId) : undefined
  const clubError = !clubId ? 'Escolha o clube comprador.' : ''
  const dateError = !/^\d{4}-\d{2}-\d{2}$/u.test(date) ? 'Informe a data do fim da fidelidade.' : ''
  const timeError = !/^([01]\d|2[0-3]):[0-5]\d$/u.test(time) ? 'Informe a hora do fim da fidelidade.' : ''
  let errorMessage = submission.error ? `Compra recusada. ${submission.error}` : ''
  if (submission.error && networkFailure) {
    errorMessage = 'Sem conexão. A compra não foi confirmada. Verifique a conexão e tente novamente.'
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (clubError || dateError || timeError) {
      window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    void submission.run(async () => {
      setNetworkFailure(false)
      try {
        const purchase = await purchasePlayer(playerId, { club_id: Number(clubId), loyalty_until: `${date}T${time}-03:00` })
        setResult(purchase)
        onPurchased(purchase)
      } catch (cause) {
        setNetworkFailure(!(cause instanceof ApiError))
        throw cause
      }
    })
  }

  function renderContent() {
    if (result) return (
      <>
        <CircleCheck className="transfer-success-icon" aria-hidden="true" />
        <TransferFacts items={[
          { label: 'Valor', value: formatMoney(result.value), hint: 'Valor de mercado no momento da compra' },
          { label: 'Taxa', value: formatMoney(result.fee), hint: '5% do valor, apenas quando passa de 30,00' },
          { label: 'Custo total', value: formatMoney(result.value + result.fee), hint: 'Valor + taxa', emphasize: true },
          { label: 'Fim da fidelidade', value: formatDateTime(result.contract.loyalty_until) },
          { label: 'Contrato', value: <ContractStatusBadge status={result.contract.status} /> },
          { label: 'Novo caixa', value: formatMoney(result.club_cash), emphasize: true },
        ]} />
        <footer className="modal-actions">
          <Button asChild variant="outline"><Link to={`/clubs/${result.club_id}`}>Ver clube <ArrowRight aria-hidden="true" /></Link></Button>
          <Button onClick={onClose}>Fechar</Button>
        </footer>
      </>
    )
    if (state.status === 'loading') return <LoadingState label="Carregando jogador e clubes…" />
    if (state.status === 'error') return <ErrorState title="Não foi possível preparar a compra" message={state.message} onRetry={refresh} />
    return (
      <form className="transfer-form" ref={formRef} onSubmit={submit} noValidate aria-busy={submission.pending}>
        <Feedback error message={errorMessage} />
        <TransferPlayerSummary player={state.data.player} />
        <div className="form-field">
          <Label htmlFor="purchase-club">Clube comprador</Label>
          <Select value={clubId} onValueChange={setClubId} disabled={submission.pending}>
            <SelectTrigger id="purchase-club" className="transfer-club-select" aria-invalid={submitted && Boolean(clubError)} aria-describedby="purchase-club-hint">
              <SelectValue placeholder="Escolha o clube comprador" />
            </SelectTrigger>
            <SelectContent position="popper" className="passe-select-content">
              {state.data.clubs.map(item => <SelectItem key={item.id} value={String(item.id)}>{item.name} ({item.acronym}) · caixa {formatMoney(item.cash)}</SelectItem>)}
            </SelectContent>
          </Select>
          <p id="purchase-club-hint" className={submitted && clubError ? 'field-error' : 'field-hint'}>
            {submitted && clubError ? clubError : `${club ? `Caixa atual consultado: ${formatMoney(club.cash)}. ` : ''}O custo total (valor + taxa) pode ir até 50% do caixa.`}
          </p>
          {!state.data.clubs.length && <p className="field-hint">Nenhum clube cadastrado. <Link to="/clubs?create=true">Criar clube</Link></p>}
        </div>
        <fieldset className="transfer-date-fields">
          <legend>Fim da fidelidade</legend>
          <div>
            <FormField label="Data" icon={CalendarDays} type="date" value={date} onChange={event => setDate(event.target.value)} disabled={submission.pending} error={submitted ? dateError : ''} />
            <FormField label="Hora" icon={Clock3} type="time" step="60" value={time} onChange={event => setTime(event.target.value)} disabled={submission.pending} error={submitted ? timeError : ''} />
          </div>
          <p className="field-hint">Depois do momento da compra e até 1.095 dias. Horário de Brasília, enviado com o fuso (-03:00).</p>
        </fieldset>
        <TransferNotice>A taxa é de 5% do valor de mercado, só quando ele passa de 30,00. Taxa, custo e novo caixa são calculados ao confirmar. O limite do elenco é de 12 jogadores; o clube não pode recomprar quem já vendeu.</TransferNotice>
        {submission.pending && <TransferNotice pending>Enviando a compra. Os controles ficam desabilitados até a resposta.</TransferNotice>}
        <footer className="modal-actions">
          <Button type="button" variant="outline" onClick={onClose} disabled={submission.pending}>Cancelar</Button>
          <Button type="submit" disabled={submission.pending}>
            {submission.pending ? 'Comprando…' : <>{networkFailure ? <RefreshCw aria-hidden="true" /> : <ShoppingCart aria-hidden="true" />}{networkFailure ? 'Tentar de novo' : 'Confirmar compra'}</>}
          </Button>
        </footer>
      </form>
    )
  }

  return (
    <Modal title={result ? 'Compra concluída' : 'Comprar jogador'} description={result ? `${result.player_name} agora é do clube${club ? ` ${club.name}` : ''}. Valores em moedas, devolvidos pela API.` : 'Escolha o clube comprador e até quando vai a fidelidade do contrato.'} onClose={onClose} busy={submission.pending} className="transfer-dialog">
      {renderContent()}
    </Modal>
  )
}
