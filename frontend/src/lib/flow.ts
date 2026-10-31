import type { CharacterKind } from './types'

/**
 * Pupil sign-in flow:
 * SIMULAN -> CONCENT (SUMASANGAYON) -> PUPIL LOGIN -> section -> TALA-PANGALAN -> map.
 */
const KEYS = {
  consent: 'tala.consentAccepted',
  section: 'tala.section',
  pupilName: 'tala.pupilName',
  character: 'tala.character',
} as const

export interface ChosenSection {
  id: number
  name: string
}

export const flow = {
  acceptConsent: () => sessionStorage.setItem(KEYS.consent, '1'),
  hasConsent: () => sessionStorage.getItem(KEYS.consent) === '1',

  setSection: (s: ChosenSection) => sessionStorage.setItem(KEYS.section, JSON.stringify(s)),
  section: (): ChosenSection | null => {
    try {
      return JSON.parse(sessionStorage.getItem(KEYS.section) ?? 'null')
    } catch {
      return null
    }
  },

  setPupilName: (name: string) => localStorage.setItem(KEYS.pupilName, name),
  pupilName: () => localStorage.getItem(KEYS.pupilName),

  /** The 3D character chosen on PILIIN ANG KARAKTER (also saved on the server). */
  setCharacter: (kind: CharacterKind) => localStorage.setItem(KEYS.character, kind),
  character: (): CharacterKind => (localStorage.getItem(KEYS.character) === 'babae' ? 'babae' : 'lalaki'),
  hasCharacter: () => !!localStorage.getItem(KEYS.character),
  clearCharacter: () => localStorage.removeItem(KEYS.character),

  reset: () => {
    sessionStorage.removeItem(KEYS.consent)
    sessionStorage.removeItem(KEYS.section)
    flow.clearPositions()
  },

  /** Where the character stood on the map / level paths (per pupil, so cleared on login and logout). */
  clearPositions: () => {
    for (const k of Object.keys(sessionStorage)) if (k.startsWith('tala.lvpos.') || k === 'tala.mapStop') sessionStorage.removeItem(k)
  },
}
