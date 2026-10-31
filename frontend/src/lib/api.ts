import type {
  AnswerResponse,
  CycleProgress,
  FeedbackClip,
  Pupil,
  PupilDetail,
  PupilSummary,
  Section,
  SesyonPayload,
  Teacher,
  TeacherWord,
} from './types'
import type { CharacterKind } from './types'
import type { FeedbackClipUrls, FeedbackKind } from './feedback'
import { cache } from './cache'

// Same origin in development (Vite proxies /api to Laravel). Set VITE_API_URL for other setups.
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api'

const TOKEN_KEYS = { teacher: 'tala.teacherToken', pupil: 'tala.pupilToken' } as const
export type Role = keyof typeof TOKEN_KEYS

export const tokens = {
  get: (role: Role) => localStorage.getItem(TOKEN_KEYS[role]),
  set: (role: Role, token: string) => localStorage.setItem(TOKEN_KEYS[role], token),
  clear: (role: Role) => localStorage.removeItem(TOKEN_KEYS[role]),
}

export class ApiError extends Error {
  status: number
  errors: Record<string, string[]>
  code?: string

  constructor(status: number, message: string, errors: Record<string, string[]> = {}, code?: string) {
    super(message)
    this.status = status
    this.errors = errors
    this.code = code
  }

  /** First validation message for a field, if any. */
  field(name: string): string | undefined {
    return this.errors[name]?.[0]
  }
}

/* ── Stale-while-revalidate reads (see lib/cache.ts) ─────── */

const SECOND = 1000
const MINUTE = 60 * SECOND

/** How long data counts as fresh. After that it is still shown at once, then checked silently. */
export const FRESH = {
  consent: 10 * MINUTE,
  sections: MINUTE,
  game: 20 * SECOND, // cheap: game data first asks /game/version
  clips: 10 * MINUTE,
  teacher: 20 * SECOND,
}

/** Keys include the login token, so two pupils on one tablet never share data. */
export function cacheKey(role: Role | null, path: string) {
  const who = role ? (tokens.get(role) ?? '').slice(-16) : 'public'
  return `${role ?? 'public'}:${who}:${path}`
}
const roleOf = (key: string) => key.split(':')[0]

/** Cached data for a GET, any age. Lets screens render at once without a loading state. */
export function peek<T>(role: Role | null, path: string): T | undefined {
  return cache.get<T>(cacheKey(role, path))?.data
}

/** Keep cached data of a role but check it again on the next read. */
export function markStale(role: Role | 'public', prefix = '') {
  cache.markStale((k) => roleOf(k) === role && k.split(':').slice(2).join(':').startsWith(prefix))
}

let versionMemo: { at: number; value: Promise<string | undefined> } | null = null
/** "<content>|<progress>" for the pupil, shared by all reads for a few seconds. */
function gameVersion(): Promise<string | undefined> {
  if (versionMemo && Date.now() - versionMemo.at < 4 * SECOND) return versionMemo.value
  const value = send<{ content: string; progress: string }>('pupil', 'GET', '/game/version').then(
    (r) => (r.data ? `${r.data.content}|${r.data.progress}` : undefined),
    () => undefined,
  )
  versionMemo = { at: Date.now(), value }
  return value
}

function revalidate<T>(role: Role | null, path: string, game: boolean): Promise<T> {
  const key = cacheKey(role, path)
  return cache.once(key, async () => {
    const entry = cache.get<T>(key)
    const ver = game ? await gameVersion() : undefined
    // Same content + progress version as when stored: nothing to download.
    if (entry && ver && entry.ver === ver) {
      cache.set(key, { ...entry, at: Date.now() })
      return entry.data
    }
    const r = await send<T>(role, 'GET', path, undefined, entry?.etag)
    if (r.status === 304 && entry) {
      cache.set(key, { ...entry, at: Date.now(), ver })
      return entry.data
    }
    cache.set(key, { at: Date.now(), data: r.data as T, etag: r.etag, ver })
    return r.data as T
  })
}

/** Cached data at once (refreshed silently when stale), or the network on the first read. */
function swr<T>(role: Role | null, path: string, fresh: number, game = false): Promise<T> {
  const entry = cache.get<T>(cacheKey(role, path))
  if (entry) {
    if (Date.now() - entry.at > fresh) revalidate<T>(role, path, game).catch(() => undefined)
    return Promise.resolve(entry.data)
  }
  return revalidate<T>(role, path, game)
}

