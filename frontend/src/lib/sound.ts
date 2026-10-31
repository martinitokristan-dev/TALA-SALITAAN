/** Play a short sound (word pronunciation, teacher clip). Silently ignores a blocked or missing file. */
export function play(url: string | null | undefined) {
  if (!url) return
  const a = new Audio(url)
  a.play().catch(() => undefined)
}
