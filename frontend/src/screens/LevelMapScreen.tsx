import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { PixelArt, spriteUrl } from '../art/PixelArt'
import { CLOUD, CLOUD_PALETTE, TREASURE_CLOSED, TREASURE_OPEN, TREASURE_PALETTE } from '../art/sprites'
import { ApiError, pupilApi, sesyonPath, tokens } from '../lib/api'
import { useApi } from '../lib/useApi'
import { flow } from '../lib/flow'
import { buildLevels, STAGE_TASK, type Level } from '../lib/levels'
import type { SesyonPayload } from '../lib/types'
import { Icon } from '../ui/Icon'
import { PixelButton } from '../ui/PixelButton'
import { Signpost } from '../ui/Signpost'
import { Star, StarArc, StarDefs } from '../ui/StarRow'
import { hasWebGL } from '../lib/webgl'
import { DECOR_KINDS, nextSesyon, scatterDecor, smoothPath, type Pt } from './levelPath'

// Layout of the winding path (CSS pixels).
const GAP = 150 // between two levels: room for the character to walk
const STAGE_BREAK = 170 // extra room for the "STAGE 2" sign
const TOP_PAD = 450 // room for the header, the treasure chest and the character on the last level
const SIGN_W = 132 // stage signpost (see .signpost)
const SIGN_H = 112
const GOAL_TOP = 140 // the treasure chest, well above the last level and its character
const BOTTOM_PAD = 170
const NODE = 66

/** Candy-Crush-like colours per stage. */
const STAGE_COLORS = {
  1: [
    ['#7cc8ff', '#1d7fe0', '#0f4f99'],
    ['#6ee8c5', '#14a989', '#0b6a55'],
  ],
  2: [
    ['#ffb86b', '#f07a12', '#9c4a00'],
    ['#ff9cc8', '#e43f8a', '#93204f'],
  ],
} as const

// The 3D character on the path (three.js loads only here, not with the first screens).
const PathWalker = lazy(() => import('../map3d/PathWalker'))

/** Image URL of each meadow sprite (made once). */
const decorUrls = DECOR_KINDS.map((k) => spriteUrl(k.rows, k.palette, true))

/** A fresh screen per sesyon (going to the next sesyon starts its own walk and scroll). */
export function LevelMapScreen() {
  const { cycle, sesyon } = useParams()
  return <LevelPath key={`${cycle}.${sesyon}`} />
}

/**
 * Inside a castle sesyon: a winding Candy Crush style path with one level per question.
 * Levels 1..N are Stage 1 (jumbled letters), N+1..2N are Stage 2 (cycle-specific).
 */
