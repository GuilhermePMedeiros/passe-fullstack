import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { ArrowLeft, ClipboardList, History, Shirt, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Feedback } from '@/components/ui/Feedback'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/ListStates'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useWorkspace } from '@/components/layout/WorkspaceContext'
import { useClubQuery } from '../hooks/useClubQuery'
import { getClub } from '../services/clubService'
import { ClubSummaryCards } from '../components/ClubSummaryCards'
import { ClubSquadTab } from '../components/ClubSquadTab'
import { ClubLineupTab } from '../components/ClubLineupTab'
import { ClubHistoryTab } from '../components/ClubHistoryTab'
import { ClubSaleDialog } from '../components/ClubSaleDialog'
import type { SquadPlayer } from '../types/club.types'
import '@/features/players/players.css'
import '../clubs.css'

export function ClubDetailsPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const workspace = useWorkspace()
  const load = useCallback((signal: AbortSignal) => getClub(id, signal), [id])
  const { state, refresh } = useClubQuery(load)
  const [sale, setSale] = useState<SquadPlayer | null>(null)
  const [revision, setRevision] = useState(0)
  const [message, setMessage] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const tab = ['squad', 'lineup', 'history'].includes(params.get('tab') ?? '') ? params.get('tab')! : 'squad'

  useLayoutEffect(() => {
    if (state.status === 'success') headingRef.current?.focus()
  }, [id, state.status])

  function closeSale() {
    const playerId = sale?.id
    setSale(null)
    window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`[data-sell-player="${playerId}"]`) ?? headingRef.current
      target?.focus()
    })
  }

  function handleSold() {
    refresh()
    workspace.refresh()
    setRevision(value => value + 1)
    setMessage('Jogador vendido. Elenco, caixa, contratos e escalação serão atualizados pela API. Se um titular saiu, escale novamente antes de jogar.')
    toast.success('Jogador vendido')
  }

  function renderContent() {
    if (state.status === 'loading') return <section className="club-panel"><LoadingState label="Carregando clube e elenco…" /></section>
    if (state.status === 'error') {
      if (state.notFound) return <section className="club-panel"><EmptyState message="Clube não encontrado" description={state.message} action={<Button asChild variant="outline"><Link to="/clubs"><ArrowLeft aria-hidden="true" /> Voltar para clubes</Link></Button>} /></section>
      return <section className="club-panel"><ErrorState title="Não foi possível carregar o elenco" message={state.message} onRetry={refresh} /></section>
    }
    const club = state.data
    return (
      <>
        <header className="page-header club-details-header">
          <span className="club-crest">{club.acronym}</span>
          <div><h1 ref={headingRef} tabIndex={-1}>{club.name}</h1><div className="club-heading-badges"><Badge variant="outline">Sigla {club.acronym}</Badge><Badge variant="outline"><Shirt aria-hidden="true" />{club.players.length} de 12 jogadores</Badge></div></div>
          <Button asChild><Link to="/players?free=true"><ShoppingCart aria-hidden="true" /> Comprar jogadores</Link></Button>
        </header>
        {location.state?.created && !message && <Feedback message={`Clube criado: ${club.name}.`} />}
        <Feedback message={message} />
        <ClubSummaryCards club={club} />
        <Tabs value={tab} onValueChange={value => setParams({ tab: value })} className="club-tabs">
          <TabsList aria-label="Seções do clube" className="club-tabs-list">
            <TabsTrigger value="squad"><Shirt aria-hidden="true" />Elenco <span>{club.players.length}</span></TabsTrigger>
            <TabsTrigger value="lineup"><ClipboardList aria-hidden="true" />Escalação</TabsTrigger>
            <TabsTrigger value="history"><History aria-hidden="true" />Histórico</TabsTrigger>
          </TabsList>
          <TabsContent value="squad"><ClubSquadTab players={club.players} onSell={setSale} /></TabsContent>
          <TabsContent value="lineup"><ClubLineupTab club={club} /></TabsContent>
          <TabsContent value="history"><ClubHistoryTab key={id} clubId={id} revision={revision} /></TabsContent>
        </Tabs>
      </>
    )
  }

  return <article className="clubs-page" aria-busy={state.status === 'loading'}>
    {renderContent()}
    {sale && <ClubSaleDialog player={sale} onClose={closeSale} onSold={handleSold} />}
  </article>
}
