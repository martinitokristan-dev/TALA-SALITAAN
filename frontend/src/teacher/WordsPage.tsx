import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { peek, teacherApi } from '../lib/api'
import type { TeacherWord } from '../lib/types'
import { useLive } from '../lib/useApi'
import { Icon } from './TIcon'
import { ActionMenu, ConfirmDialog, Drawer, type MenuItem } from './ui'
import { BasicsSection, DistractorSection, picturePlaces, SentenceSection, SituationSection, useRunner, type EditPart } from './WordEditor'

type SetKey = 'A' | 'B'
type Stage = 1 | 2

/** From the guide and notebook: what the pupil does in each castle's two stages. */
const CYCLES = [
  {
    n: 1,
    title: 'Tuklas-Larawan',
    color: '#e8302a',
    stage1: 'Jumbled word game sa bawat salita. Pagkabuo, awtomatikong tutunog ang bigkas ng salita.',
    stage1Name: 'Ginulong letra + bigkas',
    stage2: '4 na larawan, 1 ang tamang larawan na naglalarawan sa salita. Nasa ilalim ng mga larawan ang kahulugan.',
    stage2Name: '4 na larawan',
    meaningHint: 'Lalabas sa ilalim ng 4 na larawan sa Stage 2.',
  },
  {
    n: 2,
    title: 'Tuklas-Pangungusap',
    color: '#1d7fe0',
    stage1: 'Jumbled word game. Nasa ilalim ng salita ang kahulugan.',
    stage1Name: 'Ginulong letra + kahulugan',
    stage2: 'I-drag ang salita sa tamang pangungusap.',
    stage2Name: 'I-drag sa pangungusap',
    meaningHint: 'Lalabas sa ilalim ng ginulong letra.',
  },
  {
    n: 3,
    title: 'Tuklas-Sitwasyon',
    color: '#8a4dff',
    stage1: 'Jumbled word game. Nasa ilalim ng salita ang kahulugan.',
    stage1Name: 'Ginulong letra + kahulugan',
    stage2: 'Magbibigay ng sitwasyon at pipiliin ng bata ang tamang sagot (a, b, c).',
    stage2Name: 'Sitwasyon (a, b, c)',
    meaningHint: 'Lalabas sa ilalim ng ginulong letra.',
  },
] as const

const STAGE1_KEYS = ['image', 'audio', 'meaning']
const STAGE2_KEYS: Record<number, string[]> = { 1: ['distractors'], 2: ['sentence'], 3: ['situation'] }
const KEY_LABEL: Record<string, string> = {
  image: 'larawan',
  audio: 'bigkas',
  meaning: 'kahulugan',
  distractors: 'maling larawan',
  sentence: 'pangungusap',
  situation: 'sitwasyon',
}

export function missingFor(w: TeacherWord, cycle: number, stage: Stage): string[] {
  const keys = stage === 1 ? STAGE1_KEYS : STAGE2_KEYS[cycle]
  return w.missing.filter((k) => keys.includes(k))
}

function Progress({ done, total, small }: { done: number; total: number; small?: boolean }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <span className={`t-progress ${small ? 'is-small' : ''}`} aria-label={`${done} sa ${total} kumpleto`}>
      <span className="t-progress-bar">
        <span style={{ width: `${pct}%` }} />
      </span>
      <span className="t-progress-text">
        {done}/{total}
      </span>
    </span>
  )
}

/**
 * Content input, organised exactly like the guide:
 *   Cycle (castle) → Sesyon 1 / 2 / 3 → Stage 1 / Stage 2 → Tanong 1..15.
 * Each Stage has its own page with its own inputs.
 */
