import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Scene } from '../art/Scene'
import { ApiError, pupilApi } from '../lib/api'
import { flow } from '../lib/flow'
import type { PupilCheck } from '../lib/types'
import { BackButton } from '../ui/BackButton'
import { GameTitle } from '../ui/GameTitle'
import { PixelButton } from '../ui/PixelButton'
import { PixelField } from '../ui/PixelField'
import { Star, StarDefs } from '../ui/StarRow'

/**
 * Design: TALA-PANGALAN, "ILAGAY ANG PANGALAN NG MANLALARO". Comes after choosing the section.
 * After "Ikaw ba ito?" the pupil goes to PAHINTULOT; SUMASANGAYON there signs them in.
 */
export function NameScreen() {
  const navigate = useNavigate()
  // The consent screen sends a name problem back here (e.g. a name the server refused).
  const backError = (useLocation().state as { error?: string } | null)?.error ?? null
  const [name, setName] = useState(() => flow.pendingName() ?? '')
  const [error, setError] = useState<string | null>(backError)
  const [busy, setBusy] = useState(false)
  // "Ikaw ba ito?" step: shown before signing in, for returning and new players alike.
  const [confirm, setConfirm] = useState<PupilCheck | null>(null)
  const section = flow.section()

  // While the pupil types, the two 3D characters download in the background.
  useEffect(() => {
    import('../map3d/Character').then((m) => m.preloadCharacters()).catch(() => undefined)
  }, [])

  if (!section) return <Navigate to="/pupil" replace />

  /** Step 1: look the name up in THIS section only and ask the pupil to confirm. */
  async function submit() {
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    try {
      setConfirm(await pupilApi.check(section!.id, name.trim()))
    } catch (e) {
      // A server without the check step yet (404): go on to the consent screen without the popup.
      if (e instanceof ApiError && e.status === 404) return toConsent(name.trim())
      handleError(e)
    } finally {
      setBusy(false)
    }
  }

  function handleError(e: unknown) {
    if (e instanceof ApiError && e.field('section_id')) {
      navigate('/pupil', { replace: true }) // section was closed; choose again
      return
    }
    setError(e instanceof ApiError ? (e.field('name') ?? e.message) : 'May problema. Subukang muli.')
  }

  /** Step 2 (IPAGPATULOY / MAGSIMULA): on to PAHINTULOT. Nothing is saved until SUMASANGAYON. */
  function toConsent(confirmedName: string) {
    flow.setPendingName(confirmedName)
    navigate('/pahintulot')
  }

  /** KANSELAHIN: not me / wrong name. Back to the name box, cleared. */
  function cancel() {
    setConfirm(null)
    setName('')
    flow.clearPendingName()
  }

  return (
    <>
      <BackButton to="/pupil" />
      <div className="section-tag" aria-label={`Seksyon ${section.name}`}>
        SEKSYON: {section.name.toUpperCase()}
      </div>
      <Scene title={<GameTitle word="PANGALAN" />} footer={<>ILAGAY ANG PANGALAN NG<br />MANLALARO</>}>
        {error && <p className="field-error" role="alert">{error}</p>}
        <PixelField
          label="Pangalan ng manlalaro"
          value={name}
          onChange={(v) => setName(v.replace(/\s{2,}/g, ' '))}
          onSubmit={submit}
          maxLength={20}
          busy={busy}
          autoComplete="given-name"
        />
        {/* Children don't know they can press Enter: a big button right under the name box. */}
        <PixelButton size="medium" className="nm-start" onClick={submit} disabled={busy || !name.trim()}>
          {busy ? 'SANDALI…' : 'SIMULAN'}
        </PixelButton>
      </Scene>
      {confirm && (
        <ConfirmPlayer check={confirm} busy={busy} onCancel={cancel} onContinue={() => toConsent(confirm.name)} />
      )}
    </>
  )
}

/**
 * "Ikaw ba ito?" before signing in. A returning player sees where they stopped (map, sesyon,
 * stage, level); a name new to this section starts from the beginning. Sections are separate:
 * progress from another section never shows up here.
 */
function ConfirmPlayer({ check, busy, onCancel, onContinue }: { check: PupilCheck; busy: boolean; onCancel: () => void; onContinue: () => void }) {
  const r = check.resume
  return (
    <div className="lv-modal nm-confirm" role="dialog" aria-modal="true" aria-labelledby="nm-confirm-title">
      <StarDefs />
      <div className="lv-modal-card">
        <div className={`lv-modal-ribbon ${check.returning ? '' : 'is-soft'}`}>
          <span>{check.returning ? 'IKAW BA ITO?' : 'BAGONG MANLALARO'}</span>
        </div>
        <p id="nm-confirm-title" className="nm-confirm-name">{check.name}</p>
        <p className="nm-confirm-section">SEKSYON: {check.section.name.toUpperCase()}</p>

        {check.returning && r && !r.finished && (
          <dl className="nm-confirm-progress">
            <div><dt>MAP</dt><dd>{r.cycle} · {r.cycle_title}</dd></div>
            <div><dt>SESYON</dt><dd>{r.sesyon}</dd></div>
            <div><dt>STAGE</dt><dd>{r.stage}</dd></div>
            <div><dt>LEVEL</dt><dd>{r.level} <small>({r.level_in_stage} sa {r.stage_total})</small></dd></div>
            <div><dt>BITUIN</dt><dd><Star filled size={18} /> {r.stars}</dd></div>
          </dl>
        )}
        {check.returning && r?.finished && (
          <p className="lv-modal-note">Tapos mo na ang lahat ng mapa! <Star filled size={18} /> {r.stars} bituin</p>
        )}
        {!check.returning && <p className="lv-modal-note">Wala pang laro ang pangalang ito sa seksyong ito. Magsisimula ka sa umpisa.</p>}

        <p className="nm-confirm-ask">{check.returning ? 'Gusto mo bang ipagpatuloy?' : 'Tama ba ang pangalan at seksyon?'}</p>
        <div className="nm-confirm-actions">
          <PixelButton size="small" className="is-cancel" onClick={onCancel} disabled={busy}>
            KANSELAHIN
          </PixelButton>
          <PixelButton size="small" onClick={onContinue} disabled={busy} autoFocus>
            {check.returning ? 'IPAGPATULOY' : 'MAGSIMULA'}
          </PixelButton>
        </div>
      </div>
    </div>
  )
}
