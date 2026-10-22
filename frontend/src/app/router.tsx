import { useEffect, useRef } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router'
import { HomePage } from '@/features/home/pages/HomePage'
import { Button } from '@/components/ui/Button'

function PendingSection({ title }: { title: string }) {
  
  const headingRef = useRef<HTMLHeadingElement>(null)
  const location = useLocation()
  
  useEffect(() => { headingRef.current?.focus() }, [location.pathname])

  return (
    <section className="pending-section" aria-labelledby="section-title">
      
      <h1 id="section-title" tabIndex={-1} ref={headingRef}>{title}</h1>
     
      <p>Esta seção ainda não está disponível. Acompanhe as próximas etapas do Passe.</p>
      
      <Button asChild><Link to="/">Voltar ao início</Link></Button>
    
    </section>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/players" element={<PendingSection title="Jogadores" />} />
      <Route path="/clubs" element={<PendingSection title="Clubes" />} />
      <Route path="/matches" element={<PendingSection title="Partidas" />} />
      <Route path="*" element={<PendingSection title="Página não encontrada" />} />
    </Routes>
  )
}
