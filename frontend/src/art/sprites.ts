import type { Palette } from './PixelArt'

/*
 * Pixel sprites redrawn from the Tala-Salitaan screen designs.
 * Legend per sprite is in its palette; "." is transparent.
 */

const OUTLINE = '#1d1b16'

// ── Big gold star (title screens) ─────────────────────────────────────────
export const STAR = [
  '..........o..........',
  '.........oyo.........',
  '.........oyo.........',
  '........olyyo........',
  '........olyyo........',
  '.......olyyydo.......',
  'oooooooolyyydoooooooo',
  'olllllllyyyyyyyyyyydo',
  '.olyyyyyyyyyyyyyyydo.',
  '..olyyyyyyyyyyyyydo..',
  '...olyyyyyyyyyyydo...',
  '....olyyyyyyyyydo....',
  '.....olyyyyyyydo.....',
  '.....olyyyyyyydo.....',
  '....olyyyyyyyyydo....',
  '....olyyyyoyyyydo....',
  '...olyyyyooodyyydo...',
  '...olyyyo...oyyydo...',
  '..olyydo.....oyyddo..',
  '..olydo.......oyddo..',
  '..oooo.........oooo..',
] as const

export const STAR_PALETTE: Palette = {
  o: OUTLINE,
  y: '#f7b928',
  l: '#ffe27a',
  d: '#d98a12',
}

/** Same star, empty (not yet earned). */
export const STAR_EMPTY_PALETTE: Palette = {
  o: OUTLINE,
  y: '#7d8ba3',
  l: '#a3b1c7',
  d: '#5e6a80',
}

// ── Coin ─────────────────────────────────────────────────────────────────
export const COIN = [
  '..oooo..',
  '.olyyyo.',
  'olyyyydo',
  'olyydydo',
  'olyydydo',
  'oyyyyddo',
  '.oyyddo.',
  '..oooo..',
] as const

export const COIN_PALETTE: Palette = { o: '#8a5a00', y: '#f7c531', l: '#fff0a0', d: '#d99a12' }

// ── Sparkles ─────────────────────────────────────────────────────────────
export const SPARKLE = [
  '...y...',
  '...y...',
  '..yly..',
  'yylwlyy',
  '..yly..',
  '...y...',
  '...y...',
] as const

export const SPARKLE_GOLD: Palette = { y: '#ffd23f', l: '#fff3a6', w: '#ffffff' }
export const SPARKLE_WHITE: Palette = { y: '#ffffff', l: '#ffffff', w: '#ffffff' }

// ── Cloud ────────────────────────────────────────────────────────────────
export const CLOUD = [
  '......wwww......',
  '...wwwwwwwww....',
  '.wwwwwwwwwwwww..',
  'wwwwwwwwwwwwwwww',
  'wwwwwwwwwwwwwwww',
  'cccccccccccccccc',
] as const

export const CLOUD_PALETTE: Palette = { w: '#ffffff', c: '#d6eefc' }

// ── Pine tree ────────────────────────────────────────────────────────────
export const TREE = [
  '.......oo.......',
  '......oggo......',
  '.....ogGggo.....',
  '....ogGgggho....',
  '....oggggggo....',
  '...ogGgggghho...',
  '..ogGggggggghho.',
  '...oogggggghoo..',
  '..ogGgggggggho..',
  '.ogGgggggggggho.',
  'ogGgggggggggghho',
  '..ooggggggghoo..',
  '.ogGggggggggghho',
  'ogGgggggggggghho',
  'oggggggggggghhho',
  'oooooooooooooooo',
  '......obbo......',
  '......obbo......',
  '......obbo......',
  '......oooo......',
] as const

export const TREE_PALETTE: Palette = {
  o: '#123d1c',
  g: '#2f8f3a',
  G: '#5cc35a',
  h: '#1f6a2b',
  b: '#7a4a24',
}

// ── Mushroom (button decoration) ─────────────────────────────────────────
export const MUSHROOM = [
  '....oooo....',
  '..oorrwwoo..',
  '.orrrrwwwro.',
  '.owwrrrrrwo.',
  'owwwrrwwrrro',
  'orrrrrwwwrro',
  'orrwrrrrrrro',
  '.oooooooooo.',
  '...osssso...',
  '...osssso...',
  '...osssso...',
  '....oooo....',
] as const

export const MUSHROOM_PALETTE: Palette = { o: OUTLINE, r: '#e8302a', w: '#ffffff', s: '#f6e6c8' }

