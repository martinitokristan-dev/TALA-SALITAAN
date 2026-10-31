import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, type MutableRefObject, type ReactNode } from 'react'
import type * as THREE from 'three'

/**
 * Turns the character toward `heading` (radians about Y): 0 = facing the viewer,
 * PI = back to the viewer, PI/2 = walking to the right of the screen. Smooth, shortest way round.
 */
export function Facing({ heading, children }: { heading: MutableRefObject<number>; children: ReactNode }) {
  const g = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    const el = g.current
    if (!el) return
    let d = heading.current - el.rotation.y
    d = Math.atan2(Math.sin(d), Math.cos(d))
    el.rotation.y += d * Math.min(1, dt * 9)
  })
  return <group ref={g}>{children}</group>
}

/** Mounted inside the same Suspense as the character: runs once the model has loaded. */
export function Loaded({ onLoaded }: { onLoaded: () => void }) {
  useEffect(() => {
    onLoaded()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
