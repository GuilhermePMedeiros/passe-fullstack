import { useCallback, useEffect, useState } from 'react'
import { listPlayers } from '../services/playerService'
import { getErrorMessage } from '@/lib/errors'
import type { PlayerFiltersQuery, PlayersResponse } from '../types/player.types'

type PlayersState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; result: PlayersResponse; total: number; free: number }

export function usePlayers(queryString: string) {
  const [state, setState] = useState<PlayersState>({ status: 'loading' })
  const [revision, setRevision] = useState(0)
  const [loadedRequest, setLoadedRequest] = useState('')
  const requestKey = `${queryString}#${revision}`
  const refresh = useCallback(() => setRevision(value => value + 1), [])

  useEffect(() => {
    window.addEventListener('passe:refresh', refresh)
    return () => window.removeEventListener('passe:refresh', refresh)
  }, [refresh])

  useEffect(() => {
    const controller = new AbortController()
    const query = Object.fromEntries(new URLSearchParams(queryString))
    const base: PlayerFiltersQuery = { ...query, page: '1', limit: '1' }
    delete base.free
    const freeQuery: PlayerFiltersQuery = { ...base, free: 'true' }
    delete freeQuery.club_id

    setState({ status: 'loading' })

    Promise.all([
      listPlayers({ ...query, limit: '10' }, controller.signal),
      listPlayers(base, controller.signal),
      query.club_id ? Promise.resolve(null) : listPlayers(freeQuery, controller.signal),
    ]).then(
      ([result, all, free]) => {
        if (!controller.signal.aborted) {
          setState({ status: 'success', result, total: all.meta.total_items, free: free?.meta.total_items ?? 0 })
          setLoadedRequest(requestKey)
        }
      },
      cause => {
        if (!controller.signal.aborted) {
          setState({ status: 'error', message: getErrorMessage(cause) })
          setLoadedRequest(requestKey)
        }
      },
    )

    return () => controller.abort()
  }, [queryString, revision, requestKey])

  const currentState: PlayersState = loadedRequest === requestKey ? state : { status: 'loading' }

  return { state: currentState, refresh }
}