// ── Brick block ──────────────────────────────────────────────────────────
export const BRICK = [
  'lbbbbbbmlbbbbbbm',
  'bbbbbbbmbbbbbbbm',
  'bbbbbbbmbbbbbbbm',
  'mmmmmmmmmmmmmmmm',
  'bbbmlbbbbbbmlbbb',
  'bbbmbbbbbbbmbbbb',
  'bbbmbbbbbbbmbbbb',
  'mmmmmmmmmmmmmmmm',
] as const

export const BRICK_PALETTE: Palette = { l: '#f08a4b', b: '#d9531e', m: '#8f2f10' }

// ── Treasure chest ───────────────────────────────────────────────────────
// ── Big treasure chest (end of the level path): domed lid, gold bands, lock ──
const TREASURE_BODY = [
  'oggggggggggGGggggggggggo',
  'oyyyyyyyyyGkkGyyyyyyyyyo',
  'odddddddddgkkgdddddddddo',
  'owwwwwwwwwgGGgwwwwwwwwwo',
  'oWwwdwwwwwwggwwwwwdwwwWo',
  'owwwwwwwwwwggwwwwwwwwwwo',
  'owwdwwwwwwwggwwwwwwwdwwo',
  'oggggggggggggggggggggggo',
  'oddddddddddddddddddddddo',
  '.oooooooooooooooooooooo.',
]

export const TREASURE_CLOSED = [
  '....oooooooooooooooo....',
  '..ooWWWWWWggWWWWWWWWoo..',
  '.oWWwwwwwwggwwwwwwwwWWo.',
  'oWwwwwwwwwggwwwwwwwwwwWo',
  'owwdwwwwwwggwwwwwwdwwwwo',
  ...TREASURE_BODY,
]

/** Opened: the lid stands up at the back and the chest is full of gold coins. */
export const TREASURE_OPEN = [
  '..oooooooooooooooooooo..',
  '.oddddddddddddddddddddo.',
  '.oWWWWWWWWWggWWWWWWWWWo.',
  '..oooooooooooooooooooo..',
  '...GG.yGGy..GGy.yGG.....',
  '.oGgGyggGgGGgyGgGggGyGo.',
  'oggGgggyGggggGggyggGgggo',
  ...TREASURE_BODY,
]

export const TREASURE_PALETTE: Palette = {
  o: '#3b1f0e',
  w: '#a0602c',
  W: '#c98a4b',
  d: '#6e3b17',
  g: '#f7c531',
  G: '#fff0a0',
  y: '#d99a12',
  k: '#1d1b16',
}

export const CHEST = [
  '.oooooooooooo.',
  'owwwwwwwwwwwwo',
  'owLLLLLLLLLLwo',
  'oggggggggggggo',
  'owwwwwoowwwwwo',
  'owwwwoyyowwwwo',
  'owDDDoyyoDDDwo',
  'owwwwwoowwwwwo',
  'oggggggggggggo',
  'oooooooooooooo',
] as const

export const CHEST_PALETTE: Palette = {
  o: OUTLINE,
  w: '#9a5a2a',
  L: '#c47c3e',
  D: '#6e3b17',
  g: '#e0b030',
  y: '#ffe27a',
}

// ── Wooden arrow sign (login screen) ─────────────────────────────────────
function buildSign(): string[] {
  const width = 22
  const widths = [14, 15, 16, 17, 18, 17, 16, 15, 14]
  const rows: string[] = []
  rows.push('o'.repeat(15).padEnd(width, '.'))
  widths.forEach((w, i) => {
    const fill = i === 0 ? 'L' : i === widths.length - 1 ? 'D' : 'w'
    let wood = fill.repeat(w)
    if (i > 0 && i < widths.length - 1) {
      // wood grain
      const grain = (i * 5) % (w - 4) + 2
      wood = wood.slice(0, grain) + 'D' + wood.slice(grain + 1)
    }
    rows.push(('o' + wood + 'o').padEnd(width, '.'))
  })
  rows.push('o'.repeat(15).padEnd(width, '.'))
  for (let i = 0; i < 8; i++) rows.push('.....oLwDo'.padEnd(width, '.'))
  rows.push('...ggoooooogg'.padEnd(width, '.'))
  return rows
}

export const SIGN = buildSign()

export const SIGN_PALETTE: Palette = {
  o: '#4a2a12',
  w: '#c98a4b',
  L: '#e0a96a',
  D: '#8a5228',
  g: '#3dbe4b',
}

// ── Small meadow flower ──────────────────────────────────────────────────
export const FLOWER = [
  '.w.w.',
  'wwyww',
  '.wyw.',
  '..g..',
  '.ggg.',
  '..g..',
] as const

