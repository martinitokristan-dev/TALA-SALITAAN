/**
 * Desktop browsers: the page can't be zoomed out below `min` (e.g. 0.5 = 50%) with
 * Ctrl + mouse wheel, Ctrl + trackpad pinch or Ctrl + minus. Zooming in still works.
 *
 * The page zoom is estimated as outerWidth / innerWidth (1 at 100%, 0.5 at 50%).
 * A browser menu zoom can't be blocked by a web page; phones and tablets don't zoom this way.
 */
export function limitZoomOut(min: number) {
  if (typeof window === 'undefined') return
  const zoom = () => (window.innerWidth > 0 ? window.outerWidth / window.innerWidth : 1)
  // one more step out would go below the limit (Chrome's steps near 50%: 67% -> 50% -> 33%)
  const atLimit = () => zoom() <= min + 0.04

  window.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey && e.deltaY > 0 && atLimit()) e.preventDefault()
    },
    { passive: false },
  )
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') && atLimit()) e.preventDefault()
  })
}
