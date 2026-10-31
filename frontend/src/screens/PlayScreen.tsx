import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { emptyFeedbackClips, feedbackKindFor, feedbackLine, type FeedbackClipUrls } from '../lib/feedback'
import { PlayBackdrop } from '../ui/PlayBackdrop'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, peek, pupilApi, sesyonPath, tokens } from '../lib/api'
import { buildLevels, STAGE_TASK, type Level } from '../lib/levels'
import type { AnswerResponse, JumbleItem, PictureItem, SentenceGroup, SesyonPayload, SituationItem } from '../lib/types'
import { play, playAfter, soundEnded, stopSound } from '../lib/sound'
import { JumbleStage, PictureStage } from './PlayStages'
import { findRound, SentenceStage, SituationStage } from './StageTwoOthers'
import { Icon } from '../ui/Icon'
import { PixelButton } from '../ui/PixelButton'
import { Star, StarDefs } from '../ui/StarRow'

/* ── Sounds ───────────────────────────────────────────── */

/**
 * Teacher-recorded voice clips: after each answer one random clip of the matching situation
 * plays (e.g. "Mali, 1 subok na lang" only when 1 try is left). No clip for it = silence.
 */
function useFeedbackClips() {
  const clips = useRef<FeedbackClipUrls>(emptyFeedbackClips())
  useEffect(() => {
    pupilApi.feedbackClips().then((c) => (clips.current = { ...emptyFeedbackClips(), ...c }), () => undefined)
  }, [])
  /**
   * 'now': play at once (wrong answers). 'after': wait for the sound playing now (the word's
   * pronunciation) to end first. Resolves when the clip has ended (at once if there is none).
   */
  return useCallback((res: AnswerResponse, when: 'now' | 'after' = 'now'): Promise<void> => {
    const list = clips.current[feedbackKindFor(res)] ?? []
    const url = list.length ? list[Math.floor(Math.random() * list.length)] : null
    if (when === 'after') return playAfter(url)
    return url ? play(url) : Promise.resolve()
  }, [])
}

/* ── Screen ─────────────────────────────────────────────── */

interface Finished {
  res: AnswerResponse
  level: Level
  /** Castle 2 Stage 2: stars of the whole round of 3 sentences. */
  summary?: { stars: number; max: number }
  /** The teacher's praise is still playing: SUSUNOD waits for it. */
  speaking?: boolean
}

/**
 * Playing one level. Castle 1 (Tuklas-Larawan):
 *  Stage 1: picture + jumbled letters; the pronunciation plays after the word is built.
 *  Stage 2: 4 pictures, 1 correct, child-friendly meaning below.
 * 3 tries per level: 5 / 4 / 3 stars, wrong 3 times = 0 and the game moves on.
 */
