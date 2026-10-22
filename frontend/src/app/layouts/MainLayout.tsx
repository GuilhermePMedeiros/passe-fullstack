import type { ReactNode } from 'react'

export function MainLayout({ children }: { children: ReactNode }) {
  return <main id="main-content" className="app-main">{children}</main>
}
