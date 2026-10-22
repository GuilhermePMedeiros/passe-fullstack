import { lazy, Suspense, useEffect, useRef } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router'
import { HomePage } from '@/features/home/pages/HomePage'
import { Button } from '@/components/ui/Button'
import { WorkspaceLayout } from './layouts/WorkspaceLayout'
const PlayersPage = lazy(() => import('@/features/players/pages/PlayersPage').then(module => ({ default: module.PlayersPage })))
const ClubsPage = lazy(() => import('@/features/clubs/pages/ClubsPage').then(module => ({ default: module.ClubsPage })))
const ClubDetailsPage = lazy(() => import('@/features/clubs/pages/ClubDetailsPage').then(module => ({ default: module.ClubDetailsPage })))

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

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route element={<WorkspaceLayout />}>
        <Route path="/players" element={<Suspense fallback={<p role="status">Carregando página…</p>}><PlayersPage /></Suspense>} />
        <Route path="/clubs" element={<Suspense fallback={<p role="status">Carregando página…</p>}><ClubsPage /></Suspense>} />
        <Route path="/clubs/:id" element={<Suspense fallback={<p role="status">Carregando página…</p>}><ClubDetailsPage /></Suspense>} />
        <Route path="/matches" element={<PendingSection title="Partidas" />} />
        <Route path="/standings" element={<PendingSection title="Classificação" />} />
        <Route path="/transfers/buy" element={<PendingSection title="Compra de jogador" />} />
      </Route>
      <Route path="*" element={<PendingSection title="Página não encontrada" />} />
    </Routes>
  )
}
