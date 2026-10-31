import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { SesyonStatus } from '../lib/types'
import { Icon } from '../ui/Icon'
import { Star } from '../ui/StarRow'
import { bubbleTexture, grassTexture, letterTexture, pictureTexture, stripeTexture } from './textures'

export interface CastleProps {
  position: [number, number, number]
  scale?: number
  cycle: number
  status: SesyonStatus
  /** Flag colour of this castle. */
  color: string
  onSelect: () => void
}

/** Island materials (created once). */
function useMaterials(muted: boolean) {
  return useMemo(
    () => ({
      grassTop: new THREE.MeshStandardMaterial({ map: grassTexture([2, 2]), color: muted ? '#b8c2b0' : '#ffffff', roughness: 1 }),
    }),
    [muted],
  )
}

/* ── Toy buildings ──────────────────────────────────────────
 * Chunky, glossy, rounded shapes like the buildings on a Mario 3D
 * world map (no Nintendo characters or logos). One per castle:
 *   1 Tuklas-Larawan     = striped picture tent with a picture billboard
 *   2 Tuklas-Pangungusap = tower of letter blocks on a little house
 *   3 Tuklas-Sitwasyon   = mushroom house with a speech-bubble sign
 * Locked buildings are drawn grey. */

const GREY = new THREE.Color('#a3a9b1')

/** Plastic-toy material; locked buildings fade to grey. */
function toy(color: string, muted: boolean, extra: THREE.MeshStandardMaterialParameters = {}) {
  const c = new THREE.Color(color)
  if (muted) c.lerp(GREY, 0.78)
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.02, ...extra })
}

function texMat(tex: THREE.Texture, muted: boolean) {
  return new THREE.MeshStandardMaterial({ map: tex, color: muted ? '#9da3ab' : '#ffffff', roughness: 0.5 })
}

function windowMat(muted: boolean) {
  return new THREE.MeshStandardMaterial({
    color: muted ? '#5d636b' : '#ffe9a8',
    emissive: muted ? '#000000' : '#ffb347',
    emissiveIntensity: muted ? 0 : 0.7,
    roughness: 0.4,
  })
}

interface BuildingProps {
  muted: boolean
  flagMat: THREE.Material
  flagRef: RefObject<THREE.Mesh | null>
}

/** Pole with a waving pennant (the parent animates flagRef). */
function Pennant({ y, x = 0, z = 0, height = 0.9, flagMat, flagRef, muted }: BuildingProps & { y: number; x?: number; z?: number; height?: number }) {
  const pole = useMemo(() => toy('#f4f1ea', muted), [muted])
  const ball = useMemo(() => toy('#ffc928', muted, { metalness: 0.3, roughness: 0.3 }), [muted])
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, height / 2, 0]} material={pole} castShadow>
        <cylinderGeometry args={[0.035, 0.035, height, 8]} />
      </mesh>
      <mesh position={[0, height + 0.05, 0]} material={ball} castShadow>
        <sphereGeometry args={[0.08, 12, 10]} />
      </mesh>
      <mesh ref={flagRef} position={[0.3, height - 0.18, 0]} material={flagMat} castShadow>
        <planeGeometry args={[0.55, 0.32]} />
      </mesh>
    </group>
  )
}

