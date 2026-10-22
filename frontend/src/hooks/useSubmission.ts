import { useRef, useState } from 'react'
import { getErrorMessage } from '@/lib/errors'

export function useSubmission() {
  const lock = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function run(action: () => Promise<void>) {
    if (lock.current) return

    lock.current = true
    setPending(true)
    setError('')

    try {
      await action()
    } catch (cause) {
      setError(getErrorMessage(cause))
    } finally {
      lock.current = false
      setPending(false)
    }
  }

  return { pending, error, run }
}
