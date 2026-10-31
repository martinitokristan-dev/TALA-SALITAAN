import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { grassTexture } from './textures'

type V3 = [number, number, number]

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/*
 * Performance: every tree, bush, flower and stone of one kind is drawn as ONE
 * InstancedMesh (one draw call), instead of one mesh per part. That took the map
 * from about 700 draw calls per frame (x2 with shadows) down to about 140.
 */

const ZERO_Q = new THREE.Quaternion()
const UP = new THREE.Vector3(0, 1, 0)

interface Inst {
  pos: THREE.Vector3
  rotY?: number
  scale: THREE.Vector3 | number
  color?: THREE.Color
}

function Instances({
  geometry,
  material,
  items,
  castShadow,
  receiveShadow,
  hidden,
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  items: Inst[]
  castShadow?: boolean
  receiveShadow?: boolean
  /** Items not drawn here (drawn see-through elsewhere, e.g. a tree in front of the character). */
  hidden?: readonly number[]
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const s = new THREE.Vector3()
    items.forEach((it, i) => {
      q.copy(ZERO_Q).setFromAxisAngle(UP, it.rotY ?? 0)
      if (hidden?.includes(i)) s.setScalar(0)
      else if (typeof it.scale === 'number') s.setScalar(it.scale)
      else s.copy(it.scale)
      m.compose(it.pos, q, s)
      mesh.setMatrixAt(i, m)
      if (it.color) mesh.setColorAt(i, it.color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items, hidden])
  if (!items.length) return null
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={castShadow} receiveShadow={receiveShadow} />
}

/** Meadow with gentle hills far from the buildings. Big enough that turning the map never shows its edge. */
export function Ground() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(170, 170, 85, 85)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const d = Math.hypot(x, y)
      const hill = Math.max(0, (d - 20) / 12)
      pos.setZ(i, hill * (Math.sin(x * 0.3) * Math.cos(y * 0.27) + 0.7) * 1.8)
    }
    g.computeVertexNormals()
    return g
  }, [])
  const tex = useMemo(() => {
    const t = grassTexture([34, 34])
    return t
  }, [])

  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial map={tex} roughness={1} />
    </mesh>
  )
}

/**
 * The road between the maps: a soft sandy track with grassy edges, and stepping stones in
 * pairs down the middle. It follows the ground (also up the building mounds), so the
 * character always walks ON it. Up to `litUntil` (0..1 along the road) it is bright: the part
 * that leads to maps already opened; the rest is grey.
 */