export function PlayScreen() {
  const { cycle: c, sesyon: s } = useParams()
  const cycle = Number(c)
  const sesyon = Number(s)
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  // Cached sesyon (kept up to date after every answer): the level opens without a loading screen.
  const [data, setData] = useState<SesyonPayload | null>(() => peek<SesyonPayload>('pupil', sesyonPath(cycle, sesyon)) ?? null)
  const [error, setError] = useState<string | null>(null)
  const [finished, setFinished] = useState<Finished | null>(null)
  const feedback = useFeedbackClips()
  // Bumped when the pupil moves on, so a late "praise ended" never changes the next level.
  const doneSeq = useRef(0)
  // Leaving the level (LEVEL button, back gesture): no voice keeps talking over the level path.
  useEffect(() => () => stopSound(), [])

  const load = useCallback(() => {
    return pupilApi.sesyon(cycle, sesyon).then(
      (d) => {
        setData(d)
        return d
      },
      (e) => {
        setError(e instanceof ApiError ? e.message : 'May problema. Subukang muli.')
        return null
      },
    )
  }, [cycle, sesyon])

  useEffect(() => {
    if (tokens.get('pupil')) load()
  }, [load])

  const levels = useMemo(() => (data ? buildLevels(data) : []), [data])
  const current = levels.find((l) => l.status === 'current') ?? null
  const asked = Number(params.get('level'))
  const level = levels.find((l) => l.number === asked && l.status === 'current') ?? current

  if (!tokens.get('pupil')) return <Navigate to="/" replace />
  const backToPath = () => navigate(`/mapa/${cycle}/${sesyon}`)

  if (error) {
    return (
      <div className="pl-screen">
        <PlayBackdrop />
        <div className="lv-message">
          <p>{error}</p>
          <PixelButton size="small" onClick={backToPath}>
            BUMALIK SA LEVEL
          </PixelButton>
        </div>
      </div>
    )
  }
  if (!data) return <div className="pl-screen"><PlayBackdrop /><div className="lv-loading">Sandali lang…</div></div>
  if (!level && !finished) return <Navigate to={`/mapa/${cycle}/${sesyon}`} replace />

  async function next() {
    if (finished?.speaking) return
    stopSound()
    doneSeq.current++
    const res = finished?.res
    const wasStage = finished?.level.stage
    setFinished(null)
    if (res?.sesyon_complete) {
      // walks through all the Stage 2 levels to the last one (start at Stage 2 if unknown)
      const key = `tala.lvpos.${cycle}.${sesyon}`
      if (sessionStorage.getItem(key) === null) sessionStorage.setItem(key, String(data!.stage1.length))
      return backToPath()
    }
    // Last Stage 1 question done: back to the level path, where the character runs to Stage 2.
    if (res?.stage_complete && wasStage === 1) {
      // The character walks from where it stood (before these levels) through every finished
      // level and runs past the Stage 2 sign. Never opened the path in this tab: start at level 1.
      const key = `tala.lvpos.${cycle}.${sesyon}`
      if (sessionStorage.getItem(key) === null) sessionStorage.setItem(key, '0')
      return backToPath()
    }
    const d = await load()
    if (!d) return
    const nextLevel = buildLevels(d).find((l) => l.status === 'current')
    if (!nextLevel) return backToPath()
    setParams({ level: String(nextLevel.number) }, { replace: true })
  }

  /**
   * One item finished. The word's pronunciation (Castle 1 Stage 1) ends first; then the popup
   * with the written praise and the stars appears together with the spoken praise, and
   * SUSUNOD opens when the praise has ended.
   */
  function onDone(res: AnswerResponse, l: Level) {
    const seq = ++doneSeq.current
    soundEnded().then(() => {
      if (seq !== doneSeq.current) return
      setFinished({ res, level: l, speaking: true })
      feedback(res, 'after').then(() => {
        if (seq === doneSeq.current) setFinished((f) => (f && f.res === res ? { ...f, speaking: false } : f))
      })
    })
  }

  const shown = finished?.level ?? level!
  const stageItems = shown.stage === 1 ? data.stage1 : data.stage2
  const item = stageItems.find((it) => 'word_id' in it && it.word_id === shown.wordId)
  const groups = cycle === 2 ? (data.stage2 as SentenceGroup[]) : []
  // Castle 2 Stage 2 plays 3 sentences at once, so the screen stays the same for the whole round.
  const round = cycle === 2 && shown.stage === 2 ? findRound(groups, shown.wordId) : null
  const mainKey = round ? `r${round.group.group}-${round.start}` : `l${shown.number}`

  return (
    <div className={`pl-screen pl-stage-${shown.stage} pl-c${cycle}`}>
      <PlayBackdrop />
      <StarDefs />
      <header className="pl-header">
        <button type="button" className="lv-back" onClick={backToPath}>
          <Icon name="back" size={18} />
          <span>LEVEL</span>
        </button>
        <div className="pl-title">
          {/* Each part stays whole when the title wraps on a small phone. */}
          <span className="pl-title-top">
            <span className="pl-nowrap">{data.cycle_title} ·</span> <span className="pl-nowrap">SESYON {sesyon}</span>
          </span>
          <span className="pl-title-main">
            <span className="pl-nowrap">LEVEL {shown.number} ·</span> <span className="pl-nowrap">STAGE {shown.stage}</span>
          </span>
        </div>
        <div className="pl-count">
          {shown.indexInStage}/{shown.stage === 1 ? data.stage1.length : levels.length - data.stage1.length}
        </div>
      </header>

      <p className="pl-task">{STAGE_TASK[cycle]?.[shown.stage]}</p>

      <main className="pl-main" key={mainKey}>
        {shown.stage === 1 && item && (
          <JumbleStage
            item={item as JumbleItem}
            cycle={cycle}
            sesyon={sesyon}
            maxAttempts={data.max_attempts}
            locked={!!finished}
            onDone={(r) => onDone(r, shown)}
            onWrong={(r) => feedback(r)}
          />
        )}
        {shown.stage === 2 && cycle === 1 && item && (
          <PictureStage
            item={item as PictureItem}
            sesyon={sesyon}
            maxAttempts={data.max_attempts}
            locked={!!finished}
            onDone={(r) => onDone(r, shown)}
            onWrong={(r) => feedback(r)}
          />
        )}
        {shown.stage === 2 && cycle === 2 && round && (
          <SentenceStage
            groups={groups}
            wordId={shown.wordId}
            sesyon={sesyon}
            maxAttempts={data.max_attempts}
            maxStars={data.max_stars_per_item}
            onRight={(r) => feedback(r)}
            onWrong={(r) => feedback(r)}
            onRoundDone={(res, summary) => setFinished({ res, level: shown, summary })}
          />
        )}
        {shown.stage === 2 && cycle === 3 && item && (
          <SituationStage
            item={item as SituationItem}
            sesyon={sesyon}
            maxAttempts={data.max_attempts}
            locked={!!finished}
            onDone={(r) => onDone(r, shown)}
            onWrong={(r) => feedback(r)}
          />
        )}
      </main>

      {finished && <ResultPopup finished={finished} maxStars={data.max_stars_per_item} onNext={next} />}
    </div>
  )
}

