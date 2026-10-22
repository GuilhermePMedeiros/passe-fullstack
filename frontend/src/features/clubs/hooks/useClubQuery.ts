import { useCallback, useEffect, useState } from 'react'
import { ApiError, getErrorMessage } from '@/lib/errors'

type QueryState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string; notFound: boolean }
  | { status: 'success'; data: T }

export function useClubQuery<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<QueryState<T>>({ status: 'loading' })
  const [revision, setRevision] = useState(0)
  const [loaded, setLoaded] = useState<{ load: typeof load; revision: number } | null>(null)
  const refresh = useCallback(() => setRevision(value => value + 1), [])

  useEffect(() => {
    window.addEventListener('passe:refresh', refresh)
    return () => window.removeEventListener('passe:refresh', refresh)
  }, [refresh])

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    load(controller.signal).then(data => {
      if (controller.signal.aborted) return
      setState({ status: 'success', data })
      setLoaded({ load, revision })
    }, cause => {
      if (controller.signal.aborted) return
      setState({ status: 'error', message: getErrorMessage(cause), notFound: cause instanceof ApiError && cause.status === 404 })
      setLoaded({ load, revision })
    })
    return () => controller.abort()
  }, [load, revision])

  const current: QueryState<T> = loaded?.load === load && loaded.revision === revision
    ? state : { status: 'loading' }

  return { state: current, refresh }
}
