import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '@/lib/errors'
import { getLeagueSummary } from '../services/leagueService'
import type { LeagueSummaryState } from '../types/league.types'

export function useLeagueSummary() {
  
  const [state, setState] = useState<LeagueSummaryState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt(value => value + 1), [])

  useEffect(() => {
    
    const controller = new AbortController()
    setState({ status: 'loading' })
    getLeagueSummary(controller.signal).then(
      data => { if (!controller.signal.aborted) setState({ status: 'success', data }) },
      error => { if (!controller.signal.aborted) setState({ status: 'error', message: getErrorMessage(error) }) },
    )
   
    return () => controller.abort()
  }, [attempt])

  return { state, retry }
}