/** Castle 1: red-and-white striped tent with gold trim and a picture billboard. */
function PictureTent(props: BuildingProps) {
  const { muted } = props
  const mats = useMemo(() => {
    const stripes = stripeTexture('#e8302a', '#fff6ee', 18)
    return {
      wall: texMat(stripes, muted),
      roof: texMat(stripes, muted),
      gold: toy('#ffc928', muted, { metalness: 0.3, roughness: 0.3 }),
      door: toy('#5b2f16', muted),
      curtain: toy('#c22520', muted),
      wood: toy('#a8672f', muted, { roughness: 0.7 }),
      picture: texMat(pictureTexture(), muted),
      base: toy('#ffe2a8', muted),
    }
  }, [muted])

  return (
    <group position={[0, 0, 0.1]}>
      {/* Round platform */}
      <mesh position={[0, 0.08, 0]} material={mats.base} castShadow receiveShadow>
        <cylinderGeometry args={[1.55, 1.62, 0.16, 40]} />
      </mesh>
      {/* Striped drum */}
      <mesh position={[0, 0.8, 0]} material={mats.wall} castShadow receiveShadow>
        <cylinderGeometry args={[1.25, 1.3, 1.3, 40, 1, true]} />
      </mesh>
      <mesh position={[0, 0.8, 0]} material={mats.door}>
        <cylinderGeometry args={[1.22, 1.22, 1.28, 24]} />
      </mesh>
      {/* Gold scallops under the roof */}
      {Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 1.36, 1.44, Math.sin(a) * 1.36]} material={mats.gold} castShadow>
            <sphereGeometry args={[0.14, 12, 10]} />
          </mesh>
        )
      })}
      {/* Striped cone roof, a little puffy */}
      <mesh position={[0, 2.25, 0]} material={mats.roof} castShadow>
        <coneGeometry args={[1.6, 1.65, 40, 1, true]} />
      </mesh>
      <mesh position={[0, 1.44, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.curtain}>
        <circleGeometry args={[1.6, 40]} />
      </mesh>
      {/* Entrance with tied-back curtains */}
      <group position={[0, 0, 1.25]}>
        <mesh position={[0, 0.62, 0.02]} material={mats.door}>
          <boxGeometry args={[0.62, 0.95, 0.06]} />
        </mesh>
        <mesh position={[0, 1.08, 0.02]} rotation={[Math.PI / 2, 0, 0]} material={mats.door}>
          <cylinderGeometry args={[0.31, 0.31, 0.06, 20, 1, false, -Math.PI / 2, Math.PI]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.36, 0.72, 0.08]} rotation={[0, 0, s * 0.18]} material={mats.curtain} castShadow>
            <coneGeometry args={[0.16, 1.1, 12]} />
          </mesh>
        ))}
      </group>
      {/* Picture billboard on the side */}
      <group position={[1.75, 0, 0.55]} rotation={[0, -0.5, 0]}>
        {[-0.38, 0.38].map((x) => (
          <mesh key={x} position={[x, 0.45, 0]} material={mats.wood} castShadow>
            <boxGeometry args={[0.08, 0.9, 0.08]} />
          </mesh>
        ))}
        <mesh position={[0, 1.05, 0]} material={mats.wood} castShadow>
          <boxGeometry args={[1.0, 0.78, 0.1]} />
        </mesh>
        <mesh position={[0, 1.05, 0.056]} material={mats.picture}>
          <planeGeometry args={[0.84, 0.62]} />
        </mesh>
      </group>
      <Pennant {...props} y={3.05} height={0.85} />
    </group>
  )
}

/** Castle 2: a little house with a goofy tower of letter blocks on top. */
function LetterTower(props: BuildingProps) {
  const { muted } = props
  const mats = useMemo(
    () => ({
      house: toy('#f2c27b', muted),
      trim: toy('#fff6e6', muted),
      roofEdge: toy('#1d7fe0', muted),
      door: toy('#7a4518', muted),
      knob: toy('#ffc928', muted, { metalness: 0.4 }),
      window: windowMat(muted),
      blocks: [
        ['A', '#1d7fe0'],
        ['B', '#e8302a'],
        ['K', '#f5a623'],
        ['S', '#2ab27b'],
      ].map(([l, c]) => {
        const face = texMat(letterTexture(l, c), muted)
        const side = toy(c, muted)
        return [side, side, side, side, face, side] as THREE.Material[]
      }),
    }),
    [muted],
  )
  const block = useMemo(() => new RoundedBoxGeometry(0.72, 0.72, 0.72, 4, 0.1), [])
  const house = useMemo(() => new RoundedBoxGeometry(2.1, 1.15, 1.6, 4, 0.16), [])

  return (
    <group position={[0, 0, 0.05]}>
      {/* House */}
      <mesh geometry={house} position={[0, 0.58, 0]} material={mats.house} castShadow receiveShadow />
      <mesh position={[0, 1.2, 0]} material={mats.roofEdge} castShadow>
        <boxGeometry args={[2.25, 0.14, 1.75]} />
      </mesh>
      {/* Door and round windows */}
      <mesh position={[0, 0.4, 0.81]} material={mats.door}>
        <boxGeometry args={[0.5, 0.75, 0.05]} />
      </mesh>
      <mesh position={[0, 0.78, 0.81]} rotation={[Math.PI / 2, 0, 0]} material={mats.door}>
        <cylinderGeometry args={[0.25, 0.25, 0.05, 20, 1, false, -Math.PI / 2, Math.PI]} />
      </mesh>
      <mesh position={[0.15, 0.4, 0.85]} material={mats.knob}>
        <sphereGeometry args={[0.04, 8, 8]} />
      </mesh>
      {[-0.68, 0.68].map((x) => (
        <group key={x} position={[x, 0.68, 0.81]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.trim}>
            <cylinderGeometry args={[0.22, 0.22, 0.05, 20]} />
          </mesh>
          <mesh position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]} material={mats.window}>
            <cylinderGeometry args={[0.16, 0.16, 0.04, 20]} />
          </mesh>
        </group>
      ))}
      {/* Letter blocks, slightly crooked so they look stacked by hand */}
      <mesh geometry={block} position={[-0.42, 1.64, 0.15]} rotation={[0, 0.12, 0]} material={mats.blocks[0]} castShadow />
      <mesh geometry={block} position={[0.4, 1.64, 0.1]} rotation={[0, -0.18, 0]} material={mats.blocks[1]} castShadow />
      <mesh geometry={block} position={[0.0, 2.37, 0.12]} rotation={[0, 0.22, 0.04]} material={mats.blocks[2]} castShadow />
      <mesh geometry={block} position={[0.62, 0.36, 1.05]} rotation={[0, -0.4, 0]} scale={0.7} material={mats.blocks[3]} castShadow />
      <Pennant {...props} y={2.73} x={0} z={0.12} height={0.75} />
    </group>
  )
}

