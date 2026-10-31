import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { ApiError, teacherApi } from '../lib/api'
import type { TeacherWord } from '../lib/types'
import { Icon } from './TIcon'
import { AudioField, ImagePicker } from './media'
import { DrawerActions } from './ui'

/** Which input a question card shows: Stage 1 (jumbled letters) or one cycle's Stage 2. */
export type EditPart = 'stage1' | 'c1' | 'c2' | 'c3'

export type Run = (tag: string, fn: () => Promise<{ word: TeacherWord }>, done?: string) => Promise<boolean>

function message(e: unknown): string {
  if (e instanceof ApiError) return Object.values(e.errors)[0]?.[0] ?? e.message
  return 'May problema. Subukang muli.'
}

/** Save helper shared by the input forms of one question card. */
export function useRunner(onSaved: (w: TeacherWord) => void) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const run: Run = async (tag, fn, done = 'Nai-save') => {
    setBusy(tag)
    setError(null)
    setSaved(null)
    try {
      const res = await fn()
      onSaved(res.word)
      setSaved(done)
      return true
    } catch (e) {
      setError(message(e))
      return false
    } finally {
      setBusy(null)
    }
  }

  const status =
    error || saved ? (
      <p className={error ? 't-error' : 't-saved'} role="status">
        <Icon name={error ? 'info' : 'check'} size={15} /> {error ?? saved}
      </p>
    ) : null

  return { busy, run, status, setError, setBusy }
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="t-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </div>
  )
}

/** Stage 1: word, picture, pronunciation, child-friendly meaning. */
export function BasicsSection({
  word,
  newAt,
  busy,
  run,
  showMeaningHint,
}: {
  word: TeacherWord | null
  newAt: { set: 'A' | 'B'; position: number }
  busy: string | null
  run: Run
  showMeaningHint: string
}) {
  const [text, setText] = useState(word?.word ?? '')
  const [meaning, setMeaning] = useState(word?.meaning ?? '')
  const [newImage, setNewImage] = useState<File | null>(null)
  const [newAudio, setNewAudio] = useState<File | null>(null)

  const formId = useId()
  const changed = !word || text.trim() !== word.word || meaning.trim() !== (word.meaning ?? '')

  async function save(e: FormEvent) {
    e.preventDefault()
    const form = new FormData()
    form.append('word', text.trim())
    form.append('meaning', meaning.trim())
    if (newImage) form.append('image', newImage)
    if (newAudio) form.append('audio', newAudio)
    const ok = word
      ? await run('basics', () => teacherApi.updateWord(word.id, form))
      : await run(
          'basics',
          () => {
            form.append('word_set', newAt.set)
            form.append('position', String(newAt.position))
            return teacherApi.createWord(form)
          },
          'Nadagdag ang tanong',
        )
    if (ok) {
      setNewImage(null)
      setNewAudio(null)
    }
  }

  // Saved words upload a new picture / sound right away.
  function pickImage(file: File) {
    if (!word) return setNewImage(file)
    const form = new FormData()
    form.append('image', file)
    run('image', () => teacherApi.updateWord(word.id, form), 'Napalitan ang larawan')
  }
  function pickAudio(file: File) {
    if (!word) return setNewAudio(file)
    const form = new FormData()
    form.append('audio', file)
    run('audio', () => teacherApi.updateWord(word.id, form), 'Nai-save ang bigkas')
  }

  return (
    <form id={formId} className="t-form" onSubmit={save}>
      <div className="t-q-grid">
        <Field label="1. Salita (ito ang gugulungin ang letra)" hint="Letra lang; puwede ang espasyo at gitling (-).">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={40} required placeholder="hal. bahay" />
        </Field>
        <Field label="2. Kahulugan (para sa bata)" hint={showMeaningHint}>
          <textarea value={meaning} onChange={(e) => setMeaning(e.target.value)} maxLength={500} rows={2} placeholder="Maikli at madaling maintindihan." />
        </Field>
      </div>
      <div className="t-media-row">
        <Field label="3. Larawan ng salita">
          <ImagePicker url={word?.image_url ?? null} label={text || 'Larawan'} onPick={pickImage} busy={!!busy} compact />
        </Field>
        <Field label="4. Tamang bigkas" hint="I-record o i-upload. Tutunog pagkabuo ng salita.">
          <AudioField url={word?.audio_url ?? null} onPick={pickAudio} busy={!!busy} />
          {!word && newAudio && <small>Handa na ang audio. Pindutin ang I-save.</small>}
        </Field>
      </div>
      <DrawerActions>
        <button type="submit" form={formId} className="t-btn t-btn-primary" disabled={!!busy || !text.trim() || (!!word && !changed)}>
          <Icon name="check" size={14} /> {word ? 'I-save' : 'I-save ang tanong'}
        </button>
      </DrawerActions>
    </form>
  )
}

export const LETTERS = ['A', 'B', 'C', 'D'] as const

