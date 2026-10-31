import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, peek, teacherApi } from '../lib/api'
import type { Section } from '../lib/types'
import { useLive } from '../lib/useApi'
import { Icon } from './TIcon'
import { ActionMenu, ConfirmDialog, PromptDialog, Switch, useToast } from './ui'

/** "Grade 3 - Rosal" -> "RO": the section's own name, not the grade. */
function avatarOf(name: string): string {
  const parts = name.split(/[\s-]+/).filter((w) => w && !/^(grade|baitang)$/i.test(w) && !/^\d+$/.test(w))
  return (parts.at(-1) ?? name).slice(0, 2).toUpperCase()
}

/**
 * Sections (game rooms). Pupils pick their section before typing their name,
 * so each section has its own pupils and saved progress.
 * Row actions: on/off switch inline, everything else behind the ⋯ menu.
 */
export function SectionsPage() {
  const navigate = useNavigate()
  const [sections, setSections] = useState<Section[] | null>(() => peek<{ sections: Section[] }>('teacher', '/teacher/sections')?.sections ?? null)
  useLive<{ sections: Section[] }>('teacher', '/teacher/sections', (d) => setSections(d.sections))
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [renaming, setRenaming] = useState<Section | null>(null)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Section | null>(null)
  const { toast, toastNode } = useToast()

  useEffect(() => {
    teacherApi.sections().then((r) => setSections(r.sections), () => setError('Hindi makuha ang mga seksyon.'))
  }, [])

  const replace = (s: Section) => setSections((list) => list?.map((x) => (x.id === s.id ? s : x)) ?? null)

  async function add(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const r = await teacherApi.addSection(name.trim())
      setSections((s) => [...(s ?? []), r.section].sort((a, b) => a.name.localeCompare(b.name)))
      setName('')
      toast(`Nadagdag ang ${r.section.name}`)
    } catch (err) {
      setError(err instanceof ApiError ? (err.field('name') ?? err.message) : 'Hindi na-save.')
    } finally {
      setBusy(false)
    }
  }

  async function setActive(s: Section, next: boolean) {
    replace({ ...s, is_active: next }) // update right away; undo if the server says no
    try {
      replace((await teacherApi.updateSection(s.id, { is_active: next })).section)
      toast(next ? `Nakabukas na ang ${s.name}` : `Nakasarado na ang ${s.name}`)
    } catch {
      replace(s)
      setError('Hindi nabago ang kalagayan. Subukang muli.')
    }
  }

  async function setDemo(s: Section, next: boolean) {
    try {
      replace((await teacherApi.updateSection(s.id, { is_demo: next })).section)
      toast(next ? `Naka-demo mode na ang ${s.name}` : `Tinigil ang demo mode ng ${s.name}`)
    } catch {
      setError('Hindi nabago ang demo mode. Subukang muli.')
    }
  }

  async function rename(value: string) {
    if (!renaming) return
    setBusy(true)
    setRenameError(null)
    try {
      replace((await teacherApi.updateSection(renaming.id, { name: value })).section)
      setRenaming(null)
      toast('Napalitan ang pangalan')
    } catch (err) {
      setRenameError(err instanceof ApiError ? (err.field('name') ?? err.message) : 'Hindi na-save.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!deleting) return
    setBusy(true)
    try {
      await teacherApi.deleteSection(deleting.id)
      setSections((list) => list?.filter((x) => x.id !== deleting.id) ?? null)
      toast(`Nabura ang ${deleting.name}`)
      setDeleting(null)
    } catch {
      setError('Hindi nabura. Subukang muli.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="t-page">
      <div className="t-page-head">
        <div>
          <h1 className="t-title">Mga Seksyon</h1>
          <p className="t-lead">
            Pipiliin ng bata ang kanyang seksyon bago ilagay ang pangalan. Hiwalay ang mga mag-aaral at progress ng bawat
            seksyon. Ang mga <b>nakabukas</b> lang ang makikita ng bata.
          </p>
        </div>
      </div>

      {error && <p className="t-error">{error}</p>}

      <form className="tp-addbar" onSubmit={add}>
        <span className="tp-addbar-icon">
          <Icon name="sections" size={18} />
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Pangalan ng bagong seksyon, hal. Grade 3 - Rosal"
          aria-label="Pangalan ng bagong seksyon"
        />
        <button type="submit" className="t-btn t-btn-primary" disabled={busy || !name.trim()}>
          <Icon name="plus" size={16} /> Idagdag
        </button>
      </form>

      {sections?.length === 0 && <p className="t-empty">Wala pang seksyon. Gumawa muna bago maglaro ang mga bata.</p>}

      {sections && sections.length > 0 && (
        <div className="t-table-wrap">
          <table className="t-table tp-list">
            <thead>
              <tr>
                <th>Seksyon</th>
                <th>Mag-aaral</th>
                <th>Makikita ng bata</th>
                <th aria-label="Mga gagawin" />
              </tr>
            </thead>
            <tbody>
              {sections.map((s) => (
                <tr key={s.id} className={s.is_active ? '' : 'is-muted'}>
                  <td>
                    <div className="tp-cell-title">
                      <span className="tp-cell-avatar">{avatarOf(s.name)}</span>
                      <span className="t-strong">{s.name}</span>
                      {s.is_demo && (
                        <span className="t-badge is-demo" title="Bukas lahat ng map at sesyon, 2 tanong bawat sesyon">
                          Demo mode
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <Link className="tp-link" to={`/teacher/mag-aaral?seksyon=${s.id}`}>
                      <Icon name="pupils" size={15} /> {s.pupils_count} mag-aaral
                    </Link>
                  </td>
                  <td>
                    <Switch
                      checked={s.is_active}
                      onChange={(next) => setActive(s, next)}
                      label={`Ipakita ang ${s.name} sa mga bata`}
                      onText="Nakabukas"
                      offText="Nakasarado"
                    />
                  </td>
                  <td className="tp-cell-actions">
                    <ActionMenu
                      label={`Mga gagawin sa ${s.name}`}
                      items={[
                        { label: 'Tingnan ang mga mag-aaral', icon: 'pupils', onSelect: () => navigate(`/teacher/mag-aaral?seksyon=${s.id}`) },
                        {
                          label: 'Palitan ang pangalan',
                          icon: 'rename',
                          onSelect: () => {
                            setRenameError(null)
                            setRenaming(s)
                          },
                        },
                        {
                          label: s.is_active ? 'Isarado' : 'Buksan',
                          icon: s.is_active ? 'lock' : 'eye',
                          hint: s.is_active ? 'Itago sa mga bata' : 'Ipakita sa mga bata',
                          onSelect: () => setActive(s, !s.is_active),
                        },
                        {
                          label: s.is_demo ? 'Itigil ang demo mode' : 'Gawing demo mode',
                          icon: s.is_demo ? 'lock' : 'puzzle',
                          hint: s.is_demo ? 'Babalik sa tunay na laro' : 'Pang-test: bukas lahat, 2 tanong bawat sesyon',
                          onSelect: () => setDemo(s, !s.is_demo),
                        },
                        { label: 'Burahin ang seksyon', icon: 'trash', danger: true, onSelect: () => setDeleting(s) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PromptDialog
        open={!!renaming}
        title="Palitan ang pangalan ng seksyon"
        label="Pangalan ng seksyon"
        initial={renaming?.name ?? ''}
        submitLabel="I-save"
        error={renameError}
        busy={busy}
        onSubmit={rename}
        onClose={() => setRenaming(null)}
      />

      <ConfirmDialog
        open={!!deleting}
        title={`Burahin ang ${deleting?.name ?? ''}?`}
        confirmLabel="Burahin"
        busy={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      >
        <p>
          Mabubura ang seksyon at ang <b>{deleting?.pupils_count ?? 0} mag-aaral</b> nito, kasama ang lahat ng kanilang sagot at
          bituin. <b>Hindi na ito maibabalik.</b>
        </p>
        {deleting?.is_active && <p className="t-muted">Kung itatago lang sa mga bata, gamitin ang <b>Isarado</b> sa halip.</p>}
      </ConfirmDialog>

      {toastNode}
    </div>
  )
}
