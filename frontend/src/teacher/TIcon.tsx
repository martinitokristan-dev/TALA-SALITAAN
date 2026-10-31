/**
 * Portal icon set: hand-drawn 24px line icons (rounded strokes), made for this portal.
 * Same names as the game's pixel icons so portal files can switch with one import.
 */
const PATHS: Record<string, string> = {
  // Castle with flag: game content
  book: 'M4 21V10l2-1V7h2v1.5L10 8V6h4v2l2 .5V7h2v2l2 1v11 M4 21h16 M10 21v-4a2 2 0 0 1 4 0v4 M12 6V2.5l3 1.2-3 1.2',
  castle: 'M4 21V10l2-1V7h2v1.5L10 8V6h4v2l2 .5V7h2v2l2 1v11 M4 21h16 M10 21v-4a2 2 0 0 1 4 0v4 M12 6V2.5l3 1.2-3 1.2',
  // Two children
  pupils: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3.5 20a5.5 5.5 0 0 1 11 0 M16.5 10.5a2.5 2.5 0 1 0 0-5 M17 14.2a4.5 4.5 0 0 1 3.5 4.3',
  // Rooms / sections: door with grid
  sections: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  mic: 'M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z M6 11a6 6 0 0 0 12 0 M12 17v4 M9 21h6',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19 12l2-1.2-1.6-3.2-2.3.5a7 7 0 0 0-1.6-1L15 4.6h-3.6L11 7a7 7 0 0 0-1.6 1l-2.3-.6L5.5 10.8 7.4 12l-1.9 1.2 1.6 3.2 2.3-.5a7 7 0 0 0 1.6 1l.4 2.4h3.6l.4-2.4a7 7 0 0 0 1.6-1l2.3.5 1.6-3.2z',
  shield: 'M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z M9 12l2 2 4-4',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3 M10 8l-4 4 4 4 M6 12h10',
  plus: 'M12 5v14 M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12 M18 6L6 18',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v6 M14 11v6',
  image: 'M4 5h16v14H4z M4 16l4.5-4.5 3.5 3.5 2.5-2.5L20 18 M15.5 9.5a1.5 1.5 0 1 0 0-.01',
  speaker: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4z M15.5 9a4 4 0 0 1 0 6 M18 6.5a7.5 7.5 0 0 1 0 11',
  star: 'M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z',
  lock: 'M6 11h12v9H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3 M12 15v2',
  reset: 'M4 12a8 8 0 1 0 2.4-5.7 M4 4v4h4',
  back: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  stop: 'M7 7h10v10H7z',
  play: 'M8 5l11 7-11 7z',
  edit: 'M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4',
  'chevron-up': 'M6 15l6-6 6 6',
  'chevron-down': 'M6 9l6 6 6-6',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 12.01V12',
  phone: 'M7 2.5h10a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V4A1.5 1.5 0 0 1 7 2.5z M10.5 18.5h3',
  swap: 'M7 7h11l-3-3 M17 17H6l3 3',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  upload: 'M12 16V4 M7 9l5-5 5 5 M4 16v4h16v-4',
  menu: 'M4 7h16 M4 12h16 M4 17h16',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v5 M12 8v.01',
  layers: 'M12 3l9 5-9 5-9-5z M3 13l9 5 9-5',
  puzzle: 'M5 5h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4h-4a2 2 0 1 0-4 0H5v-4a2 2 0 1 0 0-4z',
  text: 'M5 6h14 M5 10h14 M5 14h9 M5 18h6',
  chat: 'M4 5h16v11H9l-5 4z M8 9.5h8 M8 12.5h5',
}

PATHS.more = 'M12 5.5h.01 M12 12h.01 M12 18.5h.01'
PATHS.rename = 'M4 20h4L18.5 9.5l-4-4L4 16z M13 7l4 4 M14 20h6'
PATHS['arrow-right'] = 'M5 12h14 M13 6l6 6-6 6'

const FILLED = new Set(['star', 'play'])
const STROKE: Record<string, number> = { more: 3.2 }

export type TIconName = keyof typeof PATHS

export function Icon({ name, size = 20, className, label }: { name: TIconName | string; size?: number; className?: string; label?: string }) {
  const d = PATHS[name] ?? PATHS.info
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`ti ${className ?? ''}`}
      fill={FILLED.has(name) ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={STROKE[name] ?? 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ flexShrink: 0 }}
    >
      <path d={d} />
    </svg>
  )
}
