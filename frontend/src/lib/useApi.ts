import { useCallback, useEffect, useRef, useState } from 'react'
import { cacheKey, peek, type Role } from './api'
import { cache } from './cache'

/**
 * Read API data the stale-while-revalidate way:
 *  - first render already has the cached data (no loading screen when going back),
 *  - `load` runs (it returns cached data at once and refreshes silently when stale),
 *  - when the silent refresh finds a real change, only this state updates.
 * Also re-checks when the tab or app becomes visible again.
 * An error is reported only when there is nothing cached to show.
 */
export function useApi<T>(role: Role | null, path: string | null, load: () => Promise<T>) {
  const key = path ? cacheKey(role, path) : null
  const [data, setData] = useState<T | undefined>(() => (path ? peek<T>(role, path) : undefined))
  const [error, setError] = useState<unknown>(null)
  const loadRef = useRef(load)
  loadRef.current = load

  const run = useCallback(() => {
    loadRef.current().then(
      (d) => {
        setData(d)
        setError(null)
      },
      (e) => setError(e),
    )
  }, [])

  useEffect(() => {
    if (!key || !path) return
    setData(peek<T>(role, path))
    run()
    const off = cache.subscribe(key, (d) => setData(d as T))
    const onShow = () => document.visibilityState === 'visible' && run()
    document.addEventListener('visibilitychange', onShow)
    return () => {
      off()
      document.removeEventListener('visibilitychange', onShow)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { data, error: data === undefined ? error : null, reload: run, setData }
}

/**
 * For screens that keep their own editable state (teacher pages): call `apply` whenever a
 * silent refresh brings changed data for this path. Pair with `peek()` for the first render.
 */
export function useLive<T>(role: Role | null, path: string | null, apply: (data: T) => void) {
  const applyRef = useRef(apply)
  applyRef.current = apply
  const key = path ? cacheKey(role, path) : null
  useEffect(() => {
    if (!key) return
    return cache.subscribe(key, (d) => applyRef.current(d as T))
  }, [key])
}
