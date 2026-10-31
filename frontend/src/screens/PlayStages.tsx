/*
 * Castle 1 question screens (also Stage 1 of every castle):
 *  JumbleStage  = picture + jumbled letters to build the word
 *  PictureStage = the word + 4 pictures, 1 correct
 * Each reports every answer (onWrong / onDone) so PlayScreen can play the matching teacher clip.
 */
import { useState } from 'react'
import { ApiError, pupilApi } from '../lib/api'
import { play } from '../lib/sound'
import type { AnswerResponse, JumbleItem, PictureItem } from '../lib/types'
import { Icon } from '../ui/Icon'
import { Tries } from '../ui/Tries'

/* ── Stage 1: jumbled letters ───────────────────────────── */

export function JumbleStage({
  item,
  cycle,
  sesyon,
  maxAttempts,
  locked,
  onDone,
  onWrong,
}: {
  item: JumbleItem
  cycle: number
  sesyon: number
  maxAttempts: number
  locked: boolean
  onDone: (r: AnswerResponse) => void
  onWrong: (r: AnswerResponse) => void
}) {
  const n = item.letters.length
  const [slots, setSlots] = useState<(number | null)[]>(() => Array(n).fill(null))
  const [triesLeft, setTriesLeft] = useState(maxAttempts - item.result.attempts_used)
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [solved, setSolved] = useState<string | null>(null)

  const used = new Set(slots.filter((x): x is number => x !== null))

  function place(tile: number) {
    if (locked || busy || used.has(tile)) return
    const at = slots.indexOf(null)
    if (at === -1) return
    const nextSlots = [...slots]
    nextSlots[at] = tile
    setSlots(nextSlots)
    setMessage(null)
    if (nextSlots.every((x) => x !== null)) submit(nextSlots as number[])
  }

  function unplace(i: number) {
    if (locked || busy || slots[i] === null) return
    const nextSlots = [...slots]
    nextSlots[i] = null
    setSlots(nextSlots)
  }

  async function submit(order: number[]) {
    setBusy(true)
    const answer = order.map((t) => item.letters[t]).join('')
    try {
      const res = await pupilApi.answer({ cycle, sesyon, stage: 1, word_id: item.word_id, answer })
      if (res.finished) {
        setSolved(res.correct_answer?.word?.toUpperCase() ?? answer)
        // Castle 1: the pronunciation plays automatically once the word is built.
        if (cycle === 1) play(item.audio_url)
        window.setTimeout(() => onDone(res), res.correct ? 900 : 1400)
      } else {
        onWrong(res)
        setTriesLeft(res.attempts_left)
        setShake(true)
        setMessage(`Muntik na! Subukan muli. ${res.attempts_left} subok pa.`)
        window.setTimeout(() => {
          setShake(false)
          setSlots(Array(n).fill(null))
        }, 650)
      }
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'Hindi maabot ang server.')
      setSlots(Array(n).fill(null))
    } finally {
      setBusy(false)
    }
  }

  const solvedLetters = solved ? solved.replace(/\s+/g, '').split('') : null

  return (
    <div className="pl-jumble">
      <div className="pl-picture">
        {item.image_url ? <img src={item.image_url} alt="Larawan ng salita" /> : <Icon name="image" size={60} />}
      </div>

      <div className={`pl-slots ${shake ? 'is-shaking' : ''} ${solved ? 'is-solved' : ''}`} aria-label="Sagot">
        {(solvedLetters ?? slots).map((v, i) => {
          const letter = solvedLetters ? solvedLetters[i] : v === null ? '' : item.letters[v as number]
          return (
            <button
              key={i}
              type="button"
              className={`pl-slot ${letter ? 'is-filled' : ''}`}
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => unplace(i)}
              aria-label={letter ? `Alisin ang ${letter}` : 'Bakante'}
            >
              {letter}
            </button>
          )
        })}
      </div>

      {item.meaning && <p className="pl-meaning">{item.meaning}</p>}

      <div className="pl-tiles" aria-label="Mga letra">
        {item.letters.map((l, i) => (
          <button
            key={i}
            type="button"
            className={`pl-tile ${used.has(i) || solved ? 'is-used' : ''}`}
            style={{ animationDelay: `${150 + i * 70}ms` }}
            onClick={() => place(i)}
            disabled={used.has(i) || !!solved || locked}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="pl-footer">
        <Tries left={triesLeft} max={maxAttempts} />
        <button type="button" className="pl-tool" onClick={() => setSlots(Array(n).fill(null))} disabled={busy || !!solved || used.size === 0}>
          <Icon name="reset" size={20} />
          <span>ULITIN</span>
        </button>
      </div>
      {message && <p className="pl-message" role="status">{message}</p>}
    </div>
  )
}

/* ── Stage 2 (Castle 1): 4 pictures, 1 correct ──────────── */

export function PictureStage({
  item,
  sesyon,
  maxAttempts,
  locked,
  onDone,
  onWrong,
}: {
  item: PictureItem
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
      const res = await pupilApi.answer({ cycle: 1, sesyon, stage: 2, word_id: item.word_id, answer: key })
      if (res.finished) {
        if (!res.correct) setWrong((w) => [...w, key])
        setRight(res.correct_answer?.key ?? key)
        window.setTimeout(() => onDone(res), res.correct ? 900 : 1500)
      } else {
        onWrong(res)
        setWrong((w) => [...w, key])
        setTriesLeft(res.attempts_left)
        setMessage(`Hindi iyan. Subukan muli! ${res.attempts_left} subok pa.`)
      }
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'Hindi maabot ang server.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pl-pics">
      <div className="pl-word">
        <span>{item.word.toUpperCase()}</span>
        <button type="button" className="pl-tool" onClick={() => play(item.audio_url)} disabled={!item.audio_url}>
          <Icon name="speaker" size={20} />
          <span>PAKINGGAN</span>
        </button>
      </div>

      <div className="pl-grid">
        {item.choices.map((c, i) => {
          const state = right === c.key ? 'is-right' : wrong.includes(c.key) ? 'is-wrong' : ''
          return (
            <button
              key={c.key}
              type="button"
              className={`pl-choice ${state}`}
              style={{ animationDelay: `${i * 90}ms` }}
              onClick={() => pick(c.key)}
              disabled={!!right || wrong.includes(c.key) || locked}
              aria-label={`Larawan ${i + 1}`}
            >
              {c.image_url ? <img src={c.image_url} alt="" /> : <Icon name="image" size={40} />}
              {state === 'is-right' && <span className="pl-mark is-right"><Icon name="check" size={22} /></span>}
              {state === 'is-wrong' && <span className="pl-mark is-wrong"><Icon name="close" size={20} /></span>}
            </button>
          )
        })}
      </div>

      {item.meaning && <p className="pl-meaning">{item.meaning}</p>}

      <div className="pl-footer">
        <Tries left={triesLeft} max={maxAttempts} />
      </div>
      {message && <p className="pl-message" role="status">{message}</p>}
    </div>
  )
}