export interface PicturePlace {
  pos: number
  letter: string
  correct: boolean
  /** Wrong-picture slot (1-3) stored in this place. */
  slot: number | null
  url: string | null
}

/** The 4 places in the order the pupil sees them: correct at word.correct_position, wrong pictures fill the rest. */
export function picturePlaces(word: TeacherWord): PicturePlace[] {
  const at = word.correct_position >= 1 && word.correct_position <= 4 ? word.correct_position : 1
  let slot = 1
  return [1, 2, 3, 4].map((pos) => {
    if (pos === at) return { pos, letter: LETTERS[pos - 1], correct: true, slot: null, url: word.image_url }
    const s = slot++
    return { pos, letter: LETTERS[pos - 1], correct: false, slot: s, url: word.distractors.find((d) => d.slot === s)?.image_url ?? null }
  })
}

function UploadButton({ label, onPick, disabled }: { label: string; onPick: (f: File) => void; disabled?: boolean }) {
  return (
    <label className={`t-btn t-btn-sm ${disabled ? 'is-disabled' : ''}`}>
      <Icon name="upload" size={15} /> {label}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="visually-hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) onPick(f)
        }}
      />
    </label>
  )
}

/**
 * Castle 1, Stage 2: 4 pictures. The teacher sees the 4 places A-D in the same
 * 2 x 2 order as the pupil, picks which place holds the correct picture, and sets the 3 wrong pictures.
 */
