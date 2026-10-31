import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { pupilApi, tokens } from '../lib/api'
import { useApi } from '../lib/useApi'
import { flow } from '../lib/flow'
import type { CycleProgress, SesyonProgress } from '../lib/types'
import { Icon } from '../ui/Icon'
import { PixelButton } from '../ui/PixelButton'
import { Star, StarDefs } from '../ui/StarRow'
import { hasWebGL } from '../lib/webgl'

// The 3D map (three.js) loads only when a pupil reaches the map.
const WorldMap = lazy(() => import('../map3d/WorldMap'))

/** If the 3D map cannot run on a device, show the simple castle list instead. */
class MapBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/**
 * Map of the 3 maps (Tuklas-Larawan, Tuklas-Pangungusap, Tuklas-Sitwasyon).
 * Stays mounted while the pupil is on a level path or playing (GameShell), so going back is
 * instant: no new WebGL context, no model reload. While hidden the 3D loop is paused.
 */
export function MapScreen({ active = true }: { active?: boolean }) {
  const navigate = useNavigate()
  const signedIn = !!tokens.get('pupil')
  // Cached progress shows at once; a silent check updates only what changed.
  const { data, error, reload } = useApi('pupil', signedIn ? '/game/progress' : null, pupilApi.progress)
  const cycles = data?.cycles ?? null
  const [webgl] = useState(hasWebGL)

  // Coming back from a level path: check (quietly) for new stars and unlocked maps.
  useEffect(() => {
    if (active && signedIn) reload()
  }, [active, signedIn, reload])

  if (!signedIn || (error && !cycles)) return <Navigate to="/" replace />

  async function logout() {
    await pupilApi.logout().catch(() => undefined)
    tokens.clear('pupil')
    flow.reset()
    navigate('/', { replace: true })
  }

  const open = (cycle: number, sesyon: number) => navigate(`/mapa/${cycle}/${sesyon}`)
  const totalStars = cycles?.reduce((s, c) => s + c.stars, 0) ?? 0
  const list = cycles ? <CastleList cycles={cycles} onOpen={open} /> : null

  return (
    // inert (not aria-hidden): while parked under the level path it can neither keep nor get focus
    <div className={`m3-screen ${active ? '' : 'is-parked'}`} inert={!active}>
      <StarDefs />
      {cycles && webgl ? (
        <MapBoundary fallback={<div className="wm-screen wm-fallback">{list}</div>}>
          <Suspense fallback={<div className="m3-loading">Inihahanda ang mapa…</div>}>
            <WorldMap cycles={cycles} onOpenSesyon={open} active={active} character={flow.character()} />
          </Suspense>
        </MapBoundary>
      ) : (
        <div className="wm-screen wm-fallback">{list ?? <p className="wm-note">Sandali lang…</p>}</div>
      )}

      <header className="m3-header">
        <span className="wm-player">{flow.pupilName()}</span>
        <span className="lv-stars-total">
          <Star filled size={20} />
          <span>{totalStars}</span>
        </span>
        <PixelButton size="small" onClick={logout}>
          LUMABAS
        </PixelButton>
      </header>
      {cycles && webgl && <p className="m3-hint">Pumili ng map · I-drag para iikot</p>}
    </div>
  )
}

/** Simple castle list (used when 3D is not available). */
function CastleList({ cycles, onOpen }: { cycles: CycleProgress[]; onOpen: (c: number, s: number) => void }) {
  function label(s: SesyonProgress) {
    if (s.status === 'locked') return <><Icon name="lock" size={12} /> Naka-lock</>
    if (!s.ready) return <>Hindi pa handa</>
    return <><Star filled size={14} /> {s.stars}/{s.max_stars}</>
  }

  return (
    <div className="wm-list">
      {cycles.map((c, ci) => (
        <section key={c.cycle} className={`wm-card ${c.status === 'locked' ? 'is-locked' : ''}`} style={{ animationDelay: `${ci * 120}ms` }}>
          <div className="wm-card-head">
            <div>
              <span className="wm-card-kicker">MAP</span>
              <h2 className="wm-card-title">{c.title}</h2>
            </div>
            <span className="wm-ses-meta">
              <Star filled size={18} /> {c.stars}/{c.max_stars}
            </span>
          </div>
          <div className="wm-sesyons">
            {c.sesyons.map((s) => (
              <button
                key={s.sesyon}
                className={`wm-ses is-${s.status}`}
                disabled={s.status === 'locked' || !s.ready}
                onClick={() => onOpen(c.cycle, s.sesyon)}
              >
                SESYON {s.sesyon}
                <span className="wm-ses-meta">{label(s)}</span>
                <span className="wm-ses-meta">{s.word_count * 2} level</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
