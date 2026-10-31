import { useEffect, useState } from 'react'
import { ApiError, peek, teacherApi } from '../lib/api'
import { FEEDBACK_INFO, FEEDBACK_KINDS, type FeedbackKind } from '../lib/feedback'
import type { FeedbackClip } from '../lib/types'
import { useLive } from '../lib/useApi'
import { AudioField } from './media'
import { ActionMenu, ConfirmDialog, Switch, useToast } from './ui'

/**
 * The teacher's voice clips for the game, one box per moment (correct first try, wrong with
 * 2 tries left, ...). The game plays only a clip of the moment that really happened.
 */
export function VoicePage() {
  const [clips, setClips] = useState<FeedbackClip[]>(() => peek<{ clips: FeedbackClip[] }>('teacher', '/teacher/feedback-clips')?.clips ?? [])
  useLive<{ clips: FeedbackClip[] }>('teacher', '/teacher/feedback-clips', (d) => setClips(d.clips))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<FeedbackKind>('tama_una')
  const [deleting, setDeleting] = useState<FeedbackClip | null>(null)
  const { toast, toastNode } = useToast()

  useEffect(() => {
    teacherApi.clips().then((r) => setClips(r.clips), () => setError('Hindi makuha ang mga boses.'))
  }, [])

  const activeCount = (kind: FeedbackKind) => clips.filter((c) => c.kind === kind && c.is_active).length

  async function add(kind: FeedbackKind, file: File) {
    setBusy(true)
    setError(null)
    const form = new FormData()
    form.append('kind', kind)
    form.append('audio', file)
    try {
      const r = await teacherApi.addClip(form)
      setClips((c) => [r.clip, ...c])
    } catch (e) {
      setError(e instanceof ApiError ? (e.field('audio') ?? e.message) : 'Hindi na-save.')
    } finally {
      setBusy(false)
    }
  }

  async function toggle(clip: FeedbackClip) {
    const r = await teacherApi.toggleClip(clip.id)
    setClips((c) => c.map((x) => (x.id === clip.id ? r.clip : x)))
  }

  async function move(clip: FeedbackClip, kind: FeedbackKind) {
    const r = await teacherApi.moveClip(clip.id, kind)
    setClips((c) => c.map((x) => (x.id === clip.id ? r.clip : x)))
    toast(`Nailipat sa "${FEEDBACK_INFO[kind].title}"`)
  }

  async function remove(clip: FeedbackClip) {
    await teacherApi.deleteClip(clip.id)
    setClips((c) => c.filter((x) => x.id !== clip.id))
    setDeleting(null)
    toast('Nabura ang boses')
  }

  const info = FEEDBACK_INFO[tab]
  const list = clips.filter((c) => c.kind === tab)

  return (
    <div className="t-page">
      <div className="t-page-head">
        <div>
          <h1 className="t-title">Boses ng Guro</h1>
          <p className="t-lead">
            Mag-record para sa bawat sandali ng laro. Ang boses lang ng sandaling nangyari ang maririnig ng bata. Kapag walang boses ang isang sandali, tahimik
            lang ang laro.
          </p>
        </div>
      </div>
      {error && <p className="t-error">{error}</p>}

      <div className="tp-tabs tp-tabs-line t-voice-tabs" role="tablist" aria-label="Sandali ng laro">
        {FEEDBACK_KINDS.map((kind) => {
          const n = activeCount(kind)
          return (
            <button
              key={kind}
              type="button"
              role="tab"
              aria-selected={tab === kind}
              className={`tp-tab ${tab === kind ? 'is-active' : ''} ${FEEDBACK_INFO[kind].good ? 'is-good' : 'is-wrong'}`}
              onClick={() => setTab(kind)}
            >
              {FEEDBACK_INFO[kind].title}
              <span className={`tp-tab-count ${n === 0 ? 'is-empty' : ''}`} title={n === 0 ? 'Wala pang boses' : `${n} ginagamit`}>
                {n === 0 ? 'Wala pa' : n}
              </span>
            </button>
          )
        })}
      </div>

      <div className="t-voice-grid">
        <section className="t-section">
          <header className="t-section-head">
            <div>
              <h3>{info.title}</h3>
              <p>
                <b>Kailan tumutunog:</b> {info.when}
              </p>
              <p>
                <b>Sabihin nang eksakto (ito rin ang nakasulat sa laro):</b> {info.example}
              </p>
            </div>
          </header>
          {activeCount(tab) === 0 && <p className="t-voice-empty">Wala pang boses para sa sandaling ito. Tahimik ang laro rito hangga't walang naka-record.</p>}
          <AudioField url={null} onPick={(file) => add(tab, file)} busy={busy} maxSeconds={8} />
          <ul className="t-clip-list">
            {list.map((clip) => (
              <li key={clip.id} className={clip.is_active ? '' : 'is-off'}>
                {clip.audio_url && <audio controls preload="none" src={clip.audio_url} />}
                <Switch checked={clip.is_active} onChange={() => toggle(clip)} label="Gamitin ang boses na ito" onText="Ginagamit" offText="Hindi ginagamit" />
                <span style={{ marginLeft: 'auto' }}>
                  <ActionMenu
                    label="Mga gagawin sa boses"
                    items={[
                      { label: clip.is_active ? 'Itigil ang paggamit' : 'Gamitin', icon: clip.is_active ? 'stop' : 'play', onSelect: () => toggle(clip) },
                      ...FEEDBACK_KINDS.filter((k) => k !== clip.kind).map((k) => ({
                        label: `Ilipat sa: ${FEEDBACK_INFO[k].title}`,
                        icon: 'swap',
                        onSelect: () => move(clip, k),
                      })),
                      { label: 'Burahin ang boses', icon: 'trash', danger: true, onSelect: () => setDeleting(clip) },
                    ]}
                  />
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <ConfirmDialog
        open={!!deleting}
        title="Burahin ang boses na ito?"
        confirmLabel="Burahin"
        onConfirm={() => deleting && remove(deleting)}
        onClose={() => setDeleting(null)}
      >
        <p>Hindi na ito maririnig ng mga bata at hindi na maibabalik. Kung pansamantala lang, i-off na lang ang switch.</p>
      </ConfirmDialog>
      {toastNode}
    </div>
  )
}
