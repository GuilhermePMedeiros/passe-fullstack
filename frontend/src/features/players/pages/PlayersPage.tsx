import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Plus, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/ListStates'
import { PaginationControls } from '@/components/ui/PaginationControls'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useWorkspace } from '@/components/layout/WorkspaceContext'
import { formatMoney } from '@/lib/formatters'
import { usePlayers } from '../hooks/usePlayers'
import { PlayerFilters } from '../components/PlayerFilters'
import { PlayersTable } from '../components/PlayersTable'
import { PlayerDialogs, type PlayerDialogState } from '../components/PlayerDialogs'
import { PlayerSortMenu } from '../components/PlayerSortMenu'
import { CONDITIONS, type Player, type PlayerAction, type PlayerFiltersQuery } from '../types/player.types'
import '../players.css'

const FILTER_KEYS = ['search', 'position', 'condition', 'club_id', 'free', 'min_age', 'max_age', 'min_value', 'max_value', 'sort', 'page']

export function PlayersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryString = searchParams.toString()
  const query = useMemo(() => Object.fromEntries(
    [...new URLSearchParams(queryString)].filter(([key]) => FILTER_KEYS.includes(key)),
  ), [queryString])
  const { state, refresh } = usePlayers(new URLSearchParams(query).toString())
  const workspace = useWorkspace()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const openerRef = useRef<number | null>(null)
  const [dialog, setDialog] = useState<PlayerDialogState | null>(null)
  const [message, setMessage] = useState('')

  useLayoutEffect(() => { headingRef.current?.focus() }, [])

  useEffect(() => {
    if (state.status === 'success' && !state.result.data.length && state.result.meta.page > 1) {
      const lastPage = Math.max(1, state.result.meta.total_pages)
      if (lastPage < state.result.meta.page) setSearchParams({ ...query, page: String(lastPage) }, { replace: true })
    }
  }, [state, query, setSearchParams])

  function changeQuery(next: PlayerFiltersQuery) {
    const entries = Object.entries(next).filter(([, value]) => value !== '')
    const clean = Object.fromEntries(entries)

    if (clean.free === 'true') delete clean.club_id

    setSearchParams(clean)
  }

  function closeDialog() {
    setDialog(null)
    window.requestAnimationFrame(() => {
      const selector = openerRef.current === null ? '#new-player-button' : `[data-player-action="${openerRef.current}"]`
      const target = document.querySelector<HTMLElement>(selector) ?? headingRef.current
      target?.focus()
    })
  }

  function openAction(action: PlayerAction, player: Player) {
    toast.dismiss()
    openerRef.current = player.id
    setDialog({ kind: action, player })
  }

  function openCreate() {
    toast.dismiss()
    openerRef.current = null
    setDialog({ kind: 'create' })
  }

  function refreshAll() {
    refresh()
    workspace.refresh()
  }

  function handleSaved(player: Player, created: boolean, removedFromLineup = false) {
    refreshAll()
    const suffix = removedFromLineup ? ' O jogador saiu da escalação; escale novamente antes de jogar.' : ''
    setMessage(`${created ? 'Jogador cadastrado' : 'Jogador atualizado'}: ${player.name}. ${CONDITIONS[player.condition]}. Valor de mercado: ${formatMoney(player.market_value)} moedas.${suffix}`)
    if (!created) {
      toast.success(dialog?.kind === 'condition' ? 'Condição alterada' : 'Jogador atualizado', {
        description: `${player.name} agora está ${CONDITIONS[player.condition]}. Valor de mercado: ${formatMoney(player.market_value)} moedas.${suffix}`,
      })
    }

    if (created) setDialog({ kind: 'created', player })
    else closeDialog()
  }

  function handleDeleted(player: Player) {
    openerRef.current = null
    closeDialog()
    refreshAll()
    setMessage(`${player.name} foi excluído da lista. Transações e partidas antigas continuam preservadas.`)
    toast.success('Jogador excluído', { description: `${player.name} saiu da lista. Transações e partidas antigas continuam preservadas.` })
  }

  function renderList() {
    if (state.status === 'loading') return <PlayersTable players={[]} clubs={[]} loading onAction={openAction} />
    if (state.status === 'error') return <ErrorState title="Não foi possível carregar os jogadores" message={state.message} onRetry={refresh} />
    if (!state.result.data.length) return <EmptyState message={query.search ? `Nenhum jogador encontrado para “${query.search}”` : 'Nenhum jogador encontrado'} onClear={() => changeQuery({})} />

    return (
      <>
        <PlayersTable players={state.result.data} clubs={workspace.data?.clubs ?? []} onAction={openAction} />
        <PaginationControls meta={state.result.meta} itemLabel="jogadores" onPage={page => changeQuery({ ...query, page: String(page) })} />
      </>
    )
  }

  const counts = state.status === 'success' ? { total: state.total, free: state.free, contracted: state.total - state.free } : null
  const activeTab = query.free === 'true' ? 'free' : query.free === 'false' ? 'contracted' : 'all'
  const showToolbar = state.status === 'loading' || (state.status === 'success' && state.result.data.length > 0)

  function changeTab(value: string) {
    const free = value === 'free' ? 'true' : value === 'contracted' ? 'false' : ''
    changeQuery({ ...query, free, ...(free === 'true' ? { club_id: '' } : {}), page: '1' })
  }

  return (
    <article className="players-page">
      <header className="page-header">
        <span className="page-icon"><UsersRound aria-hidden="true" /></span>
        <div><h1 ref={headingRef} tabIndex={-1}>Jogadores</h1><p>Cadastre jogadores, acompanhe os indicadores e compre os que estão livres.</p></div>
        <Button id="new-player-button" onClick={openCreate}><Plus aria-hidden="true" /> Novo jogador</Button>
      </header>
      <PlayerFilters query={query} clubs={workspace.data?.clubs ?? []} onChange={changeQuery} />
      <Tabs className="players-list" role="region" aria-label="Lista de jogadores" aria-busy={state.status === 'loading'} data-query={queryString} value={activeTab} onValueChange={changeTab}>
        {showToolbar && <div className="players-list-toolbar">
          {state.status === 'loading' ? <p role="status" className="list-loading-label">Carregando jogadores…</p> : (
            <TabsList className="player-tabs" aria-label="Vínculo dos jogadores">
              <TabsTrigger value="all">Todos <span>{counts?.total ?? '—'}</span></TabsTrigger>
              <TabsTrigger value="free">Livres <span>{counts?.free ?? '—'}</span></TabsTrigger>
              <TabsTrigger value="contracted">Em clubes <span>{counts?.contracted ?? '—'}</span></TabsTrigger>
            </TabsList>
          )}
          {state.status === 'loading' ? <Skeleton className="sort-skeleton" aria-hidden="true" /> : <PlayerSortMenu value={query.sort ?? 'name'} onChange={sort => changeQuery({ ...query, sort, page: '1' })} />}
        </div>}
        <TabsContent value={activeTab} className="players-tab-content" aria-label="Resultado da consulta">{renderList()}</TabsContent>
      </Tabs>
      <p className="players-footnote">{message || 'Overall e valor de mercado são calculados a cada consulta. A busca ignora maiúsculas, minúsculas e acentos.'}</p>
      {dialog && (
        <PlayerDialogs
          key={`${dialog.kind}-${'player' in dialog ? dialog.player.id : 'new'}`}
          dialog={dialog}
          onClose={closeDialog}
          onAction={openAction}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </article>
  )
}
