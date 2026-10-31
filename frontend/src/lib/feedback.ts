import type { AnswerResponse } from './types'

/**
 * The five moments a teacher records a voice clip for. The game plays a clip of exactly the
 * moment that happened, so "Mali, 1 subok na lang" never plays while 2 tries are left.
 * Keep in sync with App\Models\FeedbackClip::KINDS.
 */
export const FEEDBACK_KINDS = ['tama_una', 'tama_ulit', 'mali_2', 'mali_1', 'naubos'] as const
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]

export type FeedbackClipUrls = Record<FeedbackKind, string[]>

export const emptyFeedbackClips = (): FeedbackClipUrls => ({ tama_una: [], tama_ulit: [], mali_2: [], mali_1: [], naubos: [] })

/**
 * The exact words the game shows on screen for each moment. The teacher records these same
 * words, so what the pupil reads and what the pupil hears always match. Every stage uses them.
 */
export const FEEDBACK_LINE: Record<FeedbackKind, string> = {
  tama_una: 'Tama! Ang galing mo!',
  tama_ulit: 'Tama! Kaya mo pala!',
  mali_2: 'Muntik na! Subukan muli. 2 subok pa.',
  mali_1: 'Muntik na! Subukan muli. 1 subok na lang.',
  naubos: 'Okay lang! Kaya mo ʼyan sa susunod!',
}

/** What the teacher portal shows for each moment: name, when it plays, the line to record. */
export const FEEDBACK_INFO: Record<FeedbackKind, { title: string; when: string; example: string; good: boolean }> = {
  tama_una: { title: 'Tama sa unang subok', when: 'Tama agad ang sagot (5 bituin).', example: `"${FEEDBACK_LINE.tama_una}"`, good: true },
  tama_ulit: { title: 'Tama sa ika-2 o ika-3 subok', when: 'Tama ang sagot pagkatapos magkamali.', example: `"${FEEDBACK_LINE.tama_ulit}"`, good: true },
  mali_2: { title: 'Mali, 2 subok pa', when: 'Unang maling sagot. May 2 subok pa.', example: `"${FEEDBACK_LINE.mali_2}"`, good: false },
  mali_1: { title: 'Mali, 1 subok na lang', when: 'Ikalawang maling sagot. Isang subok na lang.', example: `"${FEEDBACK_LINE.mali_1}"`, good: false },
  naubos: { title: 'Naubos ang subok', when: 'Ikatlong mali. Ipapakita ang tamang sagot sa ilalim.', example: `"${FEEDBACK_LINE.naubos}"`, good: false },
}

/** Which moment an answer is. */
export function feedbackKindFor(res: Pick<AnswerResponse, 'correct' | 'finished' | 'attempts_used' | 'attempts_left'>): FeedbackKind {
  if (res.correct) return res.attempts_used <= 1 ? 'tama_una' : 'tama_ulit'
  if (res.finished) return 'naubos'
  return res.attempts_left >= 2 ? 'mali_2' : 'mali_1'
}

/** The on-screen line for an answer (same words as the recorded clip). */
export function feedbackLine(res: Pick<AnswerResponse, 'correct' | 'finished' | 'attempts_used' | 'attempts_left'>): string {
  return FEEDBACK_LINE[feedbackKindFor(res)]
}
