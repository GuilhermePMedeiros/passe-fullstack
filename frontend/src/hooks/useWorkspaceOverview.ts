import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '@/lib/errors'
import { getWorkspaceOverview } from '@/services/workspaceService'

type WorkspaceData = Awaited<ReturnType<typeof getWorkspaceOverview>>

export function useWorkspaceOverview() {
  const [data, setData] = useState<WorkspaceData | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision(value => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()

    getWorkspaceOverview(controller.signal).then(
      overview => {
        if (!controller.signal.aborted) {
          setData(overview)
          setError('')
        }
      },
      cause => {
        if (!controller.signal.aborted) setError(getErrorMessage(cause))
      },
    )

    return () => controller.abort()
  }, [revision])

  return { data, error, refresh }
}