export function DistractorSection({ word, busy, run }: { word: TeacherWord; busy: string | null; run: Run }) {
  const places = picturePlaces(word)

  function setCorrect(pos: number) {
    const form = new FormData()
    form.append('correct_position', String(pos))
    run('pos', () => teacherApi.updateWord(word.id, form), `Ang tamang sagot ay nasa ${LETTERS[pos - 1]} na`)
  }
  function setWrong(slot: number, file: File) {
    const form = new FormData()
    form.append('image', file)
    run(`d${slot}`, () => teacherApi.setDistractor(word.id, slot, form), 'Nai-save ang maling larawan')
  }
  function setWordImage(file: File) {
    const form = new FormData()
    form.append('image', file)
    run('image', () => teacherApi.updateWord(word.id, form), 'Napalitan ang tamang larawan')
  }

  return (
    <div className="t-pics-editor">
      <div className="t-pics-main">
        <div className="t-pics-steps">
          <span className="t-step"><b>1</b> Pumili kung saang puwesto (A–D) ang <b>tamang</b> larawan</span>
          <span className="t-step"><b>2</b> Maglagay ng larawan sa 3 <b>mali</b></span>
        </div>

        <div className="t-pics-grid" role="radiogroup" aria-label="Puwesto ng tamang sagot">
          {places.map((p) => (
            <div key={p.pos} className={`t-pic ${p.correct ? 'is-correct' : 'is-wrong'}`}>
              <div className="t-pic-top">
                <span className="t-pic-letter">{p.letter}</span>
                {p.correct ? (
                  <span className="t-pic-tag is-correct">
                    <Icon name="check" size={14} /> Tamang sagot
                  </span>
                ) : (
                  <span className="t-pic-tag">
                    <Icon name="close" size={13} /> Mali
                  </span>
                )}
              </div>
              <div className="t-pic-frame">
                {p.url ? <img src={p.url} alt={p.correct ? word.word : `Maling larawan ${p.letter}`} /> : (
                  <span className="t-pic-empty">
                    <Icon name="image" size={28} />
                    Walang larawan
                  </span>
                )}
              </div>
              <div className="t-pic-actions">
                {p.correct ? (
                  <UploadButton label="Palitan" onPick={setWordImage} disabled={!!busy} />
                ) : (
                  <>
                    <UploadButton label={p.url ? 'Palitan' : 'Mag-upload'} onPick={(f) => setWrong(p.slot!, f)} disabled={!!busy} />
                    <button type="button" role="radio" aria-checked={false} className="t-btn t-btn-sm t-btn-good" onClick={() => setCorrect(p.pos)} disabled={!!busy}>
                      <Icon name="target" size={15} /> Gawing tama
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="t-hint">
          <Icon name="info" size={15} /> Ang tamang larawan ay ang larawan ng salita mula sa Stage 1. Kapag pinalitan dito, magbabago rin
          ito sa Stage 1 ng lahat ng map.
        </p>
      </div>

      {/* What the pupil will see */}
      <aside className="t-phone" aria-label="Preview ng makikita ng bata">
        <div className="t-phone-label">
          <Icon name="phone" size={15} /> Makikita ng bata
        </div>
        <div className="t-phone-screen">
          <div className="t-phone-word">{word.word.toUpperCase()}</div>
          <div className="t-phone-grid">
            {places.map((p) => (
              <div key={p.pos} className={`t-phone-pic ${p.correct ? 'is-correct' : ''}`}>
                {p.url ? <img src={p.url} alt="" /> : <Icon name="image" size={18} />}
                <span>{p.letter}</span>
              </div>
            ))}
          </div>
          <div className="t-phone-meaning">{word.meaning || 'Wala pang kahulugan'}</div>
        </div>
      </aside>
    </div>
  )
}

/** Cycle 2, Stage 2: a sentence with one blank for this word. */
export function SentenceSection({ word, busy, run }: { word: TeacherWord; busy: string | null; run: Run }) {
  const [sentence, setSentence] = useState(word.sentence ?? '')
  const formId = useId()
  const parts = sentence.split(/_{2,}/)
  const hasOneBlank = parts.length === 2

  return (
    <form
      id={formId}
      className="t-form"
      onSubmit={(e) => {
        e.preventDefault()
        run('sentence', () => teacherApi.saveSentence(word.id, sentence))
      }}
    >
      <Field label={`Pangungusap para sa "${word.word}"`} hint='Ilagay ang "___" kung saan papasok ang salita. Siguraduhing ito lang ang salitang babagay.'>
        <textarea value={sentence} onChange={(e) => setSentence(e.target.value)} rows={2} maxLength={300} placeholder="hal. Malaki ang ___ ni Lola." />
      </Field>
      <div className="t-row">
        <button type="button" className="t-btn t-btn-light" onClick={() => setSentence((s) => (/_{2,}/.test(s) ? s : `${s}${s && !s.endsWith(' ') ? ' ' : ''}___`))}>
          Ilagay ang ___
        </button>
        {sentence && (
          <span className={`t-preview ${hasOneBlank ? '' : 'is-bad'}`}>
            {hasOneBlank ? (
              <>
                {parts[0]}
                <mark>{word.word}</mark>
                {parts[1]}
              </>
            ) : (
              'Kailangan ng eksaktong isang "___".'
            )}
          </span>
        )}
      </div>
      <DrawerActions>
        <button type="submit" form={formId} className="t-btn t-btn-primary" disabled={!!busy || !hasOneBlank || sentence === (word.sentence ?? '')}>
          <Icon name="check" size={14} /> I-save ang pangungusap
        </button>
      </DrawerActions>
    </form>
  )
}

/** Cycle 3, Stage 2: situation with responses a, b, c. */
export function SituationSection({ word, busy, run }: { word: TeacherWord; busy: string | null; run: Run }) {
  const s = word.situation
  const [situation, setSituation] = useState(s?.situation ?? '')
  const [choices, setChoices] = useState({ a: s?.choice_a ?? '', b: s?.choice_b ?? '', c: s?.choice_c ?? '' })
  const [correct, setCorrect] = useState<'a' | 'b' | 'c' | ''>(s?.correct_choice ?? '')
  const [image, setImage] = useState<File | null>(null)
  const formId = useId()

  const ready = situation.trim() && choices.a.trim() && choices.b.trim() && choices.c.trim() && correct

  return (
    <form
      id={formId}
      className="t-form"
      onSubmit={async (e) => {
        e.preventDefault()
        const form = new FormData()
        form.append('situation', situation.trim())
        form.append('choice_a', choices.a.trim())
        form.append('choice_b', choices.b.trim())
        form.append('choice_c', choices.c.trim())
        form.append('correct_choice', correct)
        if (image) form.append('image', image)
        if (await run('situation', () => teacherApi.saveSituation(word.id, form))) setImage(null)
      }}
    >
      <Field label={`Sitwasyon para sa "${word.word}"`}>
        <textarea value={situation} onChange={(e) => setSituation(e.target.value)} rows={2} maxLength={600} placeholder="hal. Umuulan nang malakas at papasok ka sa paaralan. Ano ang dadalhin mo?" />
      </Field>
      <fieldset className="t-choices">
        <legend>Mga sagot · pindutin ang bilog ng tamang sagot</legend>
        {(['a', 'b', 'c'] as const).map((key) => (
          <div key={key} className={`t-choice ${correct === key ? 'is-correct' : ''}`}>
            <label className="t-choice-radio">
              <input type="radio" name={`correct-${word.id}`} checked={correct === key} onChange={() => setCorrect(key)} />
              <span>{key}</span>
            </label>
            <input
              aria-label={`Sagot ${key}`}
              value={choices[key]}
              onChange={(e) => setChoices((c) => ({ ...c, [key]: e.target.value }))}
              maxLength={255}
              placeholder={`Sagot ${key}`}
            />
            {correct === key && <span className="t-choice-tag">Tama</span>}
          </div>
        ))}
      </fieldset>
      <Field label="Larawan ng sitwasyon (hindi kailangan)">
        <ImagePicker compact url={s?.image_url ?? null} label="Larawan ng sitwasyon" onPick={setImage} busy={!!busy} />
      </Field>
      <DrawerActions>
        <button type="submit" form={formId} className="t-btn t-btn-primary" disabled={!!busy || !ready}>
          <Icon name="check" size={14} /> I-save ang sitwasyon
        </button>
      </DrawerActions>
    </form>
  )
}
