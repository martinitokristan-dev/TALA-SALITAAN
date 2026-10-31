import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState, type RefObject } from 'react'
import type { CharacterKind } from '../lib/types'
import { Character, type CharacterHandle } from './Character'
import { Facing, Loaded } from './rig'

interface Pt {
  x: number
  y: number
}

/** Size of the little 3D view that holds the character (CSS pixels). */
export const WALKER_W = 84
/**
 * Taller than the standing character (104 px) so the head never gets cut off at the top of
 * the little 3D view when the character jumps. The camera below is set so the character keeps
 * the same size and its feet stay in the same place; the extra room is all above the head.
 */
export const WALKER_H = 150
const CAM_FOV = 42.3 // 2 * atan(tan(15deg) * 150 / 104): same scale as the old 30deg / 104 px view
const CAM_Y = 0.9 // old camera (0.62) and look-at (0.46) raised by 0.28: the bottom edge stays put
const LOOK_Y = 0.74
/** How far above a level's centre the character's middle is (CSS px), for centring the view. */
export const CHAR_MID = 70
const PER_LEVEL_MS = 760 // one walk from a level to the next
const MIN_PER_LEVEL_MS = 380 // many levels at once: quicker steps, but each level still seen
const MAX_MS = 6000 // a whole stage (15 levels) never takes longer than this
const WALK_CLIP = 1.5 // walk clip speed at PER_LEVEL_MS

// Facing: up the screen = back to the viewer, down = facing the viewer, left/right = side view.

/**
 * The pupil's 3D character on the Candy-Crush level path (replaces the old initial-letter badge).
 * Stands on the current level; when the pupil comes back after finishing levels it walks
 * along the path to the new current level, the view following it, and does a little jump.
 */
export default function PathWalker({
  kind,
  points,
  from,
  to,
  scroller,
  nodeSize,
  run = false,
  onStart,
  onDone,
}: {
  kind: CharacterKind
  points: Pt[]
  from: number
  to: number
  scroller: RefObject<HTMLDivElement | null>
  nodeSize: number
  /** Run instead of walk (e.g. from Stage 1 to Stage 2): faster steps, a little longer on screen. */
  run?: boolean
  onStart?: () => void
  onDone: (index: number) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const char = useRef<CharacterHandle>(null)
  const heading = useRef(0)
  const [walking, setWalking] = useState(false)
  const [clipSpeed, setClipSpeed] = useState(WALK_CLIP) // steps follow how fast it moves
  // The walk waits until the model is loaded (first visit on a slow phone), so it is never missed.
  const [ready, setReady] = useState(false)
  // Where the character really stands now: a silent refresh or a resize must not replay a walk.
  const at = useRef<number | null>(null)

  const place = (p: Pt) => {
    const el = box.current
    if (el) el.style.transform = `translate3d(${(p.x - WALKER_W / 2).toFixed(1)}px, ${(p.y - WALKER_H - nodeSize / 2 + 22).toFixed(1)}px, 0)`
  }

  useEffect(() => {
    if (!points.length) return
    const last = points.length - 1
    const fromI = Math.max(0, Math.min(at.current ?? from, last))
    const toI = Math.max(0, Math.min(to, last))
    place(points[fromI])
    if (fromI >= toI) {
      place(points[toI])
      at.current = toI
      heading.current = 0
      setWalking(false)
      onDone(toI)
      return
    }
    if (!ready) return
    const steps = toI - fromI
    // Through every finished level: the more levels, the quicker each step (never a blur).
    const perLevel = Math.max(MIN_PER_LEVEL_MS, Math.min(PER_LEVEL_MS, MAX_MS / steps))
    // a run (to Stage 2) covers the long stretch past the sign: give it time to be seen
    const total = run ? Math.max(1600, steps * perLevel) : steps * perLevel
    setClipSpeed(Math.min(2.6, (run ? 2.4 : WALK_CLIP) * (PER_LEVEL_MS / perLevel) ** 0.6))
    let raf = 0
    let t0 = 0
    const delay = window.setTimeout(() => {
      setWalking(true)
      onStart?.()
      t0 = performance.now()
      const tick = (now: number) => {
        // the first frame's timestamp can be a little before t0: never let k go below 0
        const k = Math.max(0, Math.min(1, (now - t0) / total))
        // gentle start and stop
        const e = k * k * (3 - 2 * k)
        const pos = e * steps
        const i = Math.max(0, Math.min(steps - 1, Math.floor(pos)))
        const a = points[fromI + i]
        const b = points[fromI + i + 1]
        const f = pos - i
        const p = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }
        place(p)
        at.current = fromI + i // a restart mid-walk goes on from here
        // screen direction -> 3D heading (0 = facing the viewer, PI = back to the viewer)
        heading.current = Math.atan2(b.x - a.x, b.y - a.y)
        // the view follows the character
        const sc = scroller.current
        if (sc) sc.scrollTop = p.y - CHAR_MID - sc.clientHeight / 2 // the character in the middle
        if (k < 1) raf = requestAnimationFrame(tick)
        else {
          at.current = toI
          heading.current = 0
          setWalking(false)
          char.current?.playOnce('Jump')
          onDone(toI)
        }
      }
      raf = requestAnimationFrame(tick)
    }, 750) // after the screen's glide to the current level
    return () => {
      window.clearTimeout(delay)
      cancelAnimationFrame(raf)
      setWalking(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, points, ready])

  return (
    <div ref={box} className="lv-walker" style={{ width: WALKER_W, height: WALKER_H }} aria-hidden>
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, CAM_Y, 2.35], fov: CAM_FOV }} onCreated={({ camera }) => camera.lookAt(0, LOOK_Y, 0)} gl={{ alpha: true, antialias: true }}>
        <hemisphereLight args={['#ffffff', '#7fb069', 1.6]} />
        <directionalLight position={[2, 4, 3]} intensity={2.1} />
        <Suspense fallback={null}>
          <Facing heading={heading}>
            <Character ref={char} kind={kind} clip={walking ? 'Walk' : 'Idle'} speed={walking ? clipSpeed : 1} shadows={false} />
          </Facing>
          <Loaded onLoaded={() => setReady(true)} />
        </Suspense>
      </Canvas>
    </div>
  )
}
