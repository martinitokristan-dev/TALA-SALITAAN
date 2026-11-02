import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useMemo, useState } from 'react'
import { ApiError, pupilApi } from '../lib/api'
import { optimizeImageUrl } from '../lib/cloudinaryImage'
import { FEEDBACK_LINE, feedbackLine } from '../lib/feedback'
import type { AnswerResponse, SentenceGroup, SituationItem } from '../lib/types'
import { Icon } from '../ui/Icon'
import { Star } from '../ui/StarRow'
import { Tries } from '../ui/Tries'
import { SENTENCES_PER_ROUND } from '../lib/levels'

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

/** Which group and round of 3 sentences holds this word (Castle 2, Stage 2). */
export function findRound(groups: SentenceGroup[], wordId: number) {
  for (const g of groups) {
    const idx = g.sentences.findIndex((s) => s.word_id === wordId)
    if (idx >= 0) {
      const start = Math.floor(idx / SENTENCES_PER_ROUND) * SENTENCES_PER_ROUND
      return { group: g, start, roundNo: start / SENTENCES_PER_ROUND + 1, rounds: Math.ceil(g.sentences.length / SENTENCES_PER_ROUND) }
    }
  }
  return null
}

/* ── Castle 2, Stage 2: drag the word into the right sentence (sketch layout) ── */

interface RoundSummary {
  stars: number
  max: number
}

/**
 * A word in the bank. While it is dragged, the word itself follows the finger / cursor
 * (DragOverlay below) and its place in the bank shows as an empty dashed outline.
 */
function Chip({ id, word, picked, onTap }: { id: number; word: string; picked: boolean; onTap: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `chip-${id}`, data: { wordId: id, word } })
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`pl-chip ${isDragging ? 'is-placeholder' : ''} ${picked ? 'is-picked' : ''}`}
      onClick={onTap}
      {...listeners}
      {...attributes}
    >
      {word}
    </button>
  )
}

function SentenceSlot({
  wordId,
  sentence,
  letter,
  state,
  filled,
  tries,
  maxAttempts,
  stars,
  onTap,
}: {
  wordId: number
  sentence: string
  letter: string
  /** is-open = not answered yet (any of them can be answered, in any order) */
  state: 'is-open' | 'is-right' | 'is-wrong' | 'is-missed'
  filled: string | null
  tries: number
  maxAttempts: number
  stars: number | null
  onTap: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `sent-${wordId}`, data: { wordId }, disabled: !!filled })
  const [before, after] = sentence.split(/_{2,}/)
  return (
    <div ref={setNodeRef} className={`pl-sentence ${state} ${isOver ? 'is-over' : ''}`} onClick={onTap} role="button" tabIndex={0}>
      <span className="pl-sentence-letter">{letter}</span>
      <span className="pl-sentence-text">
        {before}
        <span className={`pl-blank ${filled ? 'is-filled' : ''}`}>{filled ?? '\u00a0'}</span>
        {after}
      </span>
      <span className="pl-sentence-side">
        {stars !== null ? (
          <span className="pl-sentence-stars">
            <Star filled size={16} /> {stars}
          </span>
        ) : (
          <Tries left={tries} max={maxAttempts} mini />
        )}
      </span>
    </div>
  )
}

