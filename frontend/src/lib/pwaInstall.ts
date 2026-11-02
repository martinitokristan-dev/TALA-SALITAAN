/**
 * "I-install ang Tala-Salitaan" toast (PWA).
 *
 * - Android / Chrome / Edge: keeps the browser's install event and shows our own card with an
 *   I-INSTALL button that opens the browser's install dialog (prompt() works once per event).
 * - iPhone / iPad: Apple has no install event, so the card explains Share -> Add to Home Screen.
 * - Only on the start and login-choice screens (never while playing or in the teacher portal),
 *   only on touch devices, never when already running as the installed app.
 *   "Mamaya na" hides it for 3 days.
 */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'tala_install_dismissed_at'
const INSTALLED_KEY = 'tala_installed'
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000
const SHOW_DELAY_MS = 1800
/** Router paths where the card may appear. */
const ALLOWED_PATHS = new Set(['/', '/login'])

let deferred: InstallPromptEvent | null = null
let currentPath = ''
let toastEl: HTMLElement | null = null
let showTimer: number | null = null
let started = false

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIOS(): boolean {
  const ua = navigator.userAgent || ''
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1)
}

function isTouch(): boolean {
  return (navigator.maxTouchPoints || 0) > 0 || !!window.matchMedia?.('(pointer: coarse)').matches
}

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode */
  }
}

function snoozed(): boolean {
  if (storageGet(INSTALLED_KEY) === '1') return true
  const at = Number(storageGet(DISMISS_KEY) || 0)
  return at > 0 && Date.now() - at < SNOOZE_MS
}

function canShow(): boolean {
  if (!ALLOWED_PATHS.has(currentPath)) return false
  if (isStandalone() || snoozed() || !isTouch()) return false
  return !!deferred || isIOS()
}

const SHARE_ICON = `<svg class="ti-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 11H5.5A1.5 1.5 0 0 0 4 12.5v7A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`
const PLUS_ICON = `<svg class="ti-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`

function buildToast(): HTMLElement {
  const ios = !deferred && isIOS()
  const el = document.createElement('div')
  el.className = 'tala-install'
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-live', 'polite')
  el.setAttribute('aria-label', 'I-install ang Tala-Salitaan')
  // Compact card at the top of the screen, so SIMULAN / PUPIL LOGIN below stay free.
  el.innerHTML = `
    <div class="ti-card${ios ? ' is-ios' : ''}">
      <img class="ti-icon" src="/icons/icon-192.png" alt="" width="52" height="52" />
      <div class="ti-text">
        <div class="ti-title">I-install ang Tala-Salitaan</div>
        ${
          ios
            ? `<div class="ti-sub">Pindutin ang ${SHARE_ICON} <b>Share</b>, tapos ${PLUS_ICON} <b>Add to Home Screen</b></div>`
            : `<div class="ti-sub">Parang app: mas mabilis, buong screen!</div>`
        }
      </div>
      <div class="ti-actions">
        ${
          ios
            ? `<button type="button" class="ti-btn" data-act="later">SIGE</button>`
            : `<button type="button" class="ti-btn" data-act="install">I-INSTALL</button>
               <button type="button" class="ti-later" data-act="later">Mamaya na</button>`
        }
      </div>
    </div>`

  el.querySelectorAll('[data-act="later"]').forEach((b) =>
    b.addEventListener('click', () => {
      storageSet(DISMISS_KEY, String(Date.now()))
      hideToast()
    }),
  )
  el.querySelector('[data-act="install"]')?.addEventListener('click', async (ev) => {
    const btn = ev.currentTarget as HTMLButtonElement
    if (!deferred || btn.disabled) return
    btn.disabled = true
    const event = deferred
    deferred = null // the browser allows prompt() only once per event
    try {
      await event.prompt()
      const choice = await event.userChoice
      if (choice.outcome === 'accepted') storageSet(INSTALLED_KEY, '1')
      else storageSet(DISMISS_KEY, String(Date.now()))
    } catch {
      /* ignore */
    }
    hideToast()
  })
  return el
}

function showToast() {
  if (toastEl || !canShow()) return
  toastEl = buildToast()
  document.body.appendChild(toastEl)
  // next frame: start the slide-down animation
  requestAnimationFrame(() => requestAnimationFrame(() => toastEl?.classList.add('is-open')))
}

function hideToast() {
  if (showTimer !== null) {
    clearTimeout(showTimer)
    showTimer = null
  }
  const el = toastEl
  toastEl = null
  if (!el) return
  el.classList.remove('is-open')
  el.classList.add('is-closing')
  window.setTimeout(() => el.remove(), 320)
}

function scheduleShow() {
  if (toastEl || showTimer !== null || !canShow()) return
  showTimer = window.setTimeout(() => {
    showTimer = null
    showToast()
  }, SHOW_DELAY_MS)
}

/** Call once at start-up. */
export function initInstallPrompt() {
  if (started) return
  started = true
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // keep it; our card decides when to ask
    deferred = e as InstallPromptEvent
    scheduleShow()
  })
  window.addEventListener('appinstalled', () => {
    storageSet(INSTALLED_KEY, '1')
    deferred = null
    hideToast()
  })
}

/** Call on every route change: shows the card on the allowed screens, hides it elsewhere. */
export function setInstallPromptPath(path: string) {
  if (path === currentPath) return
  currentPath = path
  if (ALLOWED_PATHS.has(path)) scheduleShow()
  else hideToast()
}
