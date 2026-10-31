/*
 * Stale-while-revalidate cache for API reads.
 *
 *  - A screen gets cached data at once (no loading), even after a reload or the next day
 *    (stored in localStorage, per login token).
 *  - If the data is older than its "fresh" window, it is checked again silently in the
 *    background. Game data first asks /game/version (a few bytes): if the content and
 *    progress versions are the same as when the data was stored, nothing is downloaded.
 *  - Otherwise the request is sent with If-None-Match; the server answers 304 (empty) when
 *    nothing changed. Only a real change replaces the data and notifies the screen, which
 *    then re-renders just what changed.
 *  - Writes (answers, teacher edits) patch or mark entries stale; they are never deleted
 *    while a screen may still show them.
 */

export interface Entry<T = unknown> {
  /** When the data was last confirmed up to date. */
  at: number
  data: T
  etag?: string
  /** Game data: "<content>|<progress>" version when stored. */
  ver?: string
}

const STORE_KEY = 'tala.cache.v2'
const MAX_AGE_DAYS = 14

const memory = new Map<string, Entry>()
const listeners = new Map<string, Set<(data: unknown) => void>>()
const inflight = new Map<string, Promise<unknown>>()

try {
  const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') as Record<string, Entry>
  const oldest = Date.now() - MAX_AGE_DAYS * 86_400_000
  for (const [k, v] of Object.entries(saved)) if (v && v.at > oldest) memory.set(k, v)
} catch {
  /* private mode or bad JSON: start empty */
}

let persistTimer: number | undefined
function persist() {
  window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(memory)))
    } catch {
      // Storage full: drop the oldest half and try once more; memory cache still works.
      const keys = [...memory.entries()].sort((a, b) => a[1].at - b[1].at).map(([k]) => k)
      keys.slice(0, Math.ceil(keys.length / 2)).forEach((k) => memory.delete(k))
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(memory)))
      } catch {
        /* give up quietly */
      }
    }
  }, 250)
}

export const cache = {
  get<T>(key: string): Entry<T> | undefined {
    return memory.get(key) as Entry<T> | undefined
  },

  set<T>(key: string, entry: Entry<T>) {
    const before = memory.get(key)
    memory.set(key, entry)
    persist()
    // Notify only when the data really changed (same JSON = no re-render).
    if (!before || JSON.stringify(before.data) !== JSON.stringify(entry.data)) {
      listeners.get(key)?.forEach((fn) => fn(entry.data))
    }
  },

  /** Keep the data but make the next read check the server again. */
  markStale(predicate: (key: string) => boolean) {
    for (const [k, e] of memory) if (predicate(k)) memory.set(k, { ...e, at: 0, ver: undefined })
    persist()
  },

  remove(predicate: (key: string) => boolean) {
    for (const k of [...memory.keys()]) if (predicate(k)) memory.delete(k)
    persist()
  },

  subscribe(key: string, fn: (data: unknown) => void): () => void {
    const set = listeners.get(key) ?? new Set()
    set.add(fn)
    listeners.set(key, set)
    return () => set.delete(fn)
  },

  /** Run `work` once per key at a time; later callers share the same promise. */
  once<T>(key: string, work: () => Promise<T>): Promise<T> {
    const running = inflight.get(key)
    if (running) return running as Promise<T>
    const p = work().finally(() => inflight.delete(key))
    inflight.set(key, p)
    return p
  },
}
