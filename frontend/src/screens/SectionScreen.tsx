import { Navigate, useNavigate } from 'react-router-dom'
import { Scene } from '../art/Scene'
import { ApiError, pupilApi } from '../lib/api'
import { useApi } from '../lib/useApi'
import { flow } from '../lib/flow'
import { BackButton } from '../ui/BackButton'
import { GameTitle } from '../ui/GameTitle'
import { PixelButton } from '../ui/PixelButton'

/**
 * After PUPIL LOGIN: the pupil taps their section (game room), then types their
 * name on TALA-PANGALAN. Each section keeps its own pupils and progress.
 */
export function SectionScreen() {
  const navigate = useNavigate()
  // Cached list at once; opened/closed sections show up through the silent refresh.
  const api = useApi(null, '/sections', pupilApi.sections)
  const sections = api.data?.sections ?? null
  const error = api.error ? (api.error instanceof ApiError ? api.error.message : 'May problema. Subukang muli.') : null

  if (!flow.hasConsent()) return <Navigate to="/pahintulot" replace />

  function choose(s: { id: number; name: string }) {
    flow.setSection(s)
    navigate('/pupil/pangalan')
  }

  return (
    <>
      <BackButton to="/login" />
      <Scene
        title={<GameTitle word="SALITAAN" />}
        footer="PUMILI NG IYONG SEKSYON"
        middle={
          <div className="section-list" role="list">
            {error && <p className="field-error" role="alert">{error}</p>}
            {sections === null && !error && <p className="map-note">Sandali lang…</p>}
            {sections?.length === 0 && (
              <p className="map-note">Wala pang seksyon. Hilingin sa guro na gumawa ng seksyon.</p>
            )}
            {sections?.map((s) => (
              <div role="listitem" key={s.id}>
                <PixelButton size="medium" onClick={() => choose(s)}>
                  {s.name.toUpperCase()}
                </PixelButton>
              </div>
            ))}
          </div>
        }
      />
    </>
  )
}