export function StonePath({ curve, litUntil, groundAt }: { curve: THREE.Curve<THREE.Vector3>; litUntil: number; groundAt: (x: number, z: number) => number }) {
  const track = useMemo(() => {
    const n = Math.max(40, Math.round(curve.getLength() * 6))
    const halfW = [0.62, 0.46] // grassy edge, sand
    const lit = [new THREE.Color('#9dcf6a'), new THREE.Color('#ecd29c')]
    const dim = [new THREE.Color('#8fb07a'), new THREE.Color('#bdb7a4')]
    const geos = halfW.map((w, layer) => {
      const pos: number[] = []
      const col: number[] = []
      const idx: number[] = []
      for (let i = 0; i <= n; i++) {
        const u = i / n
        const p = curve.getPointAt(u)
        const t = curve.getTangentAt(u)
        const side = new THREE.Vector3(-t.z, 0, t.x).normalize()
        const c = (u <= litUntil + 1e-4 ? lit : dim)[layer]
        for (const s of [-1, 1]) {
          const x = p.x + side.x * w * s
          const z = p.z + side.z * w * s
          pos.push(x, groundAt(x, z) + 0.012 + layer * 0.006, z)
          col.push(c.r, c.g, c.b)
        }
        if (i < n) {
          const a = i * 2
          idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) // counter-clockwise from above: faces up
        }
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
      g.setIndex(idx)
      g.computeVertexNormals()
      return g
    })
    return geos
  }, [curve, litUntil, groundAt])

  const { lit, dim } = useMemo(() => {
    const lit: Inst[] = []
    const dim: Inst[] = []
    const count = Math.max(4, Math.round(curve.getLength() / 0.7))
    for (let i = 1; i < count; i++) {
      const u = i / count
      const p = curve.getPointAt(u)
      const tan = curve.getTangentAt(u)
      const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize()
      // two stones side by side, slightly staggered: a stepping-stone walk
      for (const s of [-1, 1]) {
        const x = p.x + side.x * 0.17 * s + tan.x * 0.08 * s
        const z = p.z + side.z * 0.17 * s + tan.z * 0.08 * s
        const big = 0.85 + ((i * 7 + (s > 0 ? 3 : 0)) % 5) * 0.06
        ;(u <= litUntil ? lit : dim).push({
          pos: new THREE.Vector3(x, groundAt(x, z) + 0.035, z),
          rotY: Math.atan2(tan.x, tan.z) + s * 0.12,
          scale: big,
        })
      }
    }
    return { lit, dim }
  }, [curve, litUntil, groundAt])

  const geo = useMemo(() => new THREE.CylinderGeometry(0.16, 0.18, 0.06, 7), [])
  const litMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f6ead0', roughness: 0.85, flatShading: true }), [])
  const dimMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#a9a9a2', roughness: 0.95, flatShading: true }), [])
  const trackMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), [])

  return (
    <>
      {track.map((g, i) => (
        <mesh key={i} geometry={g} material={trackMat} receiveShadow />
      ))}
      <Instances geometry={geo} material={litMat} items={lit} receiveShadow />
      <Instances geometry={geo} material={dimMat} items={dim} receiveShadow />
    </>
  )
}

/** Shared geometry/material sets for the scenery (created once per map). */
function useSceneryParts() {
  return useMemo(() => {
    const flat = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true })
    return {
      trunk: { geo: new THREE.CylinderGeometry(0.09, 0.12, 0.6, 8), mat: new THREE.MeshStandardMaterial({ color: '#6b4423', roughness: 1 }) },
      cones: [
        { y: 0.75, geo: new THREE.ConeGeometry(0.62, 0.95, 9), mat: flat('#2f7d3a') },
        { y: 1.2, geo: new THREE.ConeGeometry(0.5, 0.8, 9), mat: flat('#3a9446') },
        { y: 1.6, geo: new THREE.ConeGeometry(0.36, 0.62, 9), mat: flat('#48a852') },
      ],
      bush: [
        { off: [0, 0.22, 0], geo: new THREE.IcosahedronGeometry(0.32, 1), mat: flat('#3f9a3e') },
        { off: [0.28, 0.18, 0.05], geo: new THREE.IcosahedronGeometry(0.24, 1), mat: flat('#4fae4a') },
        { off: [-0.25, 0.16, 0.08], geo: new THREE.IcosahedronGeometry(0.22, 1), mat: flat('#4fae4a') },
      ] as { off: V3; geo: THREE.BufferGeometry; mat: THREE.Material }[],
      stem: { geo: new THREE.CylinderGeometry(0.012, 0.012, 0.16, 4), mat: new THREE.MeshStandardMaterial({ color: '#2f7d3a' }) },
      petal: { geo: new THREE.SphereGeometry(0.055, 8, 6), mat: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }) },
    }
  }, [])
}

/**
 * Trees, bushes and flowers all around the buildings (in every direction, so the map
 * looks full from any side when it is turned), away from the buildings and the path.
 */
