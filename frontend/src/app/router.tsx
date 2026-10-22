import { lazy, Suspense, useEffect, useRef } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router'
import { HomePage } from '@/features/home/pages/HomePage'
import { Button } from '@/components/ui/Button'
import { WorkspaceLayout } from './layouts/WorkspaceLayout'
const PlayersPage = lazy(() => import('@/features/players/pages/PlayersPage').then(module => ({ default: module.PlayersPage })))
const ClubsPage = lazy(() => import('@/features/clubs/pages/ClubsPage').then(module => ({ default: module.ClubsPage })))
const ClubDetailsPage = lazy(() => import('@/features/clubs/pages/ClubDetailsPage').then(module => ({ default: module.ClubDetailsPage })))
const MatchesPage = lazy(() => import('@/features/matches/pages/MatchesPage').then(module => ({ default: module.MatchesPage })))
const MatchDetailsPage = lazy(() => import('@/features/matches/pages/MatchDetailsPage').then(module => ({ default: module.MatchDetailsPage })))
const StandingsPage = lazy(() => import('@/features/standings/pages/StandingsPage').then(module => ({ default: module.StandingsPage })))

function PendingSection({ title }: { title: string }) {
  
  const headingRef = useRef<HTMLHeadingElement>(null)
  const location = useLocation()
  
  useEffect(() => { headingRef.current?.focus() }, [location.pathname])

  return (
    <section className="pending-section" aria-labelledby="section-title">
      
      <h1 id="section-title" tabIndex={-1} ref={headingRef}>{title}</h1>
     
      <p>Esta seção ainda não está disponível. Acompanhe as próximas etapas do Passe.</p>
      
      <Button asChild><Link to="/">Página inicial</Link></Button>
    
    </section>
  )
}

function PurchaseRedirect() {
  const [params] = useSearchParams()
  const playerId = params.get('player_id')
  const query = new URLSearchParams({ free: 'true' })
  if (playerId) query.set('buy', playerId)
  return <Navigate replace to={`/players?${query}`} />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route element={<WorkspaceLayout />}>
        <Route path="/players" element={<Suspense fallback={<p role="status">Carregando página…</p>}><PlayersPage /></Suspense>} />
        <Route path="/clubs" element={<Suspense fallback={<p role="status">Carregando página…</p>}><ClubsPage /></Suspense>} />
        <Route path="/clubs/:id" element={<Suspense fallback={<p role="status">Carregando página…</p>}><ClubDetailsPage /></Suspense>} />
        <Route path="/matches" element={<Suspense fallback={<p role="status">Carregando página…</p>}><MatchesPage /></Suspense>} />
        <Route path="/matches/:id" element={<Suspense fallback={<p role="status">Carregando página…</p>}><MatchDetailsPage /></Suspense>} />
        <Route path="/standings" element={<Suspense fallback={<p role="status">Carregando página…</p>}><StandingsPage /></Suspense>} />
        <Route path="/transfers/buy" element={<PurchaseRedirect />} />
      </Route>
      <Route path="*" element={<PendingSection title="Página não encontrada" />} />
    </Routes>
  )
}
