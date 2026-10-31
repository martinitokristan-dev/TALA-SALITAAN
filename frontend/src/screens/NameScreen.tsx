import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Scene } from '../art/Scene'
import { ApiError, pupilApi, tokens } from '../lib/api'
import { flow } from '../lib/flow'
import { BackButton } from '../ui/BackButton'
import { GameTitle } from '../ui/GameTitle'
import { PixelField } from '../ui/PixelField'

/** Design: TALA-PANGALAN, "ILAGAY ANG PANGALAN NG MANLALARO". Comes after choosing the section. */
export function NameScreen() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const section = flow.section()

  // While the pupil types, the two 3D characters download in the background.
  useEffect(() => {
    import('../map3d/Character').then((m) => m.preloadCharacters()).catch(() => undefined)
  }, [])

  if (!flow.hasConsent()) return <Navigate to="/pahintulot" replace />
  if (!section) return <Navigate to="/pupil" replace />

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const res = await pupilApi.login(section!.id, name.trim())
      tokens.set('pupil', res.token)
      flow.setPupilName(res.pupil.name)
      flow.clearPositions()
      // Returning pupil: the character picked last time is chosen already on the next screen.
      if (res.pupil.character) flow.setCharacter(res.pupil.character)
      else flow.clearCharacter()
      navigate('/pupil/karakter')
    } catch (e) {
      if (e instanceof ApiError && e.field('section_id')) {
        navigate('/pupil', { replace: true }) // section was closed; choose again
        return
      }
      setError(e instanceof ApiError ? (e.field('name') ?? e.message) : 'May problema. Subukang muli.')
    } finally {
      setBusy(false)
    }
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
      </Scene>
    </>
  )
}
