import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { CircleCheck, HandCoins, History, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Feedback } from '@/components/ui/Feedback'
import { Modal } from '@/components/ui/Modal'
import { useSubmission } from '@/hooks/useSubmission'
import { formatDateTime, formatMoney, formatSignedMoney } from '@/lib/formatters'
import { ContractStatusBadge, TransferFacts, TransferNotice, TransferPlayerSummary, type TransferFact } from '@/features/transfers/components/TransferSummary'
import { useClubQuery } from '../hooks/useClubQuery'
import { getLineup, sellPlayer } from '../services/clubService'
import type { SaleResult, SquadPlayer } from '../types/club.types'
import '@/features/transfers/transfers.css'

export function ClubSaleDialog({ player, clubName, onClose, onSold }: { player: SquadPlayer; clubName?: string; onClose: () => void; onSold: () => void }) {
  const submission = useSubmission()
  const [result, setResult] = useState<SaleResult | null>(null)
  const loadLineup = useCallback((signal: AbortSignal) => getLineup(String(player.club_id), signal), [player.club_id])
  const lineup = useClubQuery(loadLineup)
  const isStarter = lineup.state.status === 'success' && lineup.state.data.players.some(item => item.id === player.id)

  function confirmSale() {
    void submission.run(async () => {
      const sale = await sellPlayer(player.id)
      setResult(sale)
      onSold()
    })
  }

  const facts: TransferFact[] = result ? [
    { label: 'Valor de compra', value: formatMoney(result.purchase_value) },
    { label: 'Valor de venda', value: formatMoney(result.value), hint: 'Valor de mercado no momento da venda' },
    { label: 'Dias restantes', value: String(result.remaining_days) },
    { label: 'Multa', value: formatMoney(result.penalty), hint: result.penalty === 0 && result.contract_status === 'ENCERRADO' ? 'Fidelidade cumprida: sem multa' : `${result.penalty_rate}% do valor de venda, com teto de 10,00` },
    { label: 'Lucro', value: result.profit === null ? '—' : formatSignedMoney(result.profit), tone: result.profit !== null && result.profit < 0 ? 'negative' : 'positive' },
    { label: 'Comissão', value: formatMoney(result.fee), hint: '10% do lucro até 10,00 + 20% do que passar; sem lucro, sem comissão' },
    { label: 'Crédito no caixa', value: formatSignedMoney(result.cash_change), hint: 'Valor de venda − multa − comissão', emphasize: true },
    { label: 'Contrato', value: <ContractStatusBadge status={result.contract_status} /> },
    { label: clubName ? `Novo caixa de ${clubName}` : 'Novo caixa', value: formatMoney(result.club_cash), emphasize: true },
  ] : []

  return (
    <Modal title={result ? 'Venda concluída' : `Vender ${player.name}?`} description={result ? `${result.player_name} voltou a ficar livre.${isStarter ? ' O jogador saiu da escalação; escale novamente antes de jogar.' : ''} Valores em moedas, devolvidos pela API.` : `O jogador sai do elenco de ${clubName ?? 'seu clube'} e volta a ficar livre.`} onClose={onClose} busy={submission.pending} className="transfer-dialog">
      <div className="transfer-form">
        <Feedback title="A venda foi recusada" message={submission.error} error />
        {result ? <><CircleCheck className="transfer-success-icon" aria-hidden="true" /><TransferFacts items={facts} /></> : <>
          {lineup.state.status === 'loading' && <p role="status" className="field-hint">Consultando a escalação…</p>}
          {lineup.state.status === 'error' && <TransferNotice>Não foi possível consultar se o jogador é titular. {lineup.state.message} A venda pode ser confirmada; se for titular, ele sairá da escalação.</TransferNotice>}
          {isStarter && <Alert className="warning-notice"><TriangleAlert aria-hidden="true" /><AlertDescription>{player.name} é titular. Ao vender, ele sai da escalação e {clubName ?? 'o clube'} só volta a jogar depois de escalar de novo os 5 titulares.</AlertDescription></Alert>}
          <TransferPlayerSummary player={player} />
          {player.contract ? <TransferFacts items={[
            { label: 'Valor de compra', value: formatMoney(player.contract.purchase_value) },
            { label: 'Fim da fidelidade', value: formatDateTime(player.contract.loyalty_until) },
            { label: 'Dias restantes', value: player.contract.remaining_days },
            { label: '% de multa se vender agora', value: `${player.contract.penalty_rate}%` },
          ]} /> : <TransferNotice>Contrato indisponível na consulta. A API verificará o contrato ao confirmar.</TransferNotice>}
          <TransferNotice>A venda é pelo valor de mercado do momento. Multa (teto de 10,00), lucro, comissão e crédito são calculados ao confirmar.</TransferNotice>
          {submission.pending && <TransferNotice pending>Enviando a venda. Os controles ficam desabilitados até a resposta.</TransferNotice>}
        </>}
      </div>
      <div className="modal-actions">
        {result ? <>
          <Button asChild variant="outline"><Link to={`/clubs/${result.club_id}?tab=history`} onClick={onClose}><History aria-hidden="true" /> Ver histórico</Link></Button>
          <Button onClick={onClose}>Fechar</Button>
        </> : <>
          <Button variant="outline" onClick={onClose} disabled={submission.pending}>Cancelar</Button>
          <Button onClick={confirmSale} disabled={submission.pending || lineup.state.status === 'loading'}>{submission.pending ? 'Vendendo…' : <><HandCoins aria-hidden="true" /> Confirmar venda</>}</Button>
        </>}
      </div>
    </Modal>
  )
}