export function Scenery({
  avoid,
  pathPoints,
  lite = false,
  focus,
}: {
  avoid: { pos: V3; r: number }[]
  pathPoints: V3[]
  lite?: boolean
  /** The character: trees standing between it and the camera turn see-through. */
  focus?: RefObject<THREE.Vector3 | null>
}) {
  const parts = useSceneryParts()

  const placed = useMemo(() => {
    const rand = rng(42)
    const ok = (x: number, z: number, pad: number) =>
      avoid.every((a) => Math.hypot(x - a.pos[0], z - a.pos[2]) > a.r + pad) &&
      pathPoints.every((p) => Math.hypot(x - p[0], z - p[2]) > 0.9 + pad)
    // Random point in a ring around the middle of the map.
    const inRing = (rMin: number, rMax: number): [number, number] => {
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(rMin * rMin + rand() * (rMax * rMax - rMin * rMin))
      return [Math.cos(a) * r, Math.sin(a) * r * 0.85 - 0.5]
    }

    const trees: { x: number; z: number; s: number; r: number }[] = []
    const want = lite ? 70 : 110
    for (let i = 0; i < 1500 && trees.length < want; i++) {
      // A few trees inside the U, most of them forming a forest ring outside.
      const [x, z] = i % 5 === 0 ? inRing(0, 12) : inRing(11, 26)
      if (ok(x, z, 0.6) && trees.every((t) => Math.hypot(t.x - x, t.z - z) > 1.1)) trees.push({ x, z, s: 0.8 + rand() * 0.8, r: rand() * 6 })
    }
    const bushes: { x: number; z: number; s: number; r: number }[] = []
    for (let i = 0; i < 600 && bushes.length < (lite ? 24 : 40); i++) {
      const [x, z] = inRing(0, 20)
      if (ok(x, z, 0.3)) bushes.push({ x, z, s: 0.7 + rand() * 0.6, r: rand() * 6 })
    }
    const colors = ['#ffffff', '#ffd23f', '#ff8fb8', '#b48cff'].map((c) => new THREE.Color(c))
    const flowers: { x: number; z: number; c: THREE.Color }[] = []
    for (let i = 0; i < 900 && flowers.length < (lite ? 70 : 140); i++) {
      const [x, z] = inRing(0, 17)
      if (ok(x, z, 0.1)) flowers.push({ x, z, c: colors[i % colors.length] })
    }
    return { trees, bushes, flowers }
  }, [avoid, pathPoints, lite])

  const trunk = useMemo<Inst[]>(() => placed.trees.map((t) => ({ pos: new THREE.Vector3(t.x, 0.3 * t.s, t.z), scale: t.s, rotY: t.r })), [placed])
  const cones = useMemo(
    () => parts.cones.map((c) => placed.trees.map<Inst>((t) => ({ pos: new THREE.Vector3(t.x, c.y * t.s, t.z), scale: t.s, rotY: t.r }))),
    [placed, parts],
  )
  const bush = useMemo(
    () =>
      parts.bush.map((b) =>
        placed.bushes.map<Inst>((it) => {
          const off = new THREE.Vector3(...b.off).multiplyScalar(it.s).applyAxisAngle(UP, it.r)
          return { pos: new THREE.Vector3(it.x + off.x, off.y, it.z + off.z), scale: it.s, rotY: it.r }
        }),
      ),
    [placed, parts],
  )
  const stems = useMemo<Inst[]>(() => placed.flowers.map((f) => ({ pos: new THREE.Vector3(f.x, 0.08, f.z), scale: 1 })), [placed])
  const petals = useMemo<Inst[]>(() => placed.flowers.map((f) => ({ pos: new THREE.Vector3(f.x, 0.17, f.z), scale: 1, color: f.c })), [placed])

  /* ── See-through trees: like modern games, a tree that hides the character is drawn
     faded instead (the solid one is hidden), checked a few times a second. ── */
  const { camera } = useThree()
  const [faded, setFaded] = useState<number[]>([])
  const fadedKey = useRef('')
  const tick = useRef(0)
  const ghostMats = useMemo(
    () => [parts.trunk.mat, ...parts.cones.map((c) => c.mat)].map((m) => {
      const g = (m as THREE.MeshStandardMaterial).clone()
      g.transparent = true
      g.opacity = 0.28
      g.depthWrite = false
      return g
    }),
    [parts],
  )
  useFrame((_, dt) => {
    const at = focus?.current
    tick.current += dt
    if (!at || tick.current < 0.12) return
    tick.current = 0
    const cx = camera.position.x
    const cz = camera.position.z
    const dx = at.x - cx
    const dz = at.z - cz
    const len2 = dx * dx + dz * dz
    const hits: number[] = []
    if (len2 > 0.01) {
      placed.trees.forEach((tr, i) => {
        // where the tree is along the camera -> character line (0 = camera, 1 = character)
        const t = ((tr.x - cx) * dx + (tr.z - cz) * dz) / len2
        if (t <= 0 || t >= 0.97) return
        const ox = cx + dx * t - tr.x
        const oz = cz + dz * t - tr.z
        const reach = 0.62 * tr.s + 0.45 // tree width + half the character's
        if (ox * ox + oz * oz > reach * reach) return
        // the sight line from the camera to the character's chest, at the tree: below its top?
        const lineY = camera.position.y + (at.y + 1.1 - camera.position.y) * t
        if (lineY < 2.0 * tr.s + 0.2) hits.push(i)
      })
    }
    const key = hits.join(',')
    if (key !== fadedKey.current) {
      fadedKey.current = key
      setFaded(hits)
    }
  })

  return (
    <>
      <Instances geometry={parts.trunk.geo} material={parts.trunk.mat} items={trunk} castShadow hidden={faded} />
      {parts.cones.map((c, i) => (
        <Instances key={`c${i}`} geometry={c.geo} material={c.mat} items={cones[i]} castShadow hidden={faded} />
      ))}
      {faded.map((i) => {
        const tr = placed.trees[i]
        return (
          <group key={`g${i}`} position={[tr.x, 0, tr.z]} rotation={[0, tr.r, 0]} scale={tr.s}>
            <mesh geometry={parts.trunk.geo} material={ghostMats[0]} position={[0, 0.3, 0]} />
            {parts.cones.map((c, k) => (
              <mesh key={k} geometry={c.geo} material={ghostMats[k + 1]} position={[0, c.y, 0]} />
            ))}
          </group>
        )
      })}
      {parts.bush.map((b, i) => (
        <Instances key={`b${i}`} geometry={b.geo} material={b.mat} items={bush[i]} castShadow />
      ))}
      {/* Flowers are tiny: no shadows, saves a full shadow pass for 140 objects. */}
      <Instances geometry={parts.stem.geo} material={parts.stem.mat} items={stems} />
      <Instances geometry={parts.petal.geo} material={parts.petal.mat} items={petals} />
    </>
  )
}

