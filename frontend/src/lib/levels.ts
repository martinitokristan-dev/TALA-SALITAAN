import type { ItemResult, PictureItem, SentenceGroup, SesyonPayload, SituationItem } from './types'

export type LevelStatus = 'done' | 'current' | 'locked'

export interface Level {
  /** 1-based number shown on the node. */
  number: number
  stage: 1 | 2
  /** Position inside its stage (1-based). */
  indexInStage: number
  wordId: number
  result: ItemResult
  status: LevelStatus
}

/** Castle 2 Stage 2 shows its sentences 3 at a time (one round). */
export const SENTENCES_PER_ROUND = 3

/**
 * Castle 2 Stage 2: in a round of 3 sentences the pupil may answer them in any order
 * (the ones they know first). The round's levels on the path fill up from the first one,
 * so the answered sentences come first inside each round: answering sentence 2 first
 * gives stars to the round's first level, never to a level ahead of the character.
 */
function roundsInAnswerOrder(g: SentenceGroup) {
  const out: SentenceGroup['sentences'] = []
  for (let i = 0; i < g.sentences.length; i += SENTENCES_PER_ROUND) {
    const round = g.sentences.slice(i, i + SENTENCES_PER_ROUND)
    out.push(...round.filter((s) => s.result.finished), ...round.filter((s) => !s.result.finished))
  }
  return out
}

/**
 * One level per question, in play order: every Stage 1 question first, then every Stage 2 question.
 * Sesyon 1 and 2 have 15 words (30 levels); Sesyon 3 has 30 words (60 levels).
 */
export function buildLevels(p: SesyonPayload): Level[] {
  const stage1 = p.stage1.map((it) => ({ stage: 1 as const, wordId: it.word_id, result: it.result }))
  const stage2 =
    p.cycle === 2
      ? (p.stage2 as SentenceGroup[]).flatMap((g) => roundsInAnswerOrder(g).map((s) => ({ stage: 2 as const, wordId: s.word_id, result: s.result })))
      : (p.stage2 as (PictureItem | SituationItem)[]).map((it) => ({ stage: 2 as const, wordId: it.word_id, result: it.result }))

  const all = [...stage1, ...stage2]
  const currentIndex = all.findIndex((l) => !l.result.finished)

  return all.map((l, i) => ({
    ...l,
    number: i + 1,
    indexInStage: l.stage === 1 ? i + 1 : i + 1 - stage1.length,
    status: l.result.finished ? 'done' : i === currentIndex ? 'current' : 'locked',
  }))
}

export const STAGE_TASK: Record<number, Record<1 | 2, string>> = {
  1: { 1: 'Buuin ang salita mula sa ginulong letra', 2: 'Piliin ang tamang larawan' },
  2: { 1: 'Buuin ang salita mula sa ginulong letra', 2: 'I-drag ang salita sa tamang pangungusap' },
  3: { 1: 'Buuin ang salita mula sa ginulong letra', 2: 'Piliin ang tamang sagot sa sitwasyon' },
}