export const FLOWER_PALETTE: Palette = { w: '#ffffff', y: '#ffd23f', g: '#2f8f3a' }
export const FLOWER_PINK: Palette = { w: '#ff8fb8', y: '#fff3a6', g: '#2f8f3a' }

// ── Round bush (level path meadow) ───────────────────────────────────────
export const BUSH = [
  '....oooo..oooo..',
  '..oollggoolggoo.',
  '.olllggggolggggo',
  'olllggggggggggdo',
  'oggggggggggggddo',
  'ogddgggggggddggo',
  '.oggddgggggdggo.',
  '..oooooooooooo..',
] as const

export const BUSH_PALETTE: Palette = { o: '#123d1c', g: '#3fa34a', l: '#7fd36b', d: '#2a7a33' }

// ── Small rock ───────────────────────────────────────────────────────────
export const ROCK = [
  '...oooo...',
  '..olllloo.',
  '.ollwllllo',
  'olllllllmo',
  'ommlllmmmo',
  '.oooooooo.',
] as const

export const ROCK_PALETTE: Palette = { o: '#3d4650', l: '#b9c2cc', w: '#eef2f5', m: '#8a95a1' }

// ── Monochrome UI icons (drawn in currentColor) ──────────────────────────
export const ICONS = {
  play: ['o........', 'ooo......', 'ooooo....', 'ooooooo..', 'ooooooooo', 'ooooooo..', 'ooooo....', 'ooo......', 'o........'],
  stop: ['.........', '.ooooooo.', '.ooooooo.', '.ooooooo.', '.ooooooo.', '.ooooooo.', '.ooooooo.', '.ooooooo.', '.........'],
  mic: ['...ooo...', '..ooooo..', '..ooooo..', '..ooooo..', 'o.ooooo.o', 'o..ooo..o', '.o.....o.', '..ooooo..', '....o....', '..ooooo..'],
  trash: ['...ooo...', 'ooooooooo', '.........', '.ooooooo.', '.o.o.o.o.', '.o.o.o.o.', '.o.o.o.o.', '.o.o.o.o.', '..ooooo..'],
  check: ['........o', '.......oo', 'o.....oo.', 'oo...oo..', '.oo.oo...', '..ooo....', '...o.....'],
  close: ['oo.....oo', '.oo...oo.', '..oo.oo..', '...ooo...', '..oo.oo..', '.oo...oo.', 'oo.....oo'],
  back: ['...o.....', '..oo.....', '.ooooooo.', 'oooooooo.', '.ooooooo.', '..oo.....', '...o.....'],
  star: ['....o....', '....o....', '...ooo...', 'ooooooooo', '.ooooooo.', '..ooooo..', '..ooooo..', '.oo...oo.', 'o.......o'],
  lock: ['..ooooo..', '.oo...oo.', '.o.....o.', '.o.....o.', 'ooooooooo', 'ooooooooo', 'oooo.oooo', 'oooo.oooo', 'ooooooooo'],
  image: ['ooooooooo', 'o.......o', 'o.oo....o', 'o.oo....o', 'o.....o.o', 'o..o.oooo', 'o.ooooooo', 'ooooooooo'],
  speaker: ['...o.....', '..oo..o..', 'oooo...o.', 'oooo.o.o.', 'oooo.o.o.', 'oooo...o.', '..oo..o..', '...o.....'],
  pupils: ['...ooo...', '..ooooo..', '..ooooo..', '...ooo...', '.........', '.ooooooo.', 'ooooooooo', 'ooooooooo'],
  book: ['ooo...ooo', 'o.oo.oo.o', 'o..ooo..o', 'o...o...o', 'o...o...o', 'o...o...o', 'oo..o..oo', '..ooooo..'],
  gear: ['...ooo...', '.o.ooo.o.', '..ooooo..', 'ooo...ooo', 'ooo...ooo', 'ooo...ooo', '..ooooo..', '.o.ooo.o.', '...ooo...'],
  logout: ['ooooo.....', 'o...o..o..', 'o...o..oo.', 'o..ooooooo', 'o...o..oo.', 'o...o..o..', 'ooooo.....'],
  plus: ['...ooo...', '...ooo...', 'ooooooooo', 'ooooooooo', 'ooooooooo', '...ooo...', '...ooo...'],
  reset: ['..ooooo..', '.oo...oo.', 'oo.......', 'oo....o..', 'oo...ooo.', '.oo.ooooo', '..ooooo..'],
} as const

export type IconName = keyof typeof ICONS