function LevelPath() {
  const { cycle: c, sesyon: s } = useParams()
  const cycle = Number(c)
  const sesyon = Number(s)
  const navigate = useNavigate()

  // Cached sesyon shows at once (no loading on back); a silent check updates only what changed.
  const signedIn = !!tokens.get('pupil')
  const api = useApi<SesyonPayload>('pupil', signedIn ? sesyonPath(cycle, sesyon) : null, () => pupilApi.sesyon(cycle, sesyon))
  const data = api.data ?? null
  const error = api.error
    ? api.error instanceof ApiError
      ? { message: api.error.message, code: api.error.code }
      : { message: 'May problema. Subukang muli.' }
    : null
  const [width, setWidth] = useState(420)
  const [picked, setPicked] = useState<Level | null>(null)
  const [shake, setShake] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const scroller = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)

  const [viewW, setViewW] = useState(420)
  useLayoutEffect(() => {
    const el = track.current
    const sc = scroller.current
    if (!el || !sc) return
    const ro = new ResizeObserver(() => {
      setWidth(el.clientWidth)
      setViewW(sc.clientWidth)
    })
    ro.observe(el)
    ro.observe(sc)
    return () => ro.disconnect()
  }, [data])

  const levels = useMemo(() => (data ? buildLevels(data) : []), [data])
  const stage1Count = data?.stage1.length ?? 0

  // Positions: level 1 at the bottom, winding upwards.
  const layout = useMemo(() => {
    const n = levels.length
    const height = TOP_PAD + Math.max(0, n - 1) * GAP + (n > stage1Count && stage1Count > 0 ? STAGE_BREAK : 0) + BOTTOM_PAD
    const amp = Math.min(width * 0.3, 160)
    const pts = levels.map((l, i) => {
      const extra = l.stage === 2 && stage1Count > 0 ? STAGE_BREAK : 0
      return { x: width / 2 + amp * Math.sin(i * 0.78 + 0.4), y: height - BOTTOM_PAD - i * GAP - extra }
    })
    const breakY = stage1Count > 0 && n > stage1Count ? (pts[stage1Count - 1].y + pts[stage1Count].y) / 2 : null
    return { height, pts, amp, breakY }
  }, [levels, width, stage1Count])

  // Signpost foot positions: beside the road (on the roomier side) where each stage begins.
  const signs = useMemo(() => {
    const out: { stage: 1 | 2; x: number; y: number }[] = []
    const beside = (p: Pt) => {
      const x = p.x > width / 2 ? p.x - 118 : p.x + 118
      return Math.max(SIGN_W / 2 + 6, Math.min(width - SIGN_W / 2 - 6, x))
    }
    if (layout.pts.length) out.push({ stage: 1, x: beside(layout.pts[0]), y: layout.pts[0].y + 34 })
    if (layout.breakY !== null) {
      const a = layout.pts[stage1Count - 1]
      const b = layout.pts[stage1Count]
      out.push({ stage: 2, x: beside({ x: (a.x + b.x) / 2, y: layout.breakY }), y: layout.breakY + SIGN_H / 2 })
    }
    return out
  }, [layout, width, stage1Count])

  const decor = useMemo(() => {
    // trees fill the whole screen width, also on wide (or zoomed-out) screens
    const margin = Math.min(1000, Math.max(0, (viewW - width) / 2))
    const keepOut = [
      { x: width / 2 - 120, y: GOAL_TOP - 50, w: 240, h: 230 }, // chest + label
      ...signs.map((s) => ({ x: s.x - SIGN_W / 2 - 6, y: s.y - SIGN_H - 6, w: SIGN_W + 12, h: SIGN_H + 12 })),
    ]
    return scatterDecor(cycle * 31 + sesyon * 7, layout.pts, width, layout.height, margin, keepOut)
  }, [layout, width, viewW, cycle, sesyon, signs])

  const currentIndex = levels.findIndex((l) => l.status === 'current')
  const doneCount = levels.filter((l) => l.status === 'done').length
  const stars = levels.reduce((sum, l) => sum + l.result.stars, 0)
  const maxStars = levels.length * (data?.max_stars_per_item ?? 5)
  const allDone = levels.length > 0 && doneCount === levels.length

  // Where the character stands: the current level (or the last one when all are done).
  // It walks from where it stood last time on this path to the new current level.
  const [webgl] = useState(hasWebGL)
  const walkerKey = `tala.lvpos.${cycle}.${sesyon}`
  const walkerTo = levels.length ? (allDone ? levels.length - 1 : Math.max(0, currentIndex)) : -1
  const [walkerFrom] = useState(() => {
    const saved = sessionStorage.getItem(walkerKey)
    return saved === null ? -1 : Number(saved)
  })
  // It walks through every level finished since it last stood here (also up to the last level
  // when all are done). Coming back again later it just stands there (the walk is not replayed).
  const from = walkerFrom < 0 || walkerFrom > walkerTo ? walkerTo : walkerFrom
  // Stage 1 just finished: the character runs past the "STAGE 2" sign to the first Stage 2 level.
  const toStage2 = stage1Count > 0 && from < stage1Count && walkerTo >= stage1Count
  const [stageBanner, setStageBanner] = useState(false)

  const fullPath = useMemo(() => smoothPath(layout.pts), [layout])
  const progressPath = useMemo(() => {
    const until = allDone ? layout.pts.length : currentIndex + 1
    return smoothPath(layout.pts.slice(0, Math.max(0, until)))
  }, [layout, currentIndex, allDone])

  // Start at the bottom, then glide up to the current level (once: a silent refresh must not scroll).
  const glided = useRef(false)
  useEffect(() => {
    const el = scroller.current
    if (!el || !levels.length || glided.current) return
    glided.current = true
    el.scrollTop = el.scrollHeight
    // to where the character stands now (it then walks on, the view following it)
    // (the character in the middle of the screen; 70 = its middle above the level, see PathWalker CHAR_MID)
    const target = layout.pts[Math.max(0, Math.min(from, layout.pts.length - 1))].y - 70 - el.clientHeight / 2
    const t = window.setTimeout(() => el.scrollTo({ top: Math.max(0, target), behavior: 'smooth' }), 450)
    return () => window.clearTimeout(t)
    // Only when the data first arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  if (!tokens.get('pupil')) return <Navigate to="/" replace />

  function tap(level: Level) {
    if (level.status === 'locked') {
      setShake(level.number)
      window.setTimeout(() => setShake(null), 450)
      const cur = levels[currentIndex]
      setToast(cur ? `Tapusin muna ang Level ${cur.number}!` : 'Naka-lock pa ito.')
      return
    }
    setPicked(level)
  }

  const header = (
    <header className="lv-header">
      <Link to="/mapa" className="lv-back">
        <Icon name="back" size={18} />
        <span>MAPA</span>
      </Link>
      <div className="lv-banner">
        <span className="lv-banner-title">{data?.cycle_title ?? '…'}</span>
        <span className="lv-banner-sub">
          SESYON {sesyon}
          {levels.length > 0 && (
            <>
              {' '}
              · {doneCount}/{levels.length}
            </>
          )}
        </span>
      </div>
      <div className="lv-stars-total" aria-label={`${stars} sa ${maxStars} bituin`}>
        <Star filled size={22} />
        <span>
          {stars}
          <small>/{maxStars}</small>
        </span>
      </div>
    </header>
  )

  if (error) {
    const msg =
      error.code === 'locked'
        ? 'Naka-lock pa ang sesyon na ito. Tapusin muna ang nauna.'
        : error.code === 'not_ready'
          ? 'Hindi pa handa ang sesyon na ito. Kulang pa ang laman na ilalagay ng guro.'
          : error.message
    return (
      <div className="lv-screen">
        {header}
        <div className="lv-message">
          <p>{msg}</p>
          <PixelButton size="small" onClick={() => navigate('/mapa')}>
            BUMALIK SA MAPA
          </PixelButton>
        </div>
      </div>
    )
  }

  return (
    <div className="lv-screen">
      <StarDefs />
      {header}

      <div className="lv-scroller" ref={scroller}>
        <div className="lv-track" ref={track} style={{ height: data ? layout.height : '100%' }}>
          {!data && <div className="lv-loading">Sandali lang…</div>}

          {data && (
            <>
              {/* Drifting clouds near the top (end of the path) */}
              <PixelArt rows={CLOUD} palette={CLOUD_PALETTE} className="lv-cloud lv-cloud-1" />
              <PixelArt rows={CLOUD} palette={CLOUD_PALETTE} className="lv-cloud lv-cloud-2" />

              {/* Goal: treasure chest after the last level */}
              {allDone ? (
                <button
                  type="button"
                  className="lv-goal is-done"
                  style={{ left: width / 2, top: GOAL_TOP }}
                  onClick={() => navigate(nextSesyon(cycle, sesyon))}
                  aria-label={cycle === 3 && sesyon === 3 ? 'Tapos na! Bumalik sa mapa' : 'Tapos na! Susunod na sesyon'}
                >
                  <div className="lv-goal-glow is-open" />
                  <PixelArt rows={TREASURE_OPEN} palette={TREASURE_PALETTE} className="lv-goal-chest is-open" />
                  <span className="lv-goal-label">
                    TAPOS NA!
                    <small>{cycle === 3 && sesyon === 3 ? 'Bumalik sa mapa ▶' : 'Susunod na sesyon ▶'}</small>
                  </span>
                </button>
              ) : (
                <div className="lv-goal" style={{ left: width / 2, top: GOAL_TOP }}>
                  <div className="lv-goal-glow" />
                  <PixelArt rows={TREASURE_CLOSED} palette={TREASURE_PALETTE} className="lv-goal-chest" />
                  <span className="lv-goal-label">GANTIMPALA</span>
                </div>
              )}

              {/* Meadow: trees, bushes, rocks and flowers around (never on) the path */}
              {/* One <img> per sprite (a few shared image URLs, ground shadow baked in): hundreds of
                  them stay light to draw and scroll on old tablets. */}
              {decor.map((d, i) => {
                const K = DECOR_KINDS[d.kind]
                const px = d.w / K.rows[0].length // size of one pixel
                return (
                  <img
                    key={i}
                    className="lv-decor"
                    src={decorUrls[d.kind]}
                    alt=""
                    draggable={false}
                    style={{ left: d.x - d.w / 2, top: d.y - px * K.rows.length, width: d.w, height: px * (K.rows.length + 1) }}
                  />
                )
              })}

              {/* The candy-stripe path */}
              <svg className="lv-path" width={width} height={layout.height} aria-hidden>
                <path d={fullPath} className="lv-path-edge" />
                <path d={fullPath} className="lv-path-base" />
                <path d={fullPath} className="lv-path-stripes" />
                {progressPath && (
                  <>
                    <path d={progressPath} className="lv-path-done" pathLength={1} />
                    <path d={progressPath} className="lv-path-done-stripes" />
                  </>
                )}
              </svg>

              {/* Stage signposts stuck in the ground beside the road, where each stage starts */}
              {signs.map((s) => (
                <Signpost
                  key={s.stage}
                  stage={s.stage}
                  task={STAGE_TASK[cycle]?.[s.stage]}
                  style={{ left: s.x - SIGN_W / 2, top: s.y - SIGN_H }}
                />
              ))}

              {/* Level nodes */}
              {levels.map((l, i) => {
                const p = layout.pts[i]
                const palette = STAGE_COLORS[l.stage][(l.indexInStage - 1) % 2]
                const size = l.status === 'current' ? NODE + 14 : NODE
                const delay = Math.min(Math.abs(i - Math.max(0, currentIndex)), 14) * 45
                return (
                  <div
                    key={l.number}
                    className={`lv-node-wrap is-${l.status} ${shake === l.number ? 'is-shaking' : ''}`}
                    style={{ left: p.x - size / 2, top: p.y - size / 2, width: size, animationDelay: `${delay}ms` }}
                  >
                    {l.result.stars === 5 && <div className="lv-crown" aria-hidden />}
                    <button
                      type="button"
                      className="lv-node"
                      style={
                        {
                          width: size,
                          height: size,
                          '--c1': palette[0],
                          '--c2': palette[1],
                          '--c3': palette[2],
                        } as CSSProperties
                      }
                      onClick={() => tap(l)}
                      aria-label={`Level ${l.number}${l.status === 'locked' ? ', naka-lock' : l.status === 'done' ? `, ${l.result.stars} bituin` : ', susunod'}`}
                    >
                      <span className="lv-node-num">{l.number}</span>
                      {l.status === 'locked' && (
                        <span className="lv-node-lock">
                          <Icon name="lock" size={12} />
                        </span>
                      )}
                    </button>
                    {l.status === 'done' && <StarArc stars={l.result.stars} />}
                  </div>
                )
              })}

              {/* The pupil's 3D character on the current level */}
              {webgl && walkerTo >= 0 && (
                <Suspense fallback={null}>
                  <PathWalker
                    kind={flow.character()}
                    points={layout.pts}
                    from={from}
                    to={walkerTo}
                    scroller={scroller}
                    nodeSize={NODE + 14}
                    run={toStage2}
                    onStart={() => toStage2 && setStageBanner(true)}
                    onDone={(i) => {
                      sessionStorage.setItem(walkerKey, String(i))
                      if (stageBanner || toStage2) window.setTimeout(() => setStageBanner(false), 1400)
                    }}
                  />
                </Suspense>
              )}
            </>
          )}
        </div>
      </div>

      {stageBanner && (
        <div className="lv-stage-banner" role="status">
          <span>PAPUNTA NA SA STAGE 2!</span>
          <small>Tapos na ang Stage 1. {STAGE_TASK[cycle]?.[2]}</small>
        </div>
      )}

      {toast && (
        <div className="lv-toast" role="status">
          {toast}
        </div>
      )}

      {picked && data && (
        <LevelPopup
          level={picked}
          cycle={cycle}
          onClose={() => setPicked(null)}
          onPlay={() => navigate(`/laro/${cycle}/${sesyon}?level=${picked.number}`)}
          maxStars={data.max_stars_per_item}
          maxAttempts={data.max_attempts}
        />
      )}
    </div>
  )
}

function LevelPopup({
  level,
  cycle,
  onClose,
  onPlay,
  maxStars,
  maxAttempts,
}: {
  level: Level
  cycle: number
  onClose: () => void
  onPlay: () => void
  maxStars: number
  maxAttempts: number
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const done = level.status === 'done'

  return (
    <div className="lv-modal" role="dialog" aria-modal="true" aria-labelledby="lv-modal-title" onClick={onClose}>
      <div className="lv-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="lv-modal-ribbon">
          <span id="lv-modal-title">LEVEL {level.number}</span>
        </div>
        <p className="lv-modal-stage">
          STAGE {level.stage} · Tanong {level.indexInStage}
        </p>
        <p className="lv-modal-task">{STAGE_TASK[cycle]?.[level.stage]}</p>
        <div className="lv-modal-stars">
          {Array.from({ length: maxStars }, (_, i) => (
            <span key={i} style={{ animationDelay: `${150 + i * 90}ms` }}>
              <Star filled={done && i < level.result.stars} size={40} />
            </span>
          ))}
        </div>
        {done ? (
          <p className="lv-modal-note">
            {level.result.stars > 0 ? `Nakakuha ka ng ${level.result.stars} bituin!` : 'Kaya mo ʼyan sa susunod!'}
          </p>
        ) : (
          <p className="lv-modal-note">
            May {maxAttempts} subok ka. Tama sa unang subok = {maxStars} bituin!
          </p>
        )}
        <div className="lv-modal-actions">
          {done ? (
            <PixelButton size="small" onClick={onClose}>
              SIGE
            </PixelButton>
          ) : (
            <PixelButton size="small" mushroom onClick={onPlay}>
              LARO NA!
            </PixelButton>
          )}
        </div>
        <button type="button" className="lv-modal-close" onClick={onClose} aria-label="Isara">
          <Icon name="close" size={14} />
          <span>ISARA</span>
        </button>
      </div>
    </div>
  )
}
