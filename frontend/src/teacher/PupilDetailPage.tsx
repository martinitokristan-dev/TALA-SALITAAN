import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { peek, teacherApi } from '../lib/api'
import type { PupilAnswerRow, PupilDetail } from '../lib/types'
import { useLive } from '../lib/useApi'
import { Icon } from './TIcon'
import { formatWhen } from './PupilsPage'
import { ActionMenu, ConfirmDialog, useToast } from './ui'

const MAP_NAMES: Record<number, string> = { 1: 'Tuklas-Larawan', 2: 'Tuklas-Pangungusap', 3: 'Tuklas-Sitwasyon' }

const STAGE_NAMES: Record<number, Record<number, string>> = {
  1: { 1: 'Ginulong letra', 2: '4 na larawan' },
  2: { 1: 'Ginulong letra', 2: 'I-drag sa pangungusap' },
  3: { 1: 'Ginulong letra', 2: 'Sitwasyon (a, b, c)' },
}

/** One pupil: progress per castle and sesyon, plus every answer tried. */
export function PupilDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<PupilDetail | null>(() => peek<PupilDetail>('teacher', `/teacher/pupils/${id}`) ?? null)
  useLive<PupilDetail>('teacher', `/teacher/pupils/${id}`, setData)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [tab, setTab] = useState<'progress' | 'answers'>('progress')
  const [ask, setAsk] = useState<'reset' | 'delete' | null>(null)
  const [busy, setBusy] = useState(false)
  const { toast, toastNode } = useToast()

  const load = useCallback(() => {
    teacherApi.pupil(Number(id)).then(setData, () => setError('Hindi makuha ang datos ng mag-aaral.'))
  }, [id])

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 10000)
    return () => window.clearInterval(timer)
  }, [load])

  const groups = useMemo(() => {
    const map = new Map<string, PupilAnswerRow[]>()
    for (const row of data?.results ?? []) {
      const key = `${row.cycle}-${row.sesyon}-${row.stage}`
      if (filter !== 'all' && !key.startsWith(filter)) continue
      map.set(key, [...(map.get(key) ?? []), row])
    }
    return [...map.entries()]
  }, [data, filter])

  async function reset() {
    if (!data) return
    setBusy(true)
    await teacherApi.resetPupil(data.pupil.id).catch(() => setError('Hindi na-reset.'))
    setBusy(false)
    setAsk(null)
    toast('Na-reset ang progress')
    load()
  }

  async function remove() {
    if (!data) return
    setBusy(true)
    await teacherApi.deletePupil(data.pupil.id)
    navigate('/teacher/mag-aaral', { replace: true })
  }

  if (error) return <p className="t-error">{error}</p>
  if (!data) return <div className="t-loading">Sandali lang…</div>

  return (
    <div className="t-page">
      <Link to="/teacher/mag-aaral" className="t-back">
        <Icon name="back" size={14} /> Bumalik sa lahat ng mag-aaral
      </Link>
      <div className="t-page-head">
        <h1 className="t-title">
          {data.pupil.name}
          {data.pupil.section && <span className="t-muted" style={{ fontSize: 14, display: 'block' }}>Seksyon {data.pupil.section}</span>}
        </h1>
        <ActionMenu
          label={`Mga gagawin kay ${data.pupil.name}`}
          items={[
            { label: 'I-reset ang progress', icon: 'reset', hint: 'Magsisimula ulit sa simula', danger: true, onSelect: () => setAsk('reset') },
            { label: 'Tanggalin ang mag-aaral', icon: 'trash', danger: true, onSelect: () => setAsk('delete') },
          ]}
        />
      </div>

      <ConfirmDialog
        open={ask === 'reset'}
        title={`I-reset ang progress ni ${data.pupil.name}?`}
        confirmLabel="I-reset"
        busy={busy}
        onConfirm={reset}
        onClose={() => setAsk(null)}
      >
        <p>
          Mabubura ang lahat ng kanyang sagot at bituin, at magsisimula siya ulit sa <b>Tuklas-Larawan, Sesyon 1</b>. Hindi na ito
          maibabalik.
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={ask === 'delete'}
        title={`Tanggalin si ${data.pupil.name}?`}
        confirmLabel="Tanggalin"
        busy={busy}
        onConfirm={remove}
        onClose={() => setAsk(null)}
      >
        <p>
          Matatanggal siya sa seksyon <b>{data.pupil.section}</b> kasama ang lahat ng kanyang sagot. Hindi na ito maibabalik.
        </p>
      </ConfirmDialog>
      {toastNode}

      <div className="tp-tabs tp-tabs-line" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'progress'} className={`tp-tab ${tab === 'progress' ? 'is-active' : ''}`} onClick={() => setTab('progress')}>
          Progress
        </button>
        <button type="button" role="tab" aria-selected={tab === 'answers'} className={`tp-tab ${tab === 'answers' ? 'is-active' : ''}`} onClick={() => setTab('answers')}>
          Mga sagot
          <span className="tp-tab-count">{data.results.length}</span>
        </button>
      </div>

      {tab === 'progress' && (
      <div className="t-progress-grid">
        {data.progress.map((c) => (
          <section key={c.cycle} className="t-progress-card">
            <h2>
              {c.title}
            </h2>
            <ul>
              {c.sesyons.map((s) => (
                <li key={s.sesyon} className={`t-ses is-${s.status}`}>
                  <span className="t-ses-name">
                    {s.status === 'locked' && <Icon name="lock" size={12} />} Sesyon {s.sesyon}
                  </span>
                  <span className="t-ses-meta">
                    Stage 1: {s.stage1_done}/{s.word_count} · Stage 2: {s.stage2_done}/{s.word_count}
                  </span>
                  <span className="t-stars">
                    <Icon name="star" size={12} /> {s.stars}/{s.max_stars}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      )}

      {tab === 'answers' && (
      <>
      <div className="t-row t-filter">
        <label>
          Ipakita:{' '}
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Lahat</option>
            {[1, 2, 3].flatMap((c) =>
              [1, 2, 3].map((s) => (
                <option key={`${c}-${s}`} value={`${c}-${s}-`}>
                  {MAP_NAMES[c]} · Sesyon {s}
                </option>
              )),
            )}
          </select>
        </label>
      </div>

      {groups.length === 0 && <p className="t-empty">Wala pang sagot dito.</p>}

      {groups.map(([key, rows]) => {
        const [cycle, sesyon, stage] = key.split('-').map(Number)
        return (
          <section key={key} className="t-answers">
            <h3>
              {MAP_NAMES[cycle]} · Sesyon {sesyon} · Stage {stage} — {STAGE_NAMES[cycle][stage]}
            </h3>
            <div className="t-table-wrap">
              <table className="t-table">
                <thead>
                  <tr>
                    <th>Salita</th>
                    <th>Mga sagot (sunod-sunod)</th>
                    <th>Bituin</th>
                    <th>Natapos</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td className="t-strong">{r.word}</td>
                      <td>
                        <ol className="t-attempts">
                          {r.answers.map((a) => (
                            <li key={a.attempt_no} className={a.is_correct ? 'is-right' : 'is-wrong'}>
                              <Icon name={a.is_correct ? 'check' : 'close'} size={11} /> {a.answer}
                            </li>
                          ))}
                        </ol>
                        {!r.finished_at && <span className="t-muted"> (naglalaro pa)</span>}
                      </td>
                      <td>
                        <span className="t-stars">
                          <Icon name="star" size={12} /> {r.stars}
                        </span>
                      </td>
                      <td>{formatWhen(r.finished_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
      </>
      )}
    </div>
  )
}
