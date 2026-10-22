import { PanelLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Separator } from '@/components/ui/separator'
import { Link, useLocation } from 'react-router'
import { useWorkspace } from './WorkspaceContext'

const SECTION_TITLES: Record<string, string> = {
  players: 'Jogadores',
  clubs: 'Clubes',
  matches: 'Partidas',
  standings: 'Classificação',
}

export function AppHeader({ onMenu }: { onMenu: () => void }) {
  const { refresh, data } = useWorkspace()
  const location = useLocation()
  const clubId = location.pathname.match(/^\/clubs\/([^/]+)$/u)?.[1]
  const clubName = data?.clubs.find(club => String(club.id) === clubId)?.name ?? `Clube ${clubId}`
  const section = SECTION_TITLES[location.pathname.split('/')[1]] ?? 'Gestão da liga'

  function refreshPage() {
    refresh()
    window.dispatchEvent(new Event('passe:refresh'))
  }

  return (
    <header className="workspace-header">
      <Button variant="ghost" size="icon" className="mobile-menu-button" aria-label="Abrir menu de navegação" onClick={onMenu}>
        <PanelLeft aria-hidden="true" />
      </Button>
      <Separator orientation="vertical" className="header-separator" />
      <nav aria-label="Caminho da página" className="breadcrumbs">
        <Link to="/">Mercado</Link><span aria-hidden="true">›</span>
        {clubId ? <><Link to="/clubs">Clubes</Link><span aria-hidden="true">›</span><span aria-current="page">{clubName}</span></> : <span aria-current="page">{section}</span>}
      </nav>
      <Button variant="ghost" size="icon" onClick={refreshPage} aria-label="Atualizar dados">
        <RefreshCw aria-hidden="true" />
      </Button>
    </header>
  )
}
