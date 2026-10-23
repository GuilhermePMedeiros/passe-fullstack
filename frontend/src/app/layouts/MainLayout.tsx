import type { ReactNode } from 'react'
import { useLocation } from 'react-router'

export function MainLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()

  return <main id="main-content" className={pathname === '/' ? 'app-main' : 'workspace-main'}>{children}</main>
}
