import { createContext, useContext } from 'react'
import type { useWorkspaceOverview } from '@/hooks/useWorkspaceOverview'

export const WorkspaceContext = createContext<ReturnType<typeof useWorkspaceOverview> | null>(null)

export function useWorkspace() {
  const context = useContext(WorkspaceContext)

  if (!context) throw new Error('WorkspaceContext is required')

  return context
}
