import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { teacherApi } from '../lib/api'
import { useApi } from '../lib/useApi'
import type { PupilSummary, Section } from '../lib/types'
import { Icon } from './TIcon'

export function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fil-PH', { dateStyle: 'medium', timeStyle: 'short' })
}

/** Pupils per section with their progress. Refreshes every 10 s during a session. */
export function PupilsPage() {
  const [params, setParams] = useSearchParams()
  const sectionId = Number(params.get('seksyon')) || undefined
  const sectionsApi = useApi('teacher', '/teacher/sections', teacherApi.sections)
  const sections: Section[] = sectionsApi.data?.sections ?? []
  // Cached list at once; every 10 s a silent check (304 when nothing changed) updates only changed rows.
  const pupilsApi = useApi('teacher', `/teacher/pupils${sectionId ? `?section_id=${sectionId}` : ''}`, () => teacherApi.pupils(sectionId))
  const pupils: PupilSummary[] | null = pupilsApi.data?.pupils ?? null
  const error = pupilsApi.error ? 'Hindi makuha ang listahan.' : null
  const { reload } = pupilsApi

  useEffect(() => {
    const timer = window.setInterval(reload, 10000)
    return () => window.clearInterval(timer)
  }, [reload, sectionId])

  return (
    <div className="t-page">
      <div className="t-page-head">
        <div>
          <h1 className="t-title">Mga Mag-aaral</h1>
          <p className="t-lead">
            Hiwalay ang mga mag-aaral ng bawat seksyon. Kapag bumalik ang bata, pipiliin niya ulit ang seksyon at ilalagay
            ang parehong pangalan para ituloy kung saan siya huminto.
          </p>
        </div>
      </div>

      <div className="tp-tabs tp-tabs-line" role="tablist" aria-label="Seksyon">
        <button type="button" role="tab" aria-selected={!sectionId} className={`tp-tab ${!sectionId ? 'is-active' : ''}`} onClick={() => setParams({})}>
          Lahat
        </button>
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={sectionId === s.id}
            className={`tp-tab ${sectionId === s.id ? 'is-active' : ''}`}
            onClick={() => setParams({ seksyon: String(s.id) })}
          >
            {s.name}
            <span className="tp-tab-count">{s.pupils_count}</span>
          </button>
        ))}
      </div>

      {error && <p className="t-error">{error}</p>}
      {pupils && pupils.length === 0 && <p className="t-empty">Wala pang mag-aaral na naglaro dito.</p>}

      {pupils && pupils.length > 0 && (
        <div className="t-table-wrap">
          <table className="t-table">
            <thead>
              <tr>
                <th>Pangalan</th>
                <th>Seksyon</th>
                <th>Nasaan na</th>
                <th>Sesyon tapos</th>
                <th>Bituin</th>
                <th>Huling laro</th>
                <th aria-label="Buksan" />
              </tr>
            </thead>
            <tbody>
              {pupils.map((p) => (
                <tr key={p.id}>
                  <td className="t-strong">{p.name}</td>
                  <td>{p.section ?? '—'}</td>
                  <td>{p.current ? `${p.current.title} · Sesyon ${p.current.sesyon}` : 'Tapos lahat'}</td>
                  <td>{p.sesyons_completed} / 9</td>
                  <td>
                    <span className="t-stars">
                      <Icon name="star" size={14} /> {p.stars} / {p.max_stars}
                    </span>
                  </td>
                  <td>{formatWhen(p.last_played_at)}</td>
                  <td>
                    <Link className="t-btn t-btn-light" to={`/teacher/mag-aaral/${p.id}`}>
                      Tingnan ang sagot
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
