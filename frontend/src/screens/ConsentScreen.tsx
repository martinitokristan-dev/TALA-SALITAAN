import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { PixelArt } from '../art/PixelArt'
import { useApi } from '../lib/useApi'
import { CLOUD, CLOUD_PALETTE, SPARKLE, SPARKLE_GOLD } from '../art/sprites'
import { BRICK_TILE, PALE_BRICK_TILE } from '../art/tiles'
import { ApiError, publicApi, pupilApi, tokens } from '../lib/api'
import { flow } from '../lib/flow'
import { BackButton } from '../ui/BackButton'
import { OutlinedText } from '../ui/GameTitle'
import { PixelButton } from '../ui/PixelButton'

const DEFAULT_CONSENT =
  'Ako ay pumapayag na maglaro ng Tala-Salitaan. Alam kong ang aking mga sagot ay titingnan ng aking guro upang matulungan akong matuto ng mga bagong salita.'

/**
 * Design: brick frame with the CONCENT title, the agreement text, and SUMASANGAYON.
 * Comes after TALA-PANGALAN ("Ikaw ba ito?"); SUMASANGAYON signs the pupil in, so nothing is
 * saved for a pupil who did not agree.
 */
export function ConsentScreen() {
  const navigate = useNavigate()
  // Cached text at once. If the server can't be reached and nothing is cached,
  // the default text still shows so the flow never gets stuck here.
  const api = useApi(null, '/consent', publicApi.consent)
  const failed = !!api.error
  const text = api.data?.consent_text ?? (failed ? DEFAULT_CONSENT : null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const section = flow.section()
  const name = flow.pendingName()

  if (!section) return <Navigate to="/pupil" replace />
  if (!name) return <Navigate to="/pupil/pangalan" replace />

  async function agree() {
    setBusy(true)
    setError(null)
    try {
      const res = await pupilApi.login(section!.id, name!)
      tokens.set('pupil', res.token)
      flow.clearPendingName()
      flow.setPupilName(res.pupil.name)
      flow.clearPositions()
      // Returning pupil: the character picked last time is chosen already on the next screen.
      if (res.pupil.character) flow.setCharacter(res.pupil.character)
      else flow.clearCharacter()
      navigate('/pupil/karakter')
    } catch (e) {
      setBusy(false)
      if (e instanceof ApiError && e.field('section_id')) return navigate('/pupil', { replace: true }) // section was closed
      if (e instanceof ApiError && e.field('name')) {
        return navigate('/pupil/pangalan', { replace: true, state: { error: e.field('name') } })
      }
      setError(e instanceof ApiError ? e.message : 'May problema. Subukang muli.')
    }
  }

  return (
    <div className="consent-scene">
      <BackButton to="/pupil/pangalan" />
      <div className="consent-glow" aria-hidden />
      <PixelArt rows={CLOUD} palette={CLOUD_PALETTE} className="deco consent-cloud-left" />
      <PixelArt rows={CLOUD} palette={CLOUD_PALETTE} className="deco consent-cloud-right" />
      <PixelArt rows={SPARKLE} palette={SPARKLE_GOLD} className="deco consent-sparkle cs1" />
      <PixelArt rows={SPARKLE} palette={SPARKLE_GOLD} className="deco consent-sparkle cs2" />
      <PixelArt rows={SPARKLE} palette={SPARKLE_GOLD} className="deco consent-sparkle cs3" />
      <PixelArt rows={SPARKLE} palette={SPARKLE_GOLD} className="deco consent-sparkle cs4" />

      <section className="consent-frame" style={{ backgroundImage: BRICK_TILE }} aria-labelledby="consent-title">
        <h1 id="consent-title" className="consent-title">
          <OutlinedText text="CONCENT" className="consent-title-text" />
        </h1>
        <div className="consent-paper" style={{ backgroundImage: PALE_BRICK_TILE }}>
          <div className="consent-text">
            {text === null && <p className="consent-muted">Sandali lang…</p>}
            {text?.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
            {failed && <p className="consent-muted">(Hindi maabot ang server. Buksan ang backend: php artisan serve.)</p>}
          </div>
        </div>
      </section>

      <div className="consent-action">
        {error && <p className="field-error" role="alert">{error}</p>}
        <PixelButton size="medium" onClick={agree} disabled={text === null || busy}>
          {busy ? 'SANDALI…' : 'SUMASANGAYON'}
        </PixelButton>
      </div>
    </div>
  )
}