/** Castle 3: mushroom house with spots and a speech-bubble sign (a b c). */
function MushroomHouse(props: BuildingProps) {
  const { muted } = props
  const mats = useMemo(
    () => ({
      stem: toy('#fff1d6', muted),
      cap: toy('#8a4dff', muted, { roughness: 0.35 }),
      under: toy('#f2dcb5', muted),
      spot: toy('#ffffff', muted, { roughness: 0.35 }),
      door: toy('#8a5a2b', muted),
      knob: toy('#ffc928', muted, { metalness: 0.4 }),
      window: windowMat(muted),
      wood: toy('#a8672f', muted, { roughness: 0.7 }),
      bubble: texMat(bubbleTexture('a b c', '#8a4dff'), muted),
      bubbleSide: toy('#ffffff', muted),
    }),
    [muted],
  )
  const spots: [number, number][] = [
    [0.0, 0.25],
    [0.9, 0.55],
    [2.1, 0.5],
    [3.3, 0.6],
    [4.4, 0.45],
    [5.5, 0.6],
    [1.5, 1.05],
    [3.9, 1.05],
  ]
  const bubbleGeo = useMemo(() => new RoundedBoxGeometry(1.0, 0.52, 0.12, 4, 0.06), [])
  // Each spot sits on the squashed-sphere cap and faces along its surface normal.
  const spotPlacements = useMemo(() => {
    const a = 1.7
    const b = 1.7 * 0.72
    const z = new THREE.Vector3(0, 0, 1)
    return spots.map(([az, el]) => {
      const x = Math.sin(el) * Math.cos(az) * a
      const zz = Math.sin(el) * Math.sin(az) * a
      const y = Math.cos(el) * b
      const n = new THREE.Vector3(x / (a * a), y / (b * b), zz / (a * a)).normalize()
      const pos = new THREE.Vector3(x, 1.38 + y, zz).addScaledVector(n, 0.012)
      return { pos, quat: new THREE.Quaternion().setFromUnitVectors(z, n) }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <group position={[0, 0, 0.05]}>
      {/* Stem (the house) */}
      <mesh position={[0, 0.72, 0]} material={mats.stem} castShadow receiveShadow>
        <cylinderGeometry args={[0.98, 1.12, 1.45, 36]} />
      </mesh>
      {/* Arched door (leans with the stem) + windows */}
      <group position={[0, 0, 1.13]} rotation={[-0.096, 0, 0]}>
        <mesh position={[0, 0.3, 0]} material={mats.door}>
          <boxGeometry args={[0.46, 0.6, 0.06]} />
        </mesh>
        <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.door}>
          <cylinderGeometry args={[0.23, 0.23, 0.06, 20, 1, false, -Math.PI / 2, Math.PI]} />
        </mesh>
        <mesh position={[0.14, 0.32, 0.05]} material={mats.knob}>
          <sphereGeometry args={[0.045, 8, 8]} />
        </mesh>
      </group>
      {[-0.62, 0.62].map((x) => (
        <mesh key={x} position={[x, 1.0, 0.8]} rotation={[Math.PI / 2 - 0.1, 0, x > 0 ? -0.65 : 0.65]} material={mats.window}>
          <cylinderGeometry args={[0.15, 0.15, 0.05, 20]} />
        </mesh>
      ))}
      {/* Cap */}
      <mesh position={[0, 1.38, 0]} scale={[1, 0.72, 1]} material={mats.cap} castShadow>
        <sphereGeometry args={[1.7, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 1.38, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.under}>
        <circleGeometry args={[1.7, 40]} />
      </mesh>
      {/* White spots: flat round patches lying on the cap surface */}
      {spotPlacements.map((s, i) => (
        <mesh key={i} position={s.pos} quaternion={s.quat} material={mats.spot}>
          <circleGeometry args={[i === 0 ? 0.36 : 0.27, 24]} />
        </mesh>
      ))}
      {/* Speech-bubble sign */}
      <group position={[1.72, 0, 0.7]} rotation={[0, -0.55, 0]}>
        <mesh position={[0, 0.55, 0]} material={mats.wood} castShadow>
          <boxGeometry args={[0.08, 1.1, 0.08]} />
        </mesh>
        <mesh geometry={bubbleGeo} position={[0, 1.32, 0]} material={mats.bubbleSide} castShadow />
        <mesh position={[0, 1.32, 0.065]} material={mats.bubble}>
          <planeGeometry args={[0.86, 0.43]} />
        </mesh>
        <mesh position={[-0.22, 0.98, 0]} rotation={[0, 0, 0.6]} material={mats.bubbleSide}>
          <coneGeometry args={[0.1, 0.26, 4]} />
        </mesh>
      </group>
      <Pennant {...props} y={2.55} height={0.8} />
    </group>
  )
}

/** Five-pointed star used above the castle you play next and above finished castles. */
function useStarGeometry() {
  return useMemo(() => {
    const shape = new THREE.Shape()
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 0.5 : 0.22
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r
      if (i === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    }
    shape.closePath()
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 })
    geo.center()
    return geo
  }, [])
}

/** Flat top of the building's mound (the buildings stand on it at y = 0.6). */
const MOUND_TOP_R = 2.3
const MOUND_FOOT_R = 3.1
const MOUND_TOP_Y = 0.6
/** The mound is an oval: narrower front to back. */
const MOUND_Z = 0.72

/** Height of the mound profile at a distance from its centre (in mound units). */
function moundProfile(r: number): number {
  if (r <= MOUND_TOP_R) return MOUND_TOP_Y
  if (r >= MOUND_FOOT_R) return 0
  const t = (r - MOUND_TOP_R) / (MOUND_FOOT_R - MOUND_TOP_R)
  return Math.max(0, -0.03 + (MOUND_TOP_Y + 0.03) * (1 + Math.cos(Math.PI * t)) / 2)
}

/**
 * Ground height at a world point because of one building's mound (0 off the mound). Used to
 * keep the character's feet and the road ON the ground where they climb a mound.
 */
export function moundHeightAt(x: number, z: number, center: readonly [number, number, number], scale: number): number {
  const lx = (x - center[0]) / scale
  const lz = (z - center[2]) / scale / MOUND_Z
  return moundProfile(Math.hypot(lx, lz)) * scale
}

/**
 * The mound under each building: flat on top, then a smooth (cosine) slope down to the
 * meadow, ending just under the ground so there is no visible edge. Grass seen from above
 * (UVs from x/z), so the grass pattern does not stretch down the slope.
 */
const moundGeo = (() => {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, MOUND_TOP_Y)]
  const steps = 14
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = MOUND_TOP_R + (MOUND_FOOT_R - MOUND_TOP_R) * t
    // same curve as moundProfile, but ending just under the meadow (no visible seam)
    pts.push(new THREE.Vector2(r, -0.03 + (MOUND_TOP_Y + 0.03) * (1 + Math.cos(Math.PI * t)) / 2))
  }
  // a lathe profile must run bottom -> top for the faces to point outwards
  const g = new THREE.LatheGeometry(pts.reverse(), 56)
  const pos = g.attributes.position
  const uv = g.attributes.uv
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (2 * MOUND_FOOT_R) + 0.5, pos.getZ(i) / (2 * MOUND_FOOT_R) + 0.5)
  uv.needsUpdate = true
  g.computeVertexNormals()
  return g
})()