export function WordsPage() {
  const [params, setParams] = useSearchParams()
  const cycle = Math.min(3, Math.max(1, Number(params.get('cycle')) || 1))
  const sesyon = Math.min(3, Math.max(1, Number(params.get('sesyon')) || 1))
  const stage = (Number(params.get('stage')) === 2 ? 2 : 1) as Stage

  type WordsData = { words_per_set: number; sets: Record<SetKey, TeacherWord[]> }
  const cached = peek<WordsData>('teacher', '/teacher/words')
  const [sets, setSets] = useState<Record<SetKey, TeacherWord[]> | null>(cached?.sets ?? null)
  const [perSet, setPerSet] = useState(cached?.words_per_set ?? 15)
  useLive<WordsData>('teacher', '/teacher/words', (d) => {
    setSets(d.sets)
    setPerSet(d.words_per_set)
  })
  const [error, setError] = useState<string | null>(null)
  const go = (c: number, s: number, st: Stage) => {
    setParams({ cycle: String(c), sesyon: String(s), stage: String(st) })
  }

  const load = useCallback(() => {
    teacherApi.words().then(
      (r) => {
        setSets(r.sets)
        setPerSet(r.words_per_set)
      },
      () => setError('Hindi makuha ang laman. Tumatakbo ba ang backend (php artisan serve)?'),
    )
  }, [])
  useEffect(load, [load])

  const all = useMemo(() => [...(sets?.A ?? []), ...(sets?.B ?? [])], [sets])
  const wordsOf = (s: number) => (s === 1 ? (sets?.A ?? []) : s === 2 ? (sets?.B ?? []) : all)
  const totalOf = (s: number) => (s === 3 ? perSet * 2 : perSet)
  const doneOf = (c: number, s: number, st: Stage) => wordsOf(s).filter((w) => missingFor(w, c, st).length === 0).length

  function upsert(word: TeacherWord) {
    setSets((prev) => {
      if (!prev) return prev
      const list = prev[word.word_set].filter((w) => w.id !== word.id)
      return { ...prev, [word.word_set]: [...list, word].sort((a, b) => a.position - b.position) }
    })
  }
  function remove(word: TeacherWord) {
    setSets((prev) => prev && { ...prev, [word.word_set]: prev[word.word_set].filter((w) => w.id !== word.id) })
  }

  const info = CYCLES[cycle - 1]
  const set: SetKey = sesyon === 2 ? 'B' : 'A'
  const part: EditPart = stage === 1 ? 'stage1' : (`c${cycle}` as EditPart)

  const done = doneOf(cycle, sesyon, stage)
  const total = totalOf(sesyon)

  return (
    <div className="t-page">
      <div className="t-page-head">
        <div>
          <h1 className="t-title">Laman ng Laro</h1>
          <p className="t-lead">Pumili ng map, sesyon at stage, saka pindutin ang isang tanong para lagyan o baguhin.</p>
        </div>
      </div>

      {/* 1. Castle tabs */}
      <div className="tp-castles" role="tablist" aria-label="Map">
        {CYCLES.map((c) => {
          const done = [1, 2, 3].reduce((n, s) => n + doneOf(c.n, s, 1) + doneOf(c.n, s, 2), 0)
          const total = [1, 2, 3].reduce((n, s) => n + totalOf(s) * 2, 0)
          return (
            <button
              key={c.n}
              type="button"
              role="tab"
              aria-selected={cycle === c.n}
              className={`tp-castle ${cycle === c.n ? 'is-active' : ''}`}
              style={{ '--accent': c.color } as CSSProperties}
              onClick={() => go(c.n, sesyon, stage)}
            >
              <span className="tp-castle-icon">
                <Icon name="castle" size={22} />
              </span>
              <span className="tp-castle-text">
                <span className="tp-castle-kicker">Map {c.n}</span>
                <span className="tp-castle-title">{c.title}</span>
              </span>
              <Progress small done={done} total={total} />
            </button>
          )
        })}
      </div>

      <section className="tp-card tp-board" style={{ '--accent': info.color } as CSSProperties}>
        {/* 2. Sesyon tabs + 3. Stage tabs */}
        <div className="tp-tabbar">
          <div className="tp-tabs tp-tabs-line" role="tablist" aria-label="Sesyon">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={sesyon === s}
                className={`tp-tab ${sesyon === s ? 'is-active' : ''}`}
                onClick={() => go(cycle, s, stage)}
              >
                Sesyon {s}
                <span className="tp-tab-count">{totalOf(s)} salita</span>
              </button>
            ))}
          </div>
          <div className="tp-segment" role="tablist" aria-label="Stage">
            {([1, 2] as const).map((st) => (
              <button
                key={st}
                type="button"
                role="tab"
                aria-selected={stage === st}
                className={`tp-segment-btn ${stage === st ? 'is-active' : ''}`}
                onClick={() => go(cycle, sesyon, st)}
              >
                <Icon name={st === 1 ? 'puzzle' : cycle === 1 ? 'image' : cycle === 2 ? 'text' : 'chat'} size={16} />
                Stage {st} · {st === 1 ? 'Ginulong letra' : info.stage2Name}
              </button>
            ))}
          </div>
        </div>

        <div className="tp-stage-head">
          <div className="tp-stage-text">
            <h2 className="tp-h2">{stage === 1 ? info.stage1Name : info.stage2Name}</h2>
            <p className="tp-lead">{stage === 1 ? info.stage1 : info.stage2}</p>
          </div>
          <div className="tp-stat" aria-label={`${done} sa ${total} kumpleto`}>
            <span className="tp-stat-num">
              {done}
              <small>/{total} kumpleto</small>
            </span>
            <Progress small done={done} total={total} />
          </div>
        </div>

        {stage === 1 && sesyon !== 3 && (
          <p className="tp-note">
            <Icon name="info" size={15} /> Iisa ang 15 salita ng Sesyon {sesyon} sa tatlong map. Ang ilalagay mo rito ay gagamitin din
            sa Stage 1 ng ibang map.
          </p>
        )}

        {error && <p className="t-error tp-board-msg">{error}</p>}
        {!sets && !error && <p className="t-muted tp-board-msg">Sandali lang…</p>}

        {sets && sesyon === 3 && <SesyonThree words={all} cycle={cycle} stage={stage} onGo={go} />}

        {sets && sesyon !== 3 && (
          <ol className="tp-rows">
            {Array.from({ length: perSet }, (_, i) => {
              const position = i + 1
              const word = sets[set].find((w) => w.position === position) ?? null
              return (
                <QuestionCard
                  key={`${set}${position}-${part}`}
                  number={position}
                  newAt={{ set, position }}
                  word={word}
                  part={part}
                  cycle={cycle}
                  sesyon={sesyon}
                  stage={stage}
                  stageName={stage === 1 ? info.stage1Name : info.stage2Name}
                  meaningHint={info.meaningHint}
                  onSaved={upsert}
                  onDeleted={remove}
                  onGoStage1={() => go(cycle, sesyon, 1)}
                />
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}

function StatusBadge({ word, missing }: { word: TeacherWord | null; missing: string[] | null }) {
  if (!word) return <span className="t-badge is-none">Walang laman</span>
  if (missing!.length) return <span className="t-badge" title={`Kulang: ${missing!.map((k) => KEY_LABEL[k]).join(', ')}`}>Kulang: {missing!.map((k) => KEY_LABEL[k]).join(', ')}</span>
  return <span className="t-badge is-done">Kumpleto</span>
}

/** One question of a stage: a row in the list; its inputs open in a slide-over panel. */
function QuestionCard({
  number,
  newAt,
  word,
  part,
  cycle,
  sesyon,
  stage,
  stageName,
  meaningHint,
  onSaved,
  onDeleted,
  onGoStage1,
}: {
  number: number
  newAt: { set: SetKey; position: number }
  word: TeacherWord | null
  part: EditPart
  cycle: number
  sesyon: number
  stage: Stage
  stageName: string
  meaningHint: string
  onSaved: (w: TeacherWord) => void
  onDeleted: (w: TeacherWord) => void
  onGoStage1: () => void
}) {
  const missing = word ? missingFor(word, cycle, stage) : null
  const [open, setOpen] = useState(false)
  const { busy, run, status, setError, setBusy } = useRunner(onSaved)
  const closeDrawer = useCallback(() => setOpen(false), [])

  const [confirmDelete, setConfirmDelete] = useState(false)

  async function del() {
    if (!word) return
    setBusy('delete')
    try {
      await teacherApi.deleteWord(word.id)
      setConfirmDelete(false)
      onDeleted(word)
    } catch {
      setError('Hindi nabura. Subukang muli.')
      setBusy(null)
    }
  }

  const menuItems: MenuItem[] = [
    ...(stage === 2 ? [{ label: 'Pumunta sa Stage 1 nito', icon: 'puzzle' as const, onSelect: onGoStage1 }] : []),
    ...(word ? [{ label: 'Burahin ang tanong', icon: 'trash' as const, danger: true, hint: 'Pati sa lahat ng map', onSelect: () => setConfirmDelete(true) }] : []),
  ]

  const state = !word ? 'is-empty' : missing!.length ? 'is-missing' : 'is-ready'

  return (
    <li className={`tp-row ${state} ${open ? 'is-open' : ''}`}>
      <button type="button" className="tp-row-main" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span className="t-q-num">{number}</span>
        <span className="t-q-summary">
          {word ? <Summary word={word} cycle={cycle} stage={stage} /> : <span className="t-muted">{stage === 1 ? 'Wala pang laman' : 'Wala pang salita sa Stage 1'}</span>}
        </span>
        <span className="t-q-status">
          <StatusBadge word={word} missing={missing} />
          {word ? (
            <span className="tp-row-go" aria-hidden>
              <Icon name="next" size={16} />
            </span>
          ) : (
            <span className="tp-row-add">
              <Icon name="plus" size={14} /> Lagyan
            </span>
          )}
        </span>
      </button>
      <span className="tp-row-menu">
        {word && <ActionMenu label={`Mga gagawin sa Tanong ${number}`} items={menuItems} />}
      </span>
      <ConfirmDialog
        open={confirmDelete}
        title={`Burahin ang Tanong ${number}${word ? ` (“${word.word}”)` : ''}?`}
        confirmLabel="Burahin"
        busy={busy === 'delete'}
        onConfirm={del}
        onClose={() => setConfirmDelete(false)}
      >
        <p>
          Iisa ang salitang ito sa tatlong map, kaya mabubura ito sa <b>lahat ng map</b>: ang larawan, bigkas,
          kahulugan, mga maling larawan, pangungusap, sitwasyon, at ang mga sagot ng bata rito. Hindi na ito maibabalik.
        </p>
      </ConfirmDialog>

      <Drawer
        open={open}
        onClose={closeDrawer}
        wide={part === 'c1'}
        badge={<span className={`t-q-num ${state}`}>{number}</span>}
        kicker={`${CYCLES[cycle - 1].title} · Sesyon ${sesyon} · Stage ${stage} · ${stageName}`}
        title={word ? word.word : `Tanong ${number}`}
        status={status}
      >
        {part === 'stage1' && <BasicsSection word={word} newAt={newAt} busy={busy} run={run} showMeaningHint={meaningHint} />}
        {part !== 'stage1' && !word && (
          <div className="t-editor-empty">
            <p>Ilagay muna ang salita, larawan at bigkas ng Tanong {number} sa Stage 1.</p>
            <button
              type="button"
              className="t-btn t-btn-primary"
              onClick={() => {
                setOpen(false)
                onGoStage1()
              }}
            >
              <Icon name="puzzle" size={15} /> Pumunta sa Stage 1
            </button>
          </div>
        )}
        {part === 'c1' && word && <DistractorSection word={word} busy={busy} run={run} />}
        {part === 'c2' && word && <SentenceSection word={word} busy={busy} run={run} />}
        {part === 'c3' && word && <SituationSection word={word} busy={busy} run={run} />}
      </Drawer>
    </li>
  )
}

function Summary({ word, cycle, stage }: { word: TeacherWord; cycle: number; stage: Stage }) {
  const thumb = (url: string | null, alt: string, cls = '') => (
    <span className={`t-thumb ${cls}`}>{url ? <img src={url} alt={alt} /> : <Icon name="image" size={16} />}</span>
  )
  if (stage === 1) {
    return (
      <>
        {thumb(word.image_url, word.word)}
        <span className="t-wrow-text">
          <span className="t-wrow-word">{word.word}</span>
          <span className="t-wrow-sub">{word.meaning || <i>Wala pang kahulugan</i>}</span>
        </span>
      </>
    )
  }
  if (cycle === 1) {
    const places = picturePlaces(word)
    const right = places.find((p) => p.correct)!
    return (
      <>
        <span className="t-wrow-text t-wrow-fixed">
          <span className="t-wrow-word">{word.word}</span>
          <span className="t-wrow-answer">
            <Icon name="check" size={13} /> Tama: {right.letter}
          </span>
        </span>
        <span className="t-thumbs">
          {places.map((p) => (
            <span key={p.pos} className="t-thumb-wrap">
              {thumb(p.url, p.correct ? 'Tama' : `Mali ${p.letter}`, p.correct ? 'is-correct' : p.url ? '' : 'is-empty')}
              <span className={`t-thumb-letter ${p.correct ? 'is-correct' : ''}`}>{p.correct ? <Icon name="check" size={11} /> : p.letter}</span>
            </span>
          ))}
        </span>
      </>
    )
  }
  if (cycle === 2) {
    const parts = word.sentence?.split(/_{2,}/) ?? []
    return (
      <>
        <span className="t-chip">{word.word}</span>
        <span className="t-wrow-sentence">
          {parts.length === 2 ? (
            <>
              {parts[0]}
              <span className="t-blank">{word.word}</span>
              {parts[1]}
            </>
          ) : (
            <i>Wala pang pangungusap</i>
          )}
        </span>
      </>
    )
  }
  const s = word.situation
  return (
    <>
      <span className="t-chip">{word.word}</span>
      <span className="t-wrow-text">
        <span className="t-wrow-sub">{s?.situation ?? <i>Wala pang sitwasyon</i>}</span>
        {s && (
          <span className="t-wrow-answer">
            Tama: <b>{s.correct_choice})</b> {s[`choice_${s.correct_choice}` as 'choice_a']}
          </span>
        )}
      </span>
    </>
  )
}

/** Sesyon 3 = Sesyon 1 + Sesyon 2 (30 words). Nothing new to type; shows where each question comes from. */
function SesyonThree({ words, cycle, stage, onGo }: { words: TeacherWord[]; cycle: number; stage: Stage; onGo: (c: number, s: number, st: Stage) => void }) {
  return (
    <>
      <p className="tp-note">
        <Icon name="book" size={15} />
        <span>
          Ang Sesyon 3 ay ang <b>15 salita ng Sesyon 1 at 15 salita ng Sesyon 2</b> (30 lahat), kaya wala nang bagong ilalagay rito.
          Pindutin ang isang tanong para baguhin ito sa pinagmulang sesyon.
          {cycle === 2 && stage === 2 && ' Sa laro, hinahati ang 30 sa 2 round na tig-15 salita.'}
        </span>
      </p>
      <ol className="tp-rows">
        {words.map((w, i) => {
          const missing = missingFor(w, cycle, stage)
          const from = w.word_set === 'A' ? 1 : 2
          return (
            <li key={w.id} className={`tp-row ${missing.length ? 'is-missing' : 'is-ready'}`}>
              <button type="button" className="tp-row-main" onClick={() => onGo(cycle, from, stage)} title={`Buksan sa Sesyon ${from}`}>
                <span className="t-q-num">{i + 1}</span>
                <span className="t-q-summary">
                  <Summary word={w} cycle={cycle} stage={stage} />
                </span>
                <span className="t-q-status">
                  <span className="t-badge is-from">
                    Sesyon {from} · Tanong {w.position}
                  </span>
                  <span className="tp-row-go" aria-hidden>
                    <Icon name="next" size={16} />
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </>
  )
}
