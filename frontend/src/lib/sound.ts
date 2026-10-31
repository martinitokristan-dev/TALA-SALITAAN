/*
 * One sound at a time (word pronunciation, teacher clips).
 *  - play(): starts now and stops whatever is playing.
 *  - playAfter(): waits for the sound that is playing, then plays (pronunciation, then praise).
 * Both return a promise that resolves when the sound has ended. It also resolves when the file
 * is missing, blocked or broken, or after `maxMs`, so the game never waits forever.
 */

let current: HTMLAudioElement | null = null
let currentDone: Promise<void> = Promise.resolve()
/** Bumped by stopSound(), so a queued playAfter() is dropped. */
let generation = 0

const MAX_MS = 10_000

function start(url: string, maxMs: number): Promise<void> {
  const a = new Audio(url)
  current = a
  const done = new Promise<void>((resolve) => {
    let timer = 0
    const finish = () => {
      window.clearTimeout(timer)
      a.removeEventListener('ended', finish)
      a.removeEventListener('error', finish)
      a.removeEventListener('pause', finish)
      if (current === a) current = null
      resolve()
    }
    a.addEventListener('ended', finish)
    a.addEventListener('error', finish)
    a.addEventListener('pause', finish) // stopSound() pauses it
    timer = window.setTimeout(finish, maxMs)
    a.play().catch(finish)
  })
  currentDone = done
  return done
}

/** Play now (stops any sound already playing). */
export function play(url: string | null | undefined, maxMs = MAX_MS): Promise<void> {
  stopSound()
  if (!url) return Promise.resolve()
  return start(url, maxMs)
}

/** Play after the sound that is playing now has ended. */
export function playAfter(url: string | null | undefined, maxMs = MAX_MS): Promise<void> {
  const before = currentDone
  const gen = generation
  // Not started if stopSound() ran meanwhile (the pupil already moved on).
  return before.then(() => (url && gen === generation ? start(url, maxMs) : undefined))
}

/** Resolves when the sound playing now (if any) has ended. */
export function soundEnded(): Promise<void> {
  return currentDone
}

/** Stop the sound playing now (leaving a level, pressing SUSUNOD). */
export function stopSound() {
  generation++
  const a = current
  current = null
  if (a) {
    a.pause()
    a.removeAttribute('src')
  }
}
