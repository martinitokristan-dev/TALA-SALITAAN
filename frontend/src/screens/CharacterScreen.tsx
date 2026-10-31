import { ContactShadows } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Scene } from '../art/Scene'
import { pupilApi, tokens } from '../lib/api'
import { flow } from '../lib/flow'
import type { CharacterKind } from '../lib/types'
import { Character, type CharacterHandle } from '../map3d/Character'
import { BackButton } from '../ui/BackButton'
import { GameTitle } from '../ui/GameTitle'
import { PixelButton } from '../ui/PixelButton'
import { hasWebGL } from '../lib/webgl'

const KINDS: { kind: CharacterKind; label: string }[] = [
  { kind: 'lalaki', label: 'LALAKI' },
  { kind: 'babae', label: 'BABAE' },
]

/** One character standing on its stage disc; the chosen one waves and hops. */
function Pick({ kind, x, chosen, onPick }: { kind: CharacterKind; x: number; chosen: boolean; onPick: () => void }) {
  const ref = useRef<CharacterHandle>(null)
  useEffect(() => {
    if (!chosen) return
    ref.current?.playOnce('Jump', () => ref.current?.playOnce('Wave'))
  }, [chosen])
  return (
    <group
      position={[x, 0, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onPick()
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.36, 40]} />
        <meshStandardMaterial color={chosen ? '#ffe14d' : '#ffffff'} emissive={chosen ? '#ffb000' : '#000000'} emissiveIntensity={chosen ? 0.35 : 0} transparent opacity={chosen ? 0.95 : 0.55} />
      </mesh>
      <Character ref={ref} kind={kind} clip="Idle" />
    </group>
  )
}

/**
 * PILIIN ANG KARAKTER: after TALA-PANGALAN the pupil picks the boy or the girl.
 * The choice is saved for this pupil (server) and on the tablet, then the map opens.
 */
export function CharacterScreen() {
  const navigate = useNavigate()
  const [chosen, setChosen] = useState<CharacterKind | null>(() => (flow.hasCharacter() ? flow.character() : null))
  const [busy, setBusy] = useState(false)
  const [webgl] = useState(hasWebGL)

  if (!tokens.get('pupil')) return <Navigate to="/pupil/pangalan" replace />

  async function start() {
    if (!chosen) return
    setBusy(true)
    flow.setCharacter(chosen)
    // Saving must never block playing: if the server is slow or down, the tablet choice is used.
    await pupilApi.setCharacter(chosen).catch(() => undefined)
    navigate('/mapa', { replace: true })
  }

  return (
    <>
      <BackButton to="/pupil/pangalan" />
      <Scene
        title={<GameTitle word="KARAKTER" prefix="PILIIN ANG " />}
        star={false}
        middle={
          <div className="ch-stage">
            {webgl ? (
              <Canvas
                className="ch-canvas"
                shadows="percentage"
                dpr={[1, 1.5]}
                camera={{ position: [0, 0.75, 2.6], fov: 32 }}
                onCreated={({ camera }) => camera.lookAt(0, 0.45, 0)}
              >
                <hemisphereLight args={['#ffffff', '#7fb069', 1.5]} />
                <directionalLight position={[2, 4, 3]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
                <Suspense fallback={null}>
                  {KINDS.map((k, i) => (
                    <Pick key={k.kind} kind={k.kind} x={i === 0 ? -0.42 : 0.42} chosen={chosen === k.kind} onPick={() => setChosen(k.kind)} />
                  ))}
                  <ContactShadows position={[0, 0.005, 0]} opacity={0.35} scale={3} blur={2.2} far={1} />
                </Suspense>
              </Canvas>
            ) : (
              <p className="ch-note">Pumili sa ibaba.</p>
            )}
          </div>
        }
        footer={<>PUMILI NG IYONG<br />KARAKTER</>}
      >
        <div className="ch-choices" role="radiogroup" aria-label="Karakter">
          {KINDS.map((k) => (
            <button
              key={k.kind}
              type="button"
              role="radio"
              aria-checked={chosen === k.kind}
              className={`ch-choice ${chosen === k.kind ? 'is-chosen' : ''}`}
              onClick={() => setChosen(k.kind)}
            >
              {k.label}
            </button>
          ))}
        </div>
        <PixelButton size="medium" mushroom onClick={start} disabled={!chosen || busy}>
          SIMULAN
        </PixelButton>
      </Scene>
    </>
  )
}