export function SentenceStage({
  groups,
  wordId,
  sesyon,
  maxAttempts,
  maxStars,
  onRoundDone,
  onWrong,
  onRight,
}: {
  groups: SentenceGroup[]
  wordId: number
  sesyon: number
  maxAttempts: number
  maxStars: number
  onRoundDone: (last: AnswerResponse, summary: RoundSummary) => void
  /** each answer, so the matching teacher clip plays (wrong with 2 / 1 tries left, missed) */
  onWrong: (r: AnswerResponse) => Promise<void>
  /** Resolves when the teacher's praise has ended (at once if there is no clip). */
  onRight: (r: AnswerResponse) => Promise<void>
}) {
  const round = useMemo(() => findRound(groups, wordId), [groups, wordId])
  const sentences = useMemo(() => (round ? round.group.sentences.slice(round.start, round.start + SENTENCES_PER_ROUND) : []), [round])
  const wordOf = useMemo(() => Object.fromEntries((round?.group.bank ?? []).map((c) => [c.word_id, c.word])), [round])

  // Per sentence: finished state, stars, tries used.
  const [done, setDone] = useState<Record<number, { stars: number; correct: boolean }>>(() =>
    Object.fromEntries(sentences.filter((s) => s.result.finished).map((s) => [s.word_id, { stars: s.result.stars, correct: s.result.is_correct }])),
  )
  const [used, setUsed] = useState<Record<number, number>>(() => Object.fromEntries(sentences.map((s) => [s.word_id, s.result.attempts_used])))
  const [wrongFlash, setWrongFlash] = useState<number | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [cheer, setCheer] = useState<{ stars: number; line: string } | null>(null)
  const [dragging, setDragging] = useState<string | null>(null) // word being dragged

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 80, tolerance: 8 } }))

  // Words already placed correctly in earlier sentences of this group leave the bank.
  const placed = new Set<number>(round ? round.group.sentences.filter((s) => s.result.finished && s.result.is_correct).map((s) => s.word_id) : [])
  Object.entries(done).forEach(([id, d]) => d.correct && placed.add(Number(id)))
  const bank = (round?.group.bank ?? []).filter((c) => !placed.has(c.word_id))

  // Any order: pupils answer the sentences they know first. The level path keeps its levels in
  // step anyway (see roundsInAnswerOrder in lib/levels.ts).
  async function drop(chipId: number, sentenceId: number) {
    if (busy || done[sentenceId]) return
    setBusy(true)
    setPicked(null)
    setMessage(null)
    try {
      const res = await pupilApi.answer({ cycle: 2, sesyon, stage: 2, word_id: sentenceId, answer: String(chipId) })
      setUsed((u) => ({ ...u, [sentenceId]: res.attempts_used }))
      if (res.finished) {
        const nextDone = { ...done, [sentenceId]: { stars: res.stars, correct: res.correct } }
        setDone(nextDone)
        // The "Tama!" stars and text stay up while the praise is spoken (at least 1.3 s), and the
        // round only ends after the voice has finished.
        let spoken: Promise<void>
        if (res.correct) {
          spoken = onRight(res)
          const cheerLine = { stars: res.stars, line: feedbackLine(res) }
          setCheer(cheerLine)
          Promise.all([spoken, wait(1300)]).then(() => setCheer((c) => (c === cheerLine ? null : c)))
        } else {
          spoken = onWrong(res)
          setMessage(`${FEEDBACK_LINE.naubos} Ang tamang sagot: ${res.correct_answer?.word?.toUpperCase()}`)
        }
        if (sentences.every((s) => nextDone[s.word_id])) {
          const stars = sentences.reduce((sum, s) => sum + (nextDone[s.word_id]?.stars ?? 0), 0)
          Promise.all([spoken, wait(1500)]).then(() => onRoundDone(res, { stars, max: sentences.length * maxStars }))
        }
      } else {
        onWrong(res)
        setWrongFlash(sentenceId)
        window.setTimeout(() => setWrongFlash(null), 600)
        setMessage(feedbackLine(res))
      }
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'Hindi maabot ang server.')
    } finally {
      setBusy(false)
    }
  }

  function onDragStart(e: DragStartEvent) {
    setPicked(null)
    setDragging((e.active.data.current?.word as string | undefined) ?? null)
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null)
    const chip = e.active.data.current?.wordId as number | undefined
    const target = e.over?.data.current?.wordId as number | undefined
    if (chip && target) drop(chip, target)
  }

  if (!round) return null

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      <div className="pl-drag">
        {/* Word bank: stays at the top while the sentences scroll */}
        <div className="pl-bank-wrap">
          <div className="pl-bank-head">
            <span className="pl-bank-title">MGA SALITA</span>
            {(round.rounds > 1 || groups.length > 1) && (
              <span className="pl-round">
                {round.rounds > 1 && `Round ${round.roundNo} ng ${round.rounds}`}
                {round.rounds > 1 && groups.length > 1 && ' · '}
                {groups.length > 1 && `Bahagi ${round.group.group} ng ${groups.length}`}
              </span>
            )}
          </div>
          <div className="pl-bank" aria-label="Mga salita">
            {bank.map((c) => (
              <Chip key={c.word_id} id={c.word_id} word={c.word} picked={picked === c.word_id} onTap={() => setPicked((p) => (p === c.word_id ? null : c.word_id))} />
            ))}
          </div>
          <p className="pl-hint">{picked ? 'Ngayon, pindutin ang tamang pangungusap.' : 'I-drag ang salita papunta sa pangungusap. O pindutin ang salita, tapos ang pangungusap.'}</p>
        </div>

        <div className={`pl-sentences ${dragging || picked ? 'is-waiting' : ''}`}>
          {sentences.map((s, i) => {
            const d = done[s.word_id]
            const state = d ? (d.correct ? 'is-right' : 'is-missed') : wrongFlash === s.word_id ? 'is-wrong' : 'is-open'
            return (
              <SentenceSlot
                key={s.word_id}
                wordId={s.word_id}
                sentence={s.sentence ?? '___'}
                letter={String(round.start + i + 1)}
                state={state}
                filled={d ? (wordOf[s.word_id] ?? '').toUpperCase() : null}
                tries={maxAttempts - (used[s.word_id] ?? 0)}
                maxAttempts={maxAttempts}
                stars={d ? d.stars : null}
                onTap={() => picked && !d && drop(picked, s.word_id)}
              />
            )
          })}
        </div>
        {message && <p className="pl-message" role="status">{message}</p>}
      </div>

      {/* The word being dragged, following the finger / cursor */}
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 1, 0.4, 1)' }}>
        {dragging ? <span className="pl-chip is-overlay">{dragging}</span> : null}
      </DragOverlay>

      {cheer !== null && (
        <div className="pl-cheer" role="status">
          <span>{cheer.line}</span>
          <span className="pl-cheer-stars">
            {Array.from({ length: maxStars }, (_, i) => (
              <Star key={i} filled={i < cheer.stars} size={22} />
            ))}
          </span>
        </div>
      )}
    </DndContext>
  )
}

