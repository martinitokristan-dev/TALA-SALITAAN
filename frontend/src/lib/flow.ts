import type { CharacterKind } from './types'

/**
 * Pupil sign-in flow:
 * SIMULAN -> PUPIL LOGIN -> section -> TALA-PANGALAN (+ "Ikaw ba ito?") -> CONCENT (SUMASANGAYON
 * signs in) -> PILIIN ANG KARAKTER -> map.
 */
const KEYS = {
  pendingName: 'tala.pendingName',
  section: 'tala.section',
  pupilName: 'tala.pupilName',
  character: 'tala.character',
} as const

export interface ChosenSection {
  id: number
  name: string
}

export const flow = {
  /** Name confirmed on TALA-PANGALAN, waiting for SUMASANGAYON on the consent screen (nothing saved yet). */
  setPendingName: (name: string) => sessionStorage.setItem(KEYS.pendingName, name),
  pendingName: () => sessionStorage.getItem(KEYS.pendingName),
  clearPendingName: () => sessionStorage.removeItem(KEYS.pendingName),

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
    sessionStorage.removeItem(KEYS.pendingName)
    sessionStorage.removeItem(KEYS.section)
    flow.clearPositions()
  },

  /** Where the character stood on the map / level paths (per pupil, so cleared on login and logout). */
  clearPositions: () => {
    for (const k of Object.keys(sessionStorage)) if (k.startsWith('tala.lvpos.') || k === 'tala.mapStop') sessionStorage.removeItem(k)
  },
}
