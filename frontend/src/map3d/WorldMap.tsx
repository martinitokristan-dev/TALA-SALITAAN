import { OrbitControls, PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import type { ComponentRef } from 'react'

type OrbitControlsImpl = ComponentRef<typeof OrbitControls>
import type { CharacterKind, CycleProgress, SesyonProgress } from '../lib/types'
import { Character, type CharacterHandle } from './Character'
import { Icon } from '../ui/Icon'
import { Star } from '../ui/StarRow'
import { Castle, CastleLabel, moundHeightAt } from './Castle'
import { Clouds, Ground, Scenery, StonePath } from './World'

type V3 = [number, number, number]

const FLAG_COLORS = ['#e8302a', '#1d7fe0', '#8a4dff']

/**
 * Layout from the sketch: Cycle 1 top-left, Cycle 2 bottom-middle, Cycle 3 top-right,
 * joined by a dotted path shaped like a U. Portrait screens pull the castles closer.
 */
function useLayout(aspect: number) {
  return useMemo(() => {
    const portrait = aspect < 1
    // roomy: a good walk between the three maps
    const sx = portrait ? 4.8 : 8.8
    const top = portrait ? -6.6 : -4.6
    const bottom = portrait ? 4.8 : 3.8
    const scale = portrait ? 0.8 : 1
    const castles: V3[] = [
      [-sx, 0, top],
      [0, 0, bottom],
      [sx, 0, top],
    ]
    const mid = (top + bottom) / 2
    // The road stays on the meadow: it starts and ends just outside the buildings' mounds
    // (foot = 3.1 wide, 2.23 deep, see Castle.tsx) and goes AROUND the front of map 2's mound.
    const out = 3.85 * scale // side clearance from a mound's centre (foot + the road's half width)
    const front = 2.6 * scale // front clearance (the mound is shallower front to back)
    const legA: V3[] = [
      [castles[0][0] + 0.5 * scale, 0, top + front],
      [-sx * 0.62, 0, mid + 0.6],
      [-sx * 0.36, 0, bottom - 0.2],
      [-out, 0, bottom + 0.3],
      [-out * 0.72, 0, bottom + front * 0.78],
    ]
    const legB: V3[] = [
      [out * 0.72, 0, bottom + front * 0.78],
      [out, 0, bottom + 0.3],
      [sx * 0.36, 0, bottom - 0.2],
      [sx * 0.62, 0, mid + 0.6],
      [castles[2][0] - 0.5 * scale, 0, top + front],
    ]
    // Higher and farther than before, so the whole map fits with room around it.
    const view = portrait ? { distance: 42, polar: 0.62 } : { distance: 33, polar: 0.7 }
    return { castles, legA, legB, scale, view, portrait }
  }, [aspect])
}

/* Camera limits. Polar angle is measured from straight above:
 * 0.3 rad = almost top-down, 1.4 rad = about 80°: low enough to see the character standing
 * from the front, but always above the ground (never under the map). */
const MIN_POLAR = 0.3
const MAX_POLAR = 1.4
/** The camera never goes lower than this above the meadow (the hills far away included). */
const MIN_CAMERA_Y = 1.6
/** Height of the character's middle (what the camera looks at). */
const LOOK_Y = 1.1
const CENTER = new THREE.Vector3(0, 0, -0.4)

/**
 * 360° map that always keeps the pupil's character in the middle of the screen: while it
 * walks (closely), while it stands at a map, and after turning or zooming. Drag to turn
 * around and tilt down to a front view, pinch or scroll to zoom, no panning. The turn and
 * tilt the pupil chose are kept (the camera never spins back on its own).
 */
function MapControls({
  view,
  focused,
  portrait,
  character,
  walking,
}: {
  view: { distance: number; polar: number }
  /** A map's sesyon sheet is open (zoom in a little). */
  focused: boolean
  portrait: boolean
  /** Where the character stands right now (written by the scene every frame). */
  character: RefObject<THREE.Vector3 | null>
  walking: RefObject<boolean>
}) {
  const controls = useRef<OrbitControlsImpl>(null)
  const { camera } = useThree()
  // How far the camera should glide to (null = the pupil's zoom is kept).
  const zoomGoal = useRef<number | null>(null)
  const intro = useRef(true) // the first glide also eases the tilt to the default view
  const started = useRef(false)
  const wasWalking = useRef(false)
  const tmp = useMemo(() => ({ target: new THREE.Vector3(), off: new THREE.Vector3(), sph: new THREE.Spherical() }), [])

  useEffect(() => {
    if (!started.current) {
      // Start high and far away above the character, then glide in.
      const at = character.current ?? CENTER
      const off = new THREE.Vector3().setFromSphericalCoords(view.distance * 1.5, view.polar * 0.7, 0)
      camera.position.set(at.x, LOOK_Y, at.z).add(off)
      controls.current?.target.set(at.x, LOOK_Y, at.z)
      started.current = true
    }
    zoomGoal.current = focused ? (portrait ? 19 : 16) : view.distance
  }, [focused, view, camera, portrait, character])

  useFrame((_, dt) => {
    const c = controls.current
    const at = character.current
    if (!c || !at) return
    const isWalking = !!walking.current
    if (isWalking && !wasWalking.current) zoomGoal.current = portrait ? 20 : 17
    if (!isWalking && wasWalking.current) zoomGoal.current = focused ? (portrait ? 19 : 16) : null
    wasWalking.current = isWalking

    // The character stays in the middle: the camera moves along with it (same turn, tilt and zoom).
    tmp.target.set(at.x, at.y + LOOK_Y, at.z)
    const before = c.target.clone()
    c.target.lerp(tmp.target, 1 - Math.exp(-dt * (isWalking ? 10 : 6)))
    camera.position.add(tmp.off.subVectors(c.target, before))

    tmp.sph.setFromVector3(tmp.off.subVectors(camera.position, c.target))
    const g = zoomGoal.current
    if (g !== null) {
      const k = 1 - Math.exp(-dt * 2.4)
      tmp.sph.radius += (g - tmp.sph.radius) * k
      if (intro.current) tmp.sph.phi += (THREE.MathUtils.clamp(view.polar, MIN_POLAR, MAX_POLAR) - tmp.sph.phi) * k * 0.6
      if (Math.abs(tmp.sph.radius - g) < 0.05) {
        zoomGoal.current = null
        intro.current = false
      }
    }
    // never below the meadow, whatever the tilt and zoom
    const groundPhi = Math.acos(THREE.MathUtils.clamp((MIN_CAMERA_Y - c.target.y) / tmp.sph.radius, -1, 1))
    tmp.sph.phi = THREE.MathUtils.clamp(tmp.sph.phi, MIN_POLAR, Math.min(MAX_POLAR, groundPhi))
    camera.position.copy(c.target).add(tmp.off.setFromSpherical(tmp.sph))
    c.update()
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.55}
      zoomSpeed={0.6}
      minPolarAngle={MIN_POLAR}
      maxPolarAngle={MAX_POLAR}
      minDistance={7}
      maxDistance={portrait ? 54 : 45}
      // The pupil takes over the zoom: stop any zoom glide so the camera does not fight the finger.
      onStart={() => {
        zoomGoal.current = null
        intro.current = false
      }}
    />
  )
}

const STOP_KEY = 'tala.mapStop'
const CHAR_SCALE = 1.8
/** Height (times the layout scale) where a building's name tag floats. */
const LABEL_HEIGHT = 3.6
/** Model walking speed at scale 1 and clip speed 1 (two steps per 0.83 s). */
const MODEL_WALK_SPEED = 0.6

/** Which map the character should stand at when the map opens. */
function startStop(cycles: CycleProgress[]): number {
  const saved = Number(sessionStorage.getItem(STOP_KEY))
  if (saved >= 1 && saved <= cycles.length && cycles[saved - 1]?.status !== 'locked') return saved
  const current = cycles.find((c) => c.status === 'unlocked')
  if (current) return current.cycle
  const open = cycles.filter((c) => c.status !== 'locked')
  return open.length ? open[open.length - 1].cycle : 1
}

function Scene({
  cycles,
  focusCycle,
  labels,
  lite,
  character,
  selectRef,
  onArrive,
  onWalkStart,
  onPick,
}: {
  cycles: CycleProgress[]
  focusCycle: number | null
  labels: RefObject<(HTMLDivElement | null)[]>
  lite: boolean
  character: CharacterKind
  /** Filled by the scene: walk to a map (or open it when already there). */
  selectRef: RefObject<((c: CycleProgress) => void) | null>
  onArrive: (c: CycleProgress) => void
  onWalkStart: () => void
  /** Building tapped (the parent checks drag / lock, then calls selectRef). */
  onPick: (c: CycleProgress) => void
}) {
  const { size, camera } = useThree()
  const L = useLayout(size.width / size.height)
  const status = (n: number) => cycles[n - 1]?.status ?? 'locked'

  /* ── The character's road: map 1 → front of map 2 → map 3, along the stone path ── */
  const road = useMemo(() => {
    const front2: V3 = [0, 0, L.castles[1][2] + 2.75 * L.scale] // just in front of map 2's mound
    const pts = [...L.legA, front2, ...L.legB].map((p) => new THREE.Vector3(p[0], 0.06, p[2]))
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
    // arc-length position (0..1) of each map's stop
    const samples = curve.getSpacedPoints(400)
    const target = new THREE.Vector3(front2[0], 0.06, front2[2])
    let best = 0
    samples.forEach((p, i) => p.distanceTo(target) < samples[best].distanceTo(target) && (best = i))
    return { curve, length: curve.getLength(), stops: [0, best / 400, 1] }
  }, [L])

  /** Solid ground: the meadow (0) or a building's mound, whichever is higher there. */
  const groundAt = useMemo(
    () => (x: number, z: number) => Math.max(0, ...L.castles.map((c) => moundHeightAt(x, z, c, L.scale))),
    [L],
  )

  const char = useRef<CharacterHandle>(null)
  const follow = useRef<THREE.Vector3 | null>(null) // where the character stands now
  const walkingRef = useRef(false)
  const [walking, setWalking] = useState(false)
  const [walkSpeed, setWalkSpeed] = useState(1)
  const at = useRef({ u: road.stops[startStop(cycles) - 1], cycle: startStop(cycles) })
  const walk = useRef<{ from: number; to: number; t0: number; dur: number; target: CycleProgress } | null>(null)
  const heading = useRef(0)
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), t: new THREE.Vector3() }), [])

  // Re-place the character when the layout changes (e.g. rotating the tablet).
  useEffect(() => {
    at.current.u = road.stops[at.current.cycle - 1]
  }, [road])

  function arrive() {
    const w = walk.current
    if (!w) return
    walk.current = null
    at.current = { u: w.to, cycle: w.target.cycle }
    sessionStorage.setItem(STOP_KEY, String(w.target.cycle))
    setWalking(false)
    onArrive(w.target)
    char.current?.playOnce('Wave')
  }

  selectRef.current = (c: CycleProgress) => {
    // Tapping again while walking: arrive right away (no waiting).
    if (walk.current) {
      const target = walk.current.target
      arrive()
      if (target.cycle === c.cycle) return
    }
    const to = road.stops[c.cycle - 1]
    const dist = Math.abs(to - at.current.u) * road.length
    if (dist < 0.05) {
      onArrive(c)
      char.current?.playOnce('Wave')
      return
    }
    // 1.2 s to 2.8 s per walk, whatever the distance; steps sped up to match (capped so legs stay readable).
    const dur = THREE.MathUtils.clamp(dist / 4.2, 1.2, 2.8)
    const v = dist / dur
    setWalkSpeed(Math.min(2.6, v / (MODEL_WALK_SPEED * CHAR_SCALE)))
    walk.current = { from: at.current.u, to, t0: performance.now(), dur: dur * 1000, target: c }
    setWalking(true)
    onWalkStart()
  }

  useFrame((_, dt) => {
    const w = walk.current
    let u = at.current.u
    let wantHeading: number | null = null
    if (w) {
      const k = Math.min(1, (performance.now() - w.t0) / w.dur)
      // gentle start and stop, steady in the middle
      const e = k < 0.15 ? (k * k) / 0.3 : k > 0.85 ? 1 - ((1 - k) * (1 - k)) / 0.3 : (k - 0.075) / 0.85
      u = THREE.MathUtils.lerp(w.from, w.to, THREE.MathUtils.clamp(e, 0, 1))
      road.curve.getTangentAt(THREE.MathUtils.clamp(u, 0.001, 0.999), tmp.t)
      const dir = Math.sign(w.to - w.from)
      wantHeading = Math.atan2(tmp.t.x * dir, tmp.t.z * dir)
      if (k >= 1) arrive()
    }
    road.curve.getPointAt(THREE.MathUtils.clamp(u, 0, 1), tmp.p)
    tmp.p.y = groundAt(tmp.p.x, tmp.p.z) + 0.04 // feet on the road, also up a mound (never sinking in)
    // the camera keeps this point in the middle (also before the model has loaded)
    follow.current = (follow.current ?? new THREE.Vector3()).copy(tmp.p)
    walkingRef.current = !!walk.current

    const g = char.current?.group
    if (!g) return
    // standing: turn to face the camera
    if (wantHeading === null) wantHeading = Math.atan2(camera.position.x - tmp.p.x, camera.position.z - tmp.p.z)
    g.position.copy(tmp.p)
    // smooth turning (shortest way round)
    let d = wantHeading - heading.current
    d = Math.atan2(Math.sin(d), Math.cos(d))
    heading.current += d * Math.min(1, dt * (w ? 10 : 4))
    g.rotation.y = heading.current
  })

  // the road is bright up to the last map that is open
  const litUntil = status(3) !== 'locked' ? 1 : status(2) !== 'locked' ? road.stops[1] : 0
  // no trees on a building's mound (its foot is 3.1 wide)
  const avoid = useMemo(() => L.castles.map((pos) => ({ pos, r: 3.3 * L.scale })), [L])
  // keep trees, bushes and flowers off the whole road
  const pathPoints = useMemo<V3[]>(() => road.curve.getSpacedPoints(90).map((p) => [p.x, 0, p.z]), [road])

  return (
    <>
      <hemisphereLight args={['#d9f0ff', '#4f7d35', 0.95]} />
      <directionalLight
        position={[9, 16, 8]}
        intensity={1.9}
        color="#fff4dc"
        castShadow
        shadow-mapSize={lite ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0004}
      />
      <fog attach="fog" args={['#bfe6fb', 46, 100]} />

      <Ground />
      <StonePath curve={road.curve} litUntil={litUntil} groundAt={groundAt} />
      <Scenery avoid={avoid} pathPoints={pathPoints} lite={lite} focus={follow} />
      <Clouds />

      {cycles.map((c, i) => (
        <Castle
          key={c.cycle}
          position={L.castles[i]}
          scale={L.scale}
          cycle={c.cycle}
          status={c.status}
          color={FLAG_COLORS[i]}
          onSelect={() => onPick(c)}
        />
      ))}

      <Suspense fallback={null}>
        <Character ref={char} kind={character} clip={walking ? 'Walk' : 'Idle'} speed={walking ? walkSpeed : 1} scale={CHAR_SCALE} />
      </Suspense>

      <MapControls view={L.view} portrait={L.portrait} focused={focusCycle !== null} character={follow} walking={walkingRef} />
      <LabelTracker anchors={L.castles} scale={L.scale} labels={labels} />
    </>
  )
}