function ResultPopup({ finished, maxStars, onNext }: { finished: Finished; maxStars: number; onNext: () => void }) {
  const { res, summary } = finished
  if (summary) {
    // End of a round of 3 sentences (Castle 2): show the round's stars.
    return (
      <div className="lv-modal pl-result" role="dialog" aria-modal="true">
        <div className="lv-modal-card">
          <div className="lv-modal-ribbon">
            <span>ROUND TAPOS!</span>
          </div>
          <p className="pl-result-title">{summary.stars > 0 ? 'Ang galing mo!' : 'Kaya mo ʼyan sa susunod!'}</p>
          <p className="lv-modal-note pl-round-stars">
            <Star filled size={34} /> {summary.stars} / {summary.max} bituin
          </p>
          {res.sesyon_complete && <p className="lv-modal-note">Tapos na ang sesyon! Lahat ng bituin: {res.sesyon_stars}</p>}
          <div className="lv-modal-actions">
            <PixelButton size="small" mushroom onClick={onNext} autoFocus>
              {res.sesyon_complete ? 'BUMALIK SA MAPA' : 'SUSUNOD'}
            </PixelButton>
          </div>
        </div>
      </div>
    )
  }
  const good = res.correct
  return (
    <div className="lv-modal pl-result" role="dialog" aria-modal="true">
      {good && (
        <div className="pl-confetti" aria-hidden>
          {Array.from({ length: 24 }, (_, i) => (
            <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 8) * 0.08}s`, background: ['#ffd23f', '#ff6a9a', '#4fc3f7', '#7be36b'][i % 4] }} />
          ))}
        </div>
      )}
      <div className="lv-modal-card">
        <div className={`lv-modal-ribbon ${good ? '' : 'is-soft'}`}>
          <span>{good ? 'TAMA!' : 'OKAY LANG!'}</span>
        </div>
        <p className="pl-result-title">{feedbackLine(res)}</p>
        <div className="lv-modal-stars">
          {Array.from({ length: maxStars }, (_, i) => (
            <span key={i} style={{ animationDelay: `${200 + i * 110}ms` }}>
              <Star filled={i < res.stars} size={42} />
            </span>
          ))}
        </div>
        {!good && res.correct_answer && (
          <p className="lv-modal-note">
            Ang tamang sagot: <b>{res.correct_answer.word.toUpperCase()}</b>
          </p>
        )}
        {res.sesyon_complete && <p className="lv-modal-note">Tapos na ang sesyon! Lahat ng bituin: {res.sesyon_stars}</p>}
        {res.stage_complete && !res.sesyon_complete && <p className="lv-modal-note">Tapos na ang Stage 1! Susunod: Stage 2.</p>}
        <div className="lv-modal-actions">
          {/* Waits until the teacher's praise has been said in full. */}
          <PixelButton size="small" mushroom onClick={onNext} autoFocus disabled={!!finished.speaking} aria-busy={!!finished.speaking}>
            {finished.speaking
              ? 'SANDALI…'
              : res.sesyon_complete
                ? 'BUMALIK SA MAPA'
                : res.stage_complete && finished.level.stage === 1
                  ? 'STAGE 2 NA!'
                  : 'SUSUNOD'}
          </PixelButton>
        </div>
      </div>
    </div>
  )
}