/** Put the result of an answer into the cached sesyon right away (no refetch, no loading). */
function patchSesyon(input: { cycle: number; sesyon: number; stage: number; word_id: number }, res: AnswerResponse) {
  const key = cacheKey('pupil', sesyonPath(input.cycle, input.sesyon))
  const entry = cache.get<SesyonPayload>(key)
  if (!entry) return
  const result = {
    attempts_used: res.attempts_used,
    finished: res.finished,
    is_correct: res.finished && res.correct,
    stars: res.stars,
    answer: res.finished ? (res.correct_answer?.word ?? null) : null,
  }
  const data = structuredClone(entry.data)
  const fix = <I extends { word_id: number; result: unknown }>(items: I[]) =>
    items.forEach((it) => it.word_id === input.word_id && (it.result = result))
  if (input.stage === 1) fix(data.stage1)
  else if (data.cycle === 2) (data.stage2 as { sentences: { word_id: number; result: unknown }[] }[]).forEach((g) => fix(g.sentences))
  else fix(data.stage2 as { word_id: number; result: unknown }[])
  cache.set(key, { ...entry, data, at: Date.now() })
}

interface Sent<T> {
  status: number
  data: T | null
  etag?: string
}

async function request<T>(role: Role | null, method: string, path: string, body?: unknown): Promise<T> {
  if (method !== 'GET') {
    if (role === 'teacher' || path.startsWith('/teacher')) {
      // Content or sections changed: on this device every cached read is checked again.
      markStale('teacher')
      markStale('pupil')
      markStale('public')
    }
    if (path === '/pupil/login' || path === '/pupil/logout') cache.remove((k) => roleOf(k) === 'pupil')
  }
  return (await send<T>(role, method, path, body)).data as T
}

async function send<T>(role: Role | null, method: string, path: string, body?: unknown, ifNoneMatch?: string): Promise<Sent<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (ifNoneMatch) headers['If-None-Match'] = ifNoneMatch
  const token = role ? tokens.get(role) : null
  if (token) headers.Authorization = `Bearer ${token}`

  let payload: BodyInit | undefined
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let res: Response
  try {
    // no-store: our own cache (lib/cache.ts) decides; the browser must pass 304s through to us.
    res = await fetch(`${BASE}${path}`, { method, headers, body: payload, cache: 'no-store' })
  } catch {
    throw new ApiError(0, 'Hindi maabot ang server. Siguraduhing tumatakbo ang backend (php artisan serve).')
  }
  if (res.status === 304) return { status: 304, data: null }
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  // The Vite proxy answers 500/502 with no JSON when Laravel is not running.
  if (!res.ok && data === null && res.status >= 500) {
    throw new ApiError(res.status, 'Hindi maabot ang server. Siguraduhing tumatakbo ang backend (php artisan serve).')
  }

  if (!res.ok) {
    if (res.status === 401 && role) tokens.clear(role)
    throw new ApiError(res.status, data?.message ?? 'May problema sa koneksyon.', data?.errors, data?.code)
  }
  return { status: res.status, data: data as T, etag: res.headers.get('ETag') ?? undefined }
}

export const publicApi = {
  consent: () => swr<{ consent_text: string }>(null, '/consent', FRESH.consent),
}

export const pupilApi = {
  sections: () => swr<{ sections: { id: number; name: string }[] }>(null, '/sections', FRESH.sections),
  login: (section_id: number, name: string) =>
    request<{ token: string; pupil: Pupil; progress: CycleProgress[] }>(null, 'POST', '/pupil/login', {
      section_id,
      name,
      consented: true,
    }),
  me: () => request<{ pupil: Pupil }>('pupil', 'GET', '/pupil/me'),
  setCharacter: (character: CharacterKind) => request<{ pupil: Pupil }>('pupil', 'POST', '/pupil/character', { character }),
  logout: () => request<{ ok: true }>('pupil', 'POST', '/pupil/logout'),
  progress: () => swr<{ cycles: CycleProgress[] }>('pupil', '/game/progress', FRESH.game, true),
  sesyon: (cycle: number, sesyon: number) => swr<SesyonPayload>('pupil', sesyonPath(cycle, sesyon), FRESH.game, true),
  answer: async (input: { cycle: number; sesyon: number; stage: number; word_id: number; answer: string }) => {
    const res = await request<AnswerResponse>('pupil', 'POST', '/game/answer', input)
    versionMemo = null // progress changed on the server
    // The level path shows the new stars at once; the map re-checks quietly when shown.
    patchSesyon(input, res)
    markStale('pupil', '/game/progress')
    if (res.stage_complete || res.sesyon_complete) markStale('pupil', '/game/cycles')
    return res
  },
  feedbackClips: () => swr<FeedbackClipUrls>('pupil', '/game/feedback-clips', FRESH.clips),
}

