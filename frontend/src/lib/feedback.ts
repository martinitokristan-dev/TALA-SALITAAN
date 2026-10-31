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

/** What the teacher portal shows for each moment: name, when it plays, a sample line. */
export const FEEDBACK_INFO: Record<FeedbackKind, { title: string; when: string; example: string; good: boolean }> = {
  tama_una: { title: 'Tama sa unang subok', when: 'Tama agad ang sagot (5 bituin).', example: '"Ang galing mo!"', good: true },
  tama_ulit: { title: 'Tama sa ika-2 o ika-3 subok', when: 'Tama ang sagot pagkatapos magkamali.', example: '"Tama! Kaya mo pala!"', good: true },
  mali_2: { title: 'Mali, 2 subok pa', when: 'Unang maling sagot. May 2 subok pa.', example: '"Muntik na! Subukan muli, 2 subok pa."', good: false },
  mali_1: { title: 'Mali, 1 subok na lang', when: 'Ikalawang maling sagot. Isang subok na lang.', example: '"Isa pang subok, kaya mo ʼyan!"', good: false },
  naubos: { title: 'Naubos ang subok', when: 'Ikatlong mali. Ipapakita ang tamang sagot.', example: '"Okay lang! Ito ang tamang sagot."', good: false },
}

/** Which moment an answer is. */
export function feedbackKindFor(res: Pick<AnswerResponse, 'correct' | 'finished' | 'attempts_used' | 'attempts_left'>): FeedbackKind {
  if (res.correct) return res.attempts_used <= 1 ? 'tama_una' : 'tama_ulit'
  if (res.finished) return 'naubos'
  return res.attempts_left >= 2 ? 'mali_2' : 'mali_1'
}