/** Soft clouds drifting across the map (their shadows move over the meadow). All puffs = one instanced mesh. */
export function Clouds() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const clouds = useMemo(() => {
    const rand = rng(9)
    // They circle slowly OUTSIDE the buildings (radius 17-23), so from any side and any height
    // they never cover a building; their shadows still drift over the forest around the map.
    return Array.from({ length: 6 }, (_, i) => ({
      a: (i / 6) * Math.PI * 2 + rand() * 0.5,
      r: 21 + rand() * 6,
      y: 10 + rand() * 1.5,
      speed: 0.012 + rand() * 0.01,
      puffs: Array.from({ length: 5 }, () => ({ x: (rand() - 0.5) * 2.2, y: rand() * 0.4, z: (rand() - 0.5) * 1.1, r: 0.5 + rand() * 0.45 })),
    }))
  }, [])
  const count = clouds.length * 5
  const geo = useMemo(() => new THREE.SphereGeometry(1, 12, 9), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.92 }), [])
  const m = useMemo(() => new THREE.Matrix4(), [])

  useFrame((_, dt) => {
    const mesh = ref.current
    if (!mesh) return
    let i = 0
    for (const c of clouds) {
      c.a += c.speed * dt
      const cx = Math.cos(c.a) * c.r
      const cz = Math.sin(c.a) * c.r * 0.85 - 0.5
      for (const p of c.puffs) {
        m.makeScale(p.r, p.r, p.r).setPosition(cx + p.x, c.y + p.y, cz + p.z)
        mesh.setMatrixAt(i++, m)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={ref} args={[geo, mat, count]} castShadow frustumCulled={false} />
}
