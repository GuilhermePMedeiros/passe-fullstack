import { useCallback, useMemo, useState } from 'react'
import { Download, Filter, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { DataTable, type TableColumn } from '@/components/ui/DataTable'
import { Feedback } from '@/components/ui/Feedback'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/ListStates'
import { SelectField } from '@/components/ui/SelectField'
import { useSubmission } from '@/hooks/useSubmission'
import { formatDateTime, formatMoney, formatSignedMoney } from '@/lib/formatters'
import { useClubQuery } from '../hooks/useClubQuery'
import { downloadHistory, getHistory } from '../services/clubService'
import type { HistoryFilters, Transaction } from '../types/club.types'

export function ClubHistoryTab({ clubId, revision }: { clubId: string; revision: number }) {
  const [type, setType] = useState('')
  const [playerId, setPlayerId] = useState('')
  const filters = useMemo<HistoryFilters>(() => ({ ...(type ? { type } : {}), ...(playerId ? { player_id: playerId } : {}) }), [type, playerId])
  const load = useCallback(async (signal: AbortSignal) => {
    const all = await getHistory(clubId, {}, signal)
    const history = type || playerId ? await getHistory(clubId, filters, signal) : all
    return { all: all.data, history, revision }
  }, [clubId, type, playerId, filters, revision])
  const { state, refresh } = useClubQuery(load)
  const exportAction = useSubmission()

  const columns: TableColumn<Transaction>[] = [
    { key: 'date', label: 'Data e hora (Brasília)', render: row => formatDateTime(row.created_at) },
    { key: 'type', label: 'Tipo', render: row => <Badge variant="outline">{row.type === 'COMPRA' ? 'Compra' : 'Venda'}</Badge> },
    { key: 'name', label: 'Jogador', render: row => row.player_name },
    { key: 'value', label: 'Valor', render: row => formatMoney(row.value) },
    { key: 'fee', label: 'Taxa / comissão', render: row => formatMoney(row.fee) },
    { key: 'penalty', label: 'Multa', render: row => formatMoney(row.penalty) },
    { key: 'profit', label: 'Lucro', render: row => row.profit === null ? '—' : formatSignedMoney(row.profit) },
    { key: 'cash', label: 'Variação do caixa', render: row => <strong>{formatSignedMoney(row.cash_change)}</strong> },
  ]

  if (state.status === 'loading') return <section className="club-panel"><LoadingState label="Carregando histórico…" /></section>
  if (state.status === 'error') return (
    <section className="club-panel">
      <ErrorState title="Não foi possível carregar o histórico" message={`${state.message} Os totais e a exportação ficam indisponíveis até a lista carregar.`} onRetry={refresh} />
      {(type || playerId) && <Button variant="outline" className="history-reset" onClick={() => { setType(''); setPlayerId('') }}>Limpar filtros do histórico</Button>}
    </section>
  )

  const { history, all } = state.data
  const players = [...new Map(all.map(row => [row.player_id, { value: String(row.player_id), label: row.player_name }])).values()]
  const totals = [
    ['Total pago em compras', history.summary.total_spent],
    ['Total recebido em vendas', history.summary.total_received],
    ['Taxas e comissões', history.summary.total_fees],
    ['Total de multas', history.summary.total_penalties],
    ['Lucro total', history.summary.total_profit],
  ] as const

  return (
    <section className="club-panel">
      <header className="club-panel-header"><h2>Histórico de transações</h2><p>Compras e vendas com os valores e o nome do momento. Valores em moedas.</p></header>
      <div className="club-history-filters">
        <SelectField label="Todos os tipos" icon={Filter} value={type} options={[{ value: 'COMPRA', label: 'Compra' }, { value: 'VENDA', label: 'Venda' }, { value: 'COMPRA,VENDA', label: 'Compra e venda' }]} onChange={setType} />
        <SelectField label="Todos os jogadores" icon={UserRound} value={playerId} options={players} onChange={setPlayerId} />
        <Button variant="outline" disabled={exportAction.pending} onClick={() => void exportAction.run(async () => {
          await downloadHistory(clubId, filters)
          toast.success('CSV exportado')
        })}><Download aria-hidden="true" />{exportAction.pending ? 'Exportando…' : 'Exportar CSV'}</Button>
      </div>
      <Feedback message={exportAction.error} error />
      {history.data.length ? <DataTable rows={history.data} columns={columns} label="Histórico de transações" /> : <EmptyState message="Nenhuma compra ou venda" description="As compras e vendas do clube aparecem aqui, com os totais. Altere os filtros se necessário." />}
      <dl className="history-totals">{totals.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{label === 'Lucro total' ? formatSignedMoney(value) : formatMoney(value)}</dd></div>)}</dl>
    </section>
  )
}
