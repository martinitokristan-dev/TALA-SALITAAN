// Shapes returned by the Laravel API (backend/app/Http/Controllers).
import type { FeedbackKind } from './feedback'

export type SesyonStatus = 'locked' | 'unlocked' | 'completed'

export interface SesyonProgress {
  sesyon: 1 | 2 | 3
  status: SesyonStatus
  ready: boolean
  word_count: number
  stage1_done: number
  stage2_done: number
  stars: number
  max_stars: number
}

export interface CycleProgress {
  cycle: 1 | 2 | 3
  title: string
  status: SesyonStatus
  stars: number
  max_stars: number
  sesyons: SesyonProgress[]
}

export interface ItemResult {
  attempts_used: number
  finished: boolean
  is_correct: boolean
  stars: number
  answer: string | null
}

export interface JumbleItem {
  word_id: number
  letters: string[]
  length: number
  meaning: string | null
  image_url: string | null
  audio_url: string | null
  result: ItemResult
}

/** Cycle 1 Stage 2: 4 pictures, 1 correct. */
export interface PictureItem {
  word_id: number
  word: string
  meaning: string | null
  audio_url: string | null
  choices: { key: string; image_url: string | null }[]
  result: ItemResult
}

/** Cycle 2 Stage 2: word bank + sentences with a blank "___". */
export interface SentenceGroup {
  group: number
  bank: { word_id: number; word: string }[]
  sentences: { word_id: number; sentence: string | null; result: ItemResult }[]
}

/** Cycle 3 Stage 2: situation with responses a, b, c. */
export interface SituationItem {
  word_id: number
  word: string
  situation: string | null
  image_url: string | null
  choices: { key: 'a' | 'b' | 'c'; text: string }[]
  result: ItemResult
}

export interface SesyonPayload {
  cycle: 1 | 2 | 3
  cycle_title: string
  sesyon: 1 | 2 | 3
  max_attempts: number
  max_stars_per_item: number
  stage1: JumbleItem[]
  stage2: PictureItem[] | SentenceGroup[] | SituationItem[]
}

export interface AnswerResponse {
  correct: boolean
  counted: boolean
  attempts_used: number
  attempts_left: number
  finished: boolean
  stars: number
  correct_answer: { word: string; word_id?: number; key?: string } | null
  stage_complete: boolean
  sesyon_complete: boolean
  sesyon_stars: number
}

export interface Teacher {
  id: number
  name: string
  email: string
}

export type CharacterKind = 'lalaki' | 'babae'

export interface Pupil {
  id: number
  name: string
  character: CharacterKind | null
  section: { id: number; name: string } | null
}

export interface Section {
  id: number
  name: string
  is_active: boolean
  /** Demo mode (testing): everything open, 2 questions per sesyon. */
  is_demo: boolean
  pupils_count: number
}

export interface TeacherWord {
  id: number
  word_set: 'A' | 'B'
  position: number
  word: string
  meaning: string | null
  image_url: string | null
  audio_url: string | null
  /** Castle 1 Stage 2: place of the correct picture, 1 = A ... 4 = D. */
  correct_position: number
  distractors: { id: number; slot: number; image_url: string | null }[]
  sentence: string | null
  situation: {
    situation: string
    choice_a: string
    choice_b: string
    choice_c: string
    correct_choice: 'a' | 'b' | 'c'
    image_url: string | null
  } | null
  missing: string[]
}

export interface PupilSummary {
  id: number
  name: string
  section: string | null
  last_played_at: string | null
  stars: number
  max_stars: number
  sesyons_completed: number
  current: { cycle: number; title: string; sesyon: number } | null
}

export interface PupilAnswerRow {
  cycle: number
  sesyon: number
  stage: number
  word: string | null
  attempts_used: number
  is_correct: boolean
  stars: number
  finished_at: string | null
  answers: { attempt_no: number; answer: string; is_correct: boolean; at: string | null }[]
}

export interface PupilDetail {
  pupil: { id: number; name: string; section: string | null }
  progress: CycleProgress[]
  results: PupilAnswerRow[]
}

export interface FeedbackClip {
  id: number
  kind: FeedbackKind
  label: string | null
  is_active: boolean
  audio_url: string | null
}
