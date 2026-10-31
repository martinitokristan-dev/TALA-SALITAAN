import { useEffect, useState } from 'react'
import { teacherApi } from '../lib/api'
import { Icon } from './TIcon'

/** The consent text shown inside the CONCENT panel before anyone plays. */
export function SettingsPage() {
  const [text, setText] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    teacherApi.settings().then((r) => setText(r.consent_text), () => setStatus('Hindi makuha ang settings.'))
  }, [])

  async function save() {
    if (text === null) return
    setBusy(true)
    try {
      const r = await teacherApi.saveSettings(text)
      setText(r.consent_text)
      setStatus('Nai-save. Makikita na ito sa CONCENT screen.')
    } catch {
      setStatus('Hindi na-save.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="t-page">
      <div className="t-page-head">
        <div>
          <h1 className="t-title">Pahintulot (Consent)</h1>
          <p className="t-lead">
            Ito ang babasahin ng bata (o ng magulang) sa CONCENT screen bago pindutin ang SUMASANGAYON. Gamitin ang
            assent/consent na nasa inyong research paper. Mag-iwan ng blangkong linya para sa bagong talata.
          </p>
        </div>
      </div>
      {text === null ? (
        <div className="t-loading">Sandali lang…</div>
      ) : (
        <section className="t-section">
          <label className="t-field">
            <span>Teksto ng pahintulot</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} maxLength={5000} />
            <small>{text.length} / 5000</small>
          </label>
          <div className="t-row t-row-end">
            {status && <span className="t-muted">{status}</span>}
            <button className="t-btn t-btn-primary" onClick={save} disabled={busy || !text.trim()}>
              <Icon name="check" size={14} /> I-save
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
