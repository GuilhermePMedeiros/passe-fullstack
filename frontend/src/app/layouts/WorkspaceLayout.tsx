import { useState } from 'react'
import { Outlet } from 'react-router'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppHeader } from '@/components/layout/AppHeader'
import { WorkspaceContext } from '@/components/layout/WorkspaceContext'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { useWorkspaceOverview } from '@/hooks/useWorkspaceOverview'
import '@/styles/workspace.css'

export function WorkspaceLayout() {
  const overview = useWorkspaceOverview()
  const [menuOpen, setMenuOpen] = useState(false)

  function closeMenu() {
    setMenuOpen(false)
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>('[aria-label="Abrir menu de navegação"]')?.focus()
    })
  }

  return (
    <WorkspaceContext.Provider value={overview}>
      <TooltipProvider delayDuration={200}>
      <div className="workspace">
        <aside className="workspace-sidebar"><AppSidebar /></aside>
        <div className="workspace-body">
          <AppHeader onMenu={() => setMenuOpen(true)} />
          <Outlet />
        </div>
        <Sheet open={menuOpen} onOpenChange={open => { if (!open) closeMenu() }}>
          <SheetContent side="left" className="mobile-sidebar" onCloseAutoFocus={event => event.preventDefault()}>
            <SheetHeader className="sr-only">
              <SheetTitle>Menu de navegação</SheetTitle>
              <SheetDescription>Acesse as áreas do Passe.</SheetDescription>
            </SheetHeader>
            <AppSidebar onNavigate={closeMenu} />
          </SheetContent>
        </Sheet>
        <Toaster position="bottom-right" closeButton duration={6000} />
      </div>
      </TooltipProvider>
    </WorkspaceContext.Provider>
  )
}