/**
 * Keeps the small name tags floating above their buildings while the camera moves.
 * Above (not in front): the character stands and walks in front of the buildings and must stay visible.
 */
function LabelTracker({ anchors, scale, labels }: { anchors: V3[]; scale: number; labels: RefObject<(HTMLDivElement | null)[]> }) {
  const { camera, size } = useThree()
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    anchors.forEach((a, i) => {
      const el = labels.current?.[i]
      if (!el) return
      v.set(a[0], LABEL_HEIGHT * scale, a[2]).project(camera)
      const x = (v.x * 0.5 + 0.5) * size.width
      const y = (-v.y * 0.5 + 0.5) * size.height
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`
      el.style.visibility = v.z < 1 ? 'visible' : 'hidden'
    })
  })
  return null
}

/** Phones, tablets and low-power laptops get fewer trees, smaller shadows and no anti-aliasing. */
function isLowEndDevice(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const touch = /Android|iPad|iPhone|Mobile|Tablet/i.test(nav.userAgent) || (nav.maxTouchPoints > 1 && /Macintosh/.test(nav.userAgent))
  return touch || (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4
}

interface Props {
  cycles: CycleProgress[]
  onOpenSesyon: (cycle: number, sesyon: number) => void
  /** false while a level path or a game is shown on top: rendering pauses (nothing is unloaded). */
  active?: boolean
  character: CharacterKind
}

/**
 * The real map: 3D buildings on a meadow, following the sketch. Tap a building: the
 * pupil's character walks there along the stone path (the camera follows), then the
 * sesyon sheet opens.
 */
export default function WorldMap({ cycles, onOpenSesyon, active = true, character }: Props) {
  const [open, setOpen] = useState<CycleProgress | null>(null)
  const selectRef = useRef<((c: CycleProgress) => void) | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const labels = useRef<(HTMLDivElement | null)[]>([])
  const [lite] = useState(isLowEndDevice)
  // Render resolution: starts lower on tablets/phones and drops further if frames get slow.
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.5))
  // Tap vs drag: a drag that turns the map must not close the sheet or open a building.
  const down = useRef<{ x: number; y: number } | null>(null)
  const dragged = useRef(false)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  function select(c: CycleProgress) {
    if (dragged.current) return
    if (c.status === 'locked') {
      setOpen(null)
      const prev = cycles[c.cycle - 2]
      setToast(prev ? `Tapusin muna ang ${prev.title}!` : 'Hindi pa bukas ang map na ito.')
      return
    }
    selectRef.current?.(c)
  }

  function sesyonLabel(s: SesyonProgress) {
    if (s.status === 'locked') return <><Icon name="lock" size={12} /> Naka-lock</>
    if (!s.ready) return <>Hindi pa handa</>
    return <><Star filled size={14} /> {s.stars}/{s.max_stars}</>
  }

  return (
    <div
      className="m3-root"
      onPointerDownCapture={(e) => {
        down.current = { x: e.clientX, y: e.clientY }
        dragged.current = false
      }}
      onPointerMoveCapture={(e) => {
        if (down.current && Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y) > 8) dragged.current = true
      }}
    >
      <Canvas
        // 'percentage' = PCFShadowMap (three.js removed the "soft" PCF variant R3F used by default)
        shadows="percentage"
        dpr={dpr}
        frameloop={active ? 'always' : 'never'}
        camera={{ fov: 40, near: 0.1, far: 160, position: [0, 30, 30] }}
        gl={{ antialias: !lite, alpha: true, powerPreference: 'high-performance' }}
        onPointerMissed={() => !dragged.current && setOpen(null)}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr((d) => Math.min(d + 0.25, lite ? 1.25 : 1.5))} />
        <Scene
          cycles={cycles}
          focusCycle={open?.cycle ?? null}
          labels={labels}
          lite={lite}
          character={character}
          selectRef={selectRef}
          onArrive={(c) => setOpen(c)}
          onWalkStart={() => setOpen(null)}
          onPick={select}
        />
      </Canvas>

      <div className="m3-labels" aria-hidden={!!open}>
        {cycles.map((c, i) => (
          <CastleLabel
            key={c.cycle}
            cycle={c.cycle}
            title={c.title}
            status={c.status}
            stars={c.stars}
            maxStars={c.max_stars}
            innerRef={(el) => {
              labels.current[i] = el
            }}
          />
        ))}
      </div>

      {open && (
        <div className="m3-sheet" role="dialog" aria-label={open.title}>
          <button type="button" className="m3-sheet-close" onClick={() => setOpen(null)} aria-label="Isara">
            <Icon name="close" size={14} />
            <span>ISARA</span>
          </button>
          <span className="m3-sheet-kicker">MAP</span>
          <h2 className="m3-sheet-title">{open.title}</h2>
          <div className="m3-sesyons">
            {open.sesyons.map((s, i) => (
              <button
                key={s.sesyon}
                className={`m3-ses is-${s.status}`}
                style={{ animationDelay: `${i * 80}ms` }}
                disabled={s.status === 'locked' || !s.ready}
                onClick={() => onOpenSesyon(open.cycle, s.sesyon)}
              >
                <span className="m3-ses-name">SESYON {s.sesyon}</span>
                <span className="m3-ses-meta">{sesyonLabel(s)}</span>
                <span className="m3-ses-meta">{s.word_count * 2} level</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {toast && (
        <div className="lv-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
