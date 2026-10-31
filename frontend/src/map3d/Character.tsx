import { useAnimations, useGLTF } from '@react-three/drei'
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { CharacterKind } from '../lib/types'

/*
 * The pupil's 3D character (made in Blender: art3d/karakter.blend).
 * One GLB per character with 4 clips: Idle (2 s loop), Walk (0.83 s loop = 2 steps),
 * Wave (1.4 s) and Jump (0.8 s). Draco-compressed; the decoder is served from /draco/
 * so it is cached by the service worker like everything else.
 */

export const CHARACTER_URL: Record<CharacterKind, string> = {
  lalaki: '/models/karakter-lalaki.glb',
  babae: '/models/karakter-babae.glb',
}
const DRACO = '/draco/'

export type CharacterClip = 'Idle' | 'Walk' | 'Wave' | 'Jump'

/** Start downloading both characters early (e.g. on the name screen). */
export function preloadCharacters() {
  useGLTF.preload(CHARACTER_URL.lalaki, DRACO)
  useGLTF.preload(CHARACTER_URL.babae, DRACO)
}

export interface CharacterHandle {
  group: THREE.Group | null
  /** Play a one-shot clip (Wave / Jump), then go back to the looping clip. */
  playOnce: (clip: 'Wave' | 'Jump', then?: () => void) => void
}

/**
 * Animated character. `clip` is the looping clip (Idle or Walk); `speed` scales it,
 * so the steps can match how fast the character moves along a path.
 */
export const Character = forwardRef<
  CharacterHandle,
  { kind: CharacterKind; clip?: 'Idle' | 'Walk'; speed?: number; scale?: number; shadows?: boolean }
>(function Character({ kind, clip = 'Idle', speed = 1, scale = 1, shadows = true }, ref) {
  const gltf = useGLTF(CHARACTER_URL[kind], DRACO)
  // A clone per use: the same GLB can be on several screens with its own skeleton.
  const scene = useMemo(() => {
    const s = cloneSkinned(gltf.scene)
    s.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = shadows
        o.frustumCulled = false // skinned bounds move with the animation
      }
    })
    return s
  }, [gltf.scene, shadows])
  const group = useRef<THREE.Group>(null)
  const { actions, mixer } = useAnimations(gltf.animations, group)
  const oneShot = useRef(false)
  // Latest looping clip/speed: a one-shot (Jump/Wave) started just before the parent switched
  // Walk -> Idle must go back to Idle, not to the clip that was playing when it started.
  const loopRef = useRef({ clip, speed })
  loopRef.current = { clip, speed }

  // Looping clip with a short cross-fade.
  useEffect(() => {
    if (oneShot.current) return
    const next = actions[clip]
    if (!next) return
    next.reset().setEffectiveTimeScale(speed).fadeIn(0.18).play()
    return () => {
      next.fadeOut(0.18)
    }
  }, [actions, clip, speed])

  useEffect(() => {
    const a = actions[clip]
    if (a) a.setEffectiveTimeScale(speed)
  }, [actions, clip, speed])

  useImperativeHandle(
    ref,
    () => ({
      get group() {
        return group.current
      },
      playOnce(name, then) {
        const a = actions[name]
        if (!a) return then?.()
        oneShot.current = true
        a.reset().setLoop(THREE.LoopOnce, 1)
        a.clampWhenFinished = true
        a.setEffectiveTimeScale(1)
        for (const k of ['Idle', 'Walk'] as const) actions[k]?.fadeOut(0.12)
        a.fadeIn(0.12).play()
        const done = (e: { action: THREE.AnimationAction }) => {
          if (e.action !== a) return
          mixer.removeEventListener('finished', done)
          oneShot.current = false
          a.fadeOut(0.2)
          const now = loopRef.current
          actions[now.clip]?.reset().setEffectiveTimeScale(now.speed).fadeIn(0.2).play()
          then?.()
        }
        mixer.addEventListener('finished', done)
      },
    }),
    [actions, mixer],
  )

  return (
    <group ref={group} scale={scale} dispose={null}>
      <primitive object={scene} />
    </group>
  )
})