/**
 * Castle from the sketch: a tall round tower with battlements on the left, a wide
 * building with two rows of windows and a door, on an oval grassy island.
 */
export function Castle({ position, scale = 1, cycle, status, color, onSelect }: CastleProps) {
  const muted = status === 'locked'
  const m = useMaterials(muted)
  const starGeo = useStarGeometry()
  const flag = useRef<THREE.Mesh>(null)
  const marker = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const body = useRef<THREE.Group>(null)
  const isCurrent = status === 'unlocked'

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + cycle

    if (flag.current) {
      flag.current.rotation.y = Math.sin(t * 3) * 0.25
      flag.current.scale.x = 1 + Math.sin(t * 5) * 0.06
    }
    if (marker.current) {
      marker.current.position.y = 4.55 + Math.sin(t * 2.2) * 0.18
      marker.current.rotation.y = t * 1.4
    }
    if (ring.current) {
      const s = 1 + ((t * 0.6) % 1) * 0.25
      ring.current.scale.set(s, s, s)
      ;(ring.current.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - ((t * 0.6) % 1))
    }
  })

  const select = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onSelect()
  }

  const flagMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: muted ? '#8d939b' : color, side: THREE.DoubleSide, roughness: 0.7 }),
    [muted, color],
  )
  const goldMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#ffc928', emissive: '#ff9d00', emissiveIntensity: 0.45, metalness: 0.4, roughness: 0.35 }),
    [],
  )

  return (
    <group
      position={position}
      scale={scale}
      onClick={select}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      {/* Low grassy mound that rises gently out of the meadow (no cliff edge, so it never looks
          like it floats). Does not cast a shadow: a dark rim around it would look like a gap. */}
      <mesh geometry={moundGeo} scale={[1, 1, MOUND_Z]} receiveShadow material={m.grassTop} />
      {isCurrent && (
        <mesh ref={ring} position={[0, 0.62, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 1]}>
          <ringGeometry args={[MOUND_TOP_R - 0.25, MOUND_TOP_R - 0.05, 64]} />
          <meshBasicMaterial color="#fff36b" transparent opacity={0.7} depthWrite={false} />
        </mesh>
      )}

      <group ref={body} position={[0, 0.6, 0]}>
        {cycle === 1 && <PictureTent muted={muted} flagMat={flagMat} flagRef={flag} />}
        {cycle === 2 && <LetterTower muted={muted} flagMat={flagMat} flagRef={flag} />}
        {cycle !== 1 && cycle !== 2 && <MushroomHouse muted={muted} flagMat={flagMat} flagRef={flag} />}
      </group>

      {/* A still gold star over finished maps (the character shows where the pupil is) */}
      {status === 'completed' && (
        <group position={[0.55, 4.0, 0]}>
          <mesh geometry={starGeo} material={goldMat} scale={0.8} castShadow />
        </group>
      )}

    </group>
  )
}

/** Wooden name plate under a castle. Rendered over the canvas and moved by the map each frame. */
export function CastleLabel({
  title,
  status,
  stars,
  maxStars,
  innerRef,
}: {
  /** Kept for callers; the plate shows the map name only (no number). */
  cycle?: number
  title: string
  status: SesyonStatus
  stars: number
  maxStars: number
  innerRef: (el: HTMLDivElement | null) => void
}) {
  return (
    <div ref={innerRef} className="m3-label-anchor">
      <div className={`m3-label is-${status}`}>
        <span className="m3-label-title">{title}</span>
        <span className="m3-label-meta">
          {status === 'locked' ? (
            <>
              <Icon name="lock" size={10} /> Naka-lock
            </>
          ) : (
            <>
              <Star filled size={11} /> {stars}/{maxStars}
            </>
          )}
        </span>
      </div>
    </div>
  )
}
