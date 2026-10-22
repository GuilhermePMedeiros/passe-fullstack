import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Feedback } from '@/components/ui/Feedback'
import { Modal } from '@/components/ui/Modal'
import { useSubmission } from '@/hooks/useSubmission'
import { formatMoney, formatSignedMoney } from '@/lib/formatters'
import { sellPlayer } from '../services/clubService'
import type { SaleResult, SquadPlayer } from '../types/club.types'

export function ClubSaleDialog({ player, onClose, onSold }: { player: SquadPlayer; onClose: () => void; onSold: () => void }) {
  const submission = useSubmission()
  const [result, setResult] = useState<SaleResult | null>(null)

  function confirmSale() {
    void submission.run(async () => {
      const sale = await sellPlayer(player.id)
      setResult(sale)
      onSold()
    })
  }

  const facts = result ? [
    ['Valor de compra', formatMoney(result.purchase_value)],
    ['Valor de venda', formatMoney(result.value)],
    ['Dias restantes', String(result.remaining_days)],
    ['Multa', `${formatMoney(result.penalty)} (${result.penalty_rate}%)`],
    ['Lucro', result.profit === null ? '—' : formatSignedMoney(result.profit)],
    ['Comissão', formatMoney(result.fee)],
    ['Crédito no caixa', formatMoney(result.cash_change)],
    ['Novo caixa', formatMoney(result.club_cash)],
    ['Contrato', result.contract_status],
  ] : []

  return (
    <Modal title={result ? 'Jogador vendido' : `Vender ${player.name}?`} description={result ? `${result.player_name} voltou a ficar livre. Valores devolvidos pela API, em moedas.` : 'A venda usa o valor de mercado no momento e pode cobrar multa e comissão. O jogador sai do elenco e, se for titular, da escalação.'} onClose={onClose} busy={submission.pending}>
      <Feedback message={submission.error} error />
      {result ? <dl className="club-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : (
        <p className="club-info">Valor de mercado consultado: {formatMoney(player.market_value)} moedas. O resultado definitivo será informado após a confirmação.</p>
      )}
      <div className="modal-actions">
        {result ? <Button onClick={onClose}>Concluir</Button> : <>
          <Button variant="outline" onClick={onClose} disabled={submission.pending}>Cancelar</Button>
          <Button onClick={confirmSale} disabled={submission.pending}>{submission.pending ? 'Vendendo…' : 'Confirmar venda'}</Button>
        </>}
      </div>
    </Modal>
  )
}
