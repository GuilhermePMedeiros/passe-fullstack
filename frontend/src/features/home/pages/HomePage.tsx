import { useEffect } from 'react'
import { ArrowRight, HandCoins, History, Shield, ShoppingCart, Trophy, UsersRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { FootballFieldBackground } from '../components/FootballFieldBackground'
import { LeagueFooter } from '../components/LeagueFooter'
import { LeagueStatistics } from '../components/LeagueStatistics'
import { LeagueStatus } from '../components/LeagueStatus'
import { PasseLogo } from '@/components/layout/PasseLogo'
import { WorkflowCard, type WorkflowStep } from '../components/WorkflowCard'
import { useLeagueSummary } from '../hooks/useLeagueSummary'

const WORKFLOW_STEPS: WorkflowStep[] = [
  { title: 'Jogadores', description: 'Nascem livres e Apto; o valor de mercado vem da condição, agilidade e idade.', to: '/players', icon: UsersRound },
  { title: 'Clubes', description: 'Começam com 300,00 em caixa e sem jogadores.', to: '/clubs', icon: Shield },
  { title: 'Compra', description: 'Valor + taxa, até 50% do caixa, com contrato de fidelidade.', to: '/players?free=true', icon: ShoppingCart },
  { title: 'Venda', description: 'Multa antes do fim da fidelidade e comissão sobre o lucro.', to: '/clubs?action=sell', icon: HandCoins },
  { title: 'Histórico', description: 'Toda compra e venda fica registrada, com totais e CSV.', to: '/clubs?tab=history', icon: History },
  { title: 'Liga', description: 'Escale os titulares no clube. Partidas e classificação em desenvolvimento.', to: '/clubs?tab=lineup', icon: Trophy },
]

export function HomePage() {
 
  const { state, retry } = useLeagueSummary()
  const navigate = useNavigate()
  const year = new Intl.DateTimeFormat('pt-BR', { year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date())

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target
      const isInteractive = target instanceof Element && target.closest('a, button, input, textarea, select, [contenteditable], [role="button"], [role="link"]')
      if (event.key === 'Enter' && !event.repeat && !event.isComposing && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && !isInteractive) {
        event.preventDefault()
        navigate('/players')
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  return (
    <section className="home-panel" aria-labelledby="home-title">
      <FootballFieldBackground />
      
      <header className="home-hero">
        
        <PasseLogo />
        <LeagueStatus state={state} year={year} />
        <h1 id="home-title">Gestão da liga, do mercado à classificação</h1>
        <p className="home-description">Cadastre jogadores, monte os clubes e negocie com contrato de fidelidade. Depois, escale os titulares e jogue partidas com placar calculado pelos atributos.</p>
        <div className="home-start">
          <Button asChild className="home-start-button"><Link to="/players">Iniciar <ArrowRight aria-hidden="true" /></Link></Button>
          <span className="keyboard-hint">ou tecle <kbd>Enter</kbd></span>
        </div>
        <LeagueStatistics state={state} />
        {state.status === 'loading' && <p className="home-feedback">Carregando estatísticas da liga…</p>}
        {state.status === 'error' && (
          <div className="home-feedback home-error" role="alert">
            <p>{state.message}</p>
            <Button variant="outline" onClick={retry}>Tentar novamente</Button>
          </div>
        )}
      
      </header>
      
      <nav aria-label="Etapas da gestão da liga" className="workflow-navigation">
        
        <ol className="workflow-list">
          {WORKFLOW_STEPS.map((step, index) => <WorkflowCard key={step.title} step={step} number={index + 1} />)}
        </ol>
      
      </nav>
      
      <LeagueFooter year={year} />
    
    </section>
  )
}