export const sesyonPath = (cycle: number, sesyon: number) => `/game/cycles/${cycle}/sesyons/${sesyon}`

export const teacherApi = {
  login: (email: string, password: string) =>
    request<{ token: string; teacher: Teacher }>(null, 'POST', '/teacher/login', { email, password }),
  me: () => swr<{ teacher: Teacher }>('teacher', '/teacher/me', FRESH.teacher),
  logout: () => request<{ ok: true }>('teacher', 'POST', '/teacher/logout'),

  words: () =>
    swr<{ words_per_set: number; sets: Record<'A' | 'B', TeacherWord[]> }>('teacher', '/teacher/words', FRESH.teacher),
  createWord: (form: FormData) => request<{ word: TeacherWord }>('teacher', 'POST', '/teacher/words', form),
  updateWord: (id: number, form: FormData) => request<{ word: TeacherWord }>('teacher', 'POST', `/teacher/words/${id}`, form),
  deleteWord: (id: number) => request<{ ok: true }>('teacher', 'DELETE', `/teacher/words/${id}`),

  setDistractor: (id: number, slot: number, form: FormData) =>
    request<{ word: TeacherWord }>('teacher', 'POST', `/teacher/words/${id}/distractors/${slot}`, form),
  deleteDistractor: (id: number, slot: number) =>
    request<{ word: TeacherWord }>('teacher', 'DELETE', `/teacher/words/${id}/distractors/${slot}`),
  saveSentence: (id: number, sentence: string) =>
    request<{ word: TeacherWord }>('teacher', 'PUT', `/teacher/words/${id}/sentence`, { sentence }),
  saveSituation: (id: number, form: FormData) =>
    request<{ word: TeacherWord }>('teacher', 'POST', `/teacher/words/${id}/situation`, form),

  settings: () => swr<{ consent_text: string }>('teacher', '/teacher/settings', FRESH.teacher),
  saveSettings: (consent_text: string) => request<{ consent_text: string }>('teacher', 'PUT', '/teacher/settings', { consent_text }),

  deleteSentence: (id: number) => request<{ word: TeacherWord }>('teacher', 'DELETE', `/teacher/words/${id}/sentence`),
  deleteSituation: (id: number) => request<{ word: TeacherWord }>('teacher', 'DELETE', `/teacher/words/${id}/situation`),

  sections: () => swr<{ sections: Section[] }>('teacher', '/teacher/sections', FRESH.teacher),
  addSection: (name: string) => request<{ section: Section }>('teacher', 'POST', '/teacher/sections', { name }),
  updateSection: (id: number, input: { name?: string; is_active?: boolean; is_demo?: boolean }) =>
    request<{ section: Section }>('teacher', 'PUT', `/teacher/sections/${id}`, input),
  deleteSection: (id: number) => request<{ ok: true }>('teacher', 'DELETE', `/teacher/sections/${id}`),

  pupils: (sectionId?: number) =>
    // Pupils' progress changes while they play: short fresh window, silent refresh (ETag keeps it cheap).
    swr<{ pupils: PupilSummary[] }>('teacher', `/teacher/pupils${sectionId ? `?section_id=${sectionId}` : ''}`, 8 * SECOND),
  pupil: (id: number) => swr<PupilDetail>('teacher', `/teacher/pupils/${id}`, 8 * SECOND),
  resetPupil: (id: number) => request<{ ok: true }>('teacher', 'POST', `/teacher/pupils/${id}/reset`),
  deletePupil: (id: number) => request<{ ok: true }>('teacher', 'DELETE', `/teacher/pupils/${id}`),

  clips: () => swr<{ clips: FeedbackClip[] }>('teacher', '/teacher/feedback-clips', FRESH.teacher),
  addClip: (form: FormData) => request<{ clip: FeedbackClip }>('teacher', 'POST', '/teacher/feedback-clips', form),
  toggleClip: (id: number) => request<{ clip: FeedbackClip }>('teacher', 'POST', `/teacher/feedback-clips/${id}/toggle`),
  /** Move a clip to another moment (e.g. it was recorded under the wrong one). */
  moveClip: (id: number, kind: FeedbackKind) => request<{ clip: FeedbackClip }>('teacher', 'PUT', `/teacher/feedback-clips/${id}`, { kind }),
  deleteClip: (id: number) => request<{ ok: true }>('teacher', 'DELETE', `/teacher/feedback-clips/${id}`),
}

export const api = { ping: () => request<{ status: string }>(null, 'GET', '/ping') }