/* ── Castle 3, Stage 2: situation with responses a, b, c ── */

export function SituationStage({
  item,
  sesyon,
  maxAttempts,
  locked,
  onDone,
  onWrong,
}: {
  item: SituationItem
  sesyon: number
  maxAttempts: number
  locked: boolean
  onDone: (r: AnswerResponse) => void
  onWrong: (r: AnswerResponse) => void
}) {
  const [wrong, setWrong] = useState<string[]>([])
  const [right, setRight] = useState<string | null>(null)
  const [triesLeft, setTriesLeft] = useState(maxAttempts - item.result.attempts_used)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function pick(key: string) {
    if (locked || busy || right || wrong.includes(key)) return
    setBusy(true)
    setMessage(null)
    try {
      const res = await pupilApi.answer({ cycle: 3, sesyon, stage: 2, word_id: item.word_id, answer: key })
      if (res.finished) {
        if (!res.correct) setWrong((w) => [...w, key])
        setRight(res.correct_answer?.key ?? key)
        window.setTimeout(() => onDone(res), res.correct ? 900 : 1600)
      } else {
        onWrong(res)
        setWrong((w) => [...w, key])
        setTriesLeft(res.attempts_left)
        setMessage(feedbackLine(res))
      }
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'Hindi maabot ang server.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pl-situation">
      <div className="pl-word is-small">
        <span>{item.word.toUpperCase()}</span>
      </div>
      <div className="pl-story">
        {item.image_url && <img src={optimizeImageUrl(item.image_url)!} alt="" />}
        <p>{item.situation}</p>
      </div>
      <div className="pl-answers">
        {item.choices.map((c, i) => {
          const state = right === c.key ? 'is-right' : wrong.includes(c.key) ? 'is-wrong' : ''
          return (
            <button
              key={c.key}
              type="button"
              className={`pl-answer ${state}`}
              style={{ animationDelay: `${i * 90}ms` }}
              onClick={() => pick(c.key)}
              disabled={!!right || wrong.includes(c.key) || locked}
            >
              <span className="pl-answer-key">{c.key}</span>
              <span className="pl-answer-text">{c.text}</span>
              {state === 'is-right' && <Icon name="check" size={20} />}
              {state === 'is-wrong' && <Icon name="close" size={18} />}
            </button>
          )
        })}
      </div>
      <div className="pl-footer">
        <span className="pl-tries">
          {Array.from({ length: maxAttempts }, (_, i) => (
            <span key={i} className={`pl-heart ${i < triesLeft ? '' : 'is-gone'}`} aria-hidden />
          ))}
          <span>SUBOK</span>
        </span>
      </div>
      {message && <p className="pl-message" role="status">{message}</p>}
    </div>
  )
}
