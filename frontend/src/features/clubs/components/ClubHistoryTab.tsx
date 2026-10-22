import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { Download, Filter, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { DataTable, type TableColumn } from '@/components/ui/DataTable'
import { Feedback } from '@/components/ui/Feedback'
import { EmptyState, ErrorState } from '@/components/ui/ListStates'
import { SelectField } from '@/components/ui/SelectField'
import { useSubmission } from '@/hooks/useSubmission'
import { formatDateTime, formatMoney, formatSignedMoney } from '@/lib/formatters'
import { useClubQuery } from '../hooks/useClubQuery'
import { downloadHistory, getHistory } from '../services/clubService'
import type { HistoryFilters, Transaction } from '../types/club.types'

export function ClubHistoryTab({ clubId, revision }: { clubId: string; revision: number }) {
  const [params, setParams] = useSearchParams()
  const type = params.get('type') ?? ''
  const playerId = params.get('player_id') ?? ''
  const filters = useMemo<HistoryFilters>(() => ({ ...(type ? { type } : {}), ...(playerId ? { player_id: playerId } : {}) }), [type, playerId])
  const loadCatalog = useCallback(async (signal: AbortSignal) => ({
    history: await getHistory(clubId, {}, signal), revision,
  }), [clubId, revision])
  const catalog = useClubQuery(loadCatalog)
  const load = useCallback(async (signal: AbortSignal) => ({
    history: await getHistory(clubId, filters, signal), revision,
  }), [clubId, filters, revision])
  const { state, refresh } = useClubQuery(load)
  const exportAction = useSubmission()

  function changeFilter(key: 'type' | 'player_id', value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  function clearFilters() {
    const next = new URLSearchParams(params)
    next.delete('type')
    next.delete('player_id')
    setParams(next)
  }

  function retry() {
    refresh()
    if (catalog.state.status === 'error') catalog.refresh()
  }

  const columns: TableColumn<Transaction>[] = [
    { key: 'date', label: 'Data e hora (Brasília)', render: row => formatDateTime(row.created_at) },
    { key: 'type', label: 'Tipo', render: row => <Badge variant="outline">{row.type === 'COMPRA' ? 'Compra' : 'Venda'}</Badge> },
    { key: 'name', label: 'Jogador', render: row => row.player_name },
    { key: 'value', label: 'Valor', render: row => formatMoney(row.value) },
    { key: 'fee', label: 'Taxa / comissão', render: row => formatMoney(row.fee) },
    { key: 'penalty', label: 'Multa', render: row => formatMoney(row.penalty) },
    { key: 'profit', label: 'Lucro', render: row => row.profit === null ? '—' : <span className={row.profit < 0 ? 'history-negative' : 'history-positive'}>{formatSignedMoney(row.profit)}</span> },
    { key: 'cash', label: 'Variação do caixa', render: row => <strong className={row.cash_change < 0 ? 'history-negative' : 'history-positive'}>{formatSignedMoney(row.cash_change)}</strong> },
  ]

  const history = state.status === 'success' ? state.data.history : null
  const all = catalog.state.status === 'success' ? catalog.state.data.history.data : []
  const players = [...new Map(all.map(row => [row.player_id, { value: String(row.player_id), label: row.player_name }])).values()]
  if (playerId && !players.some(player => player.value === playerId)) {
    players.push({ value: playerId, label: `Jogador ${playerId}` })
  }
  const totals = history ? [
    ['Total pago em compras', history.summary.total_spent],
    ['Total recebido em vendas', history.summary.total_received],
    ['Taxas e comissões', history.summary.total_fees],
    ['Total de multas', history.summary.total_penalties],
    ['Lucro total', history.summary.total_profit],
  ] as const : []

  return (
    <section className="club-panel" aria-busy={state.status === 'loading'}>
      <header className="club-panel-header"><h2>Histórico de transações</h2><p>Da mais recente para a mais antiga, com o nome e os valores do momento de cada operação. Valores em moedas.</p></header>
      <div className="club-history-filters">
        <SelectField label="Todos os tipos" icon={Filter} value={type} options={[{ value: 'COMPRA', label: 'Compra' }, { value: 'VENDA', label: 'Venda' }, { value: 'COMPRA,VENDA', label: 'Compra e venda' }]} onChange={value => changeFilter('type', value)} />
        <SelectField label="Todos os jogadores" icon={UserRound} value={playerId} options={players} onChange={value => changeFilter('player_id', value)} />
        <Button variant="outline" disabled={exportAction.pending || state.status !== 'success'} onClick={() => void exportAction.run(async () => {
          await downloadHistory(clubId, filters)
          toast.success('CSV exportado')
        })}><Download aria-hidden="true" />{exportAction.pending ? 'Exportando…' : 'Exportar CSV'}</Button>
        {(type || playerId) && <Button variant="ghost" onClick={clearFilters}>Limpar filtros do histórico</Button>}
      </div>
      <Feedback message={exportAction.error} error />
      {catalog.state.status === 'error' && state.status === 'success' && <ErrorState title="Não foi possível carregar os jogadores do filtro" message={catalog.state.message} onRetry={catalog.refresh} />}
      {state.status === 'loading' && <><p className="club-panel-header" role="status">Carregando histórico…</p><DataTable rows={[]} columns={columns} label="Histórico de transações" loading /></>}
      {state.status === 'error' && <ErrorState title={type || playerId ? 'O filtro foi recusado ou não pôde ser consultado' : 'Não foi possível carregar o histórico'} message={state.message} onRetry={retry} />}
      {history && <>
        {history.data.length ? <DataTable rows={history.data} columns={columns} label="Histórico de transações" /> : <EmptyState message="Nenhuma transação ainda" description="As compras e vendas do clube aparecem aqui, com os totais logo abaixo. Altere os filtros se necessário." />}
        <dl className="history-totals">{totals.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{label === 'Lucro total' ? formatSignedMoney(value) : formatMoney(value)}</dd></div>)}</dl>
        <p className="club-panel-header field-hint">Os totais e o CSV respeitam os filtros aplicados. Deslize a tabela para consultar todas as colunas.</p>
      </>}
    </section>
  )
}
