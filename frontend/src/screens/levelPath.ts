/*
 * Pure helpers for the level path screen (LevelMapScreen): the road curve, the meadow
 * decorations around it, and where the "TAPOS NA!" chest leads. No React here.
 */
import {
  BUSH,
  BUSH_PALETTE,
  FLOWER,
  FLOWER_PALETTE,
  FLOWER_PINK,
  MUSHROOM,
  MUSHROOM_PALETTE,
  ROCK,
  ROCK_PALETTE,
  TREE,
  TREE_PALETTE,
} from '../art/sprites'

export interface Pt {
  x: number
  y: number
}

/** Smooth curve through the points (Catmull-Rom converted to cubic Bézier), as an SVG path. */
export function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return ''
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}

/** Meadow sprites scattered around the path (weight = how often). */
export const DECOR_KINDS = [
  { rows: TREE, palette: TREE_PALETTE, min: 44, max: 74, weight: 46 },
  { rows: TREE, palette: { ...TREE_PALETTE, g: '#24733a', l: '#3a9a4c' }, min: 40, max: 62, weight: 16 }, // darker pine
  { rows: BUSH, palette: BUSH_PALETTE, min: 36, max: 52, weight: 16 },
  { rows: ROCK, palette: ROCK_PALETTE, min: 18, max: 26, weight: 6 },
  { rows: MUSHROOM, palette: MUSHROOM_PALETTE, min: 22, max: 28, weight: 4 },
  { rows: FLOWER, palette: FLOWER_PALETTE, min: 14, max: 18, weight: 6 },
  { rows: FLOWER, palette: FLOWER_PINK, min: 14, max: 18, weight: 6 },
] as const
const DECOR_TOTAL = DECOR_KINDS.reduce((s, k) => s + k.weight, 0)
/** Upper limit of decorations, to keep the page light on old tablets. */
const MAX_DECOR = 520

export interface Decor {
  kind: number // index in DECOR_KINDS
  x: number
  y: number // bottom of the sprite
  w: number
}

/** Small seeded random (the same meadow on every visit). */
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Trees, bushes, rocks and flowers all over the meadow (also beside the track on wide screens),
 * never on the path, the level circles, the signs or the chest. Sorted top to bottom so the
 * lower ones are drawn in front.
 */
export function scatterDecor(
  seed: number,
  pts: Pt[],
  width: number,
  height: number,
  margin: number,
  keepOut: { x: number; y: number; w: number; h: number }[],
): Decor[] {
  if (pts.length < 2) return []
  const rand = seeded(seed)
  const samples: Pt[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    for (let k = 0; k < 14; k++) {
      const f = k / 14
      samples.push({ x: pts[i].x + (pts[i + 1].x - pts[i].x) * f, y: pts[i].y + (pts[i + 1].y - pts[i].y) * f })
    }
  }
  samples.push(pts[pts.length - 1])
  const nearPath = (x: number, y: number) => samples.reduce((m, p) => Math.min(m, Math.hypot(p.x - x, p.y - y)), Infinity)

  const out: Decor[] = []
  // more tries per row on wide screens, so the forest is as thick there as on a tablet
  const tries = Math.max(4, Math.round(((width + 2 * margin) / 600) * 4))
  for (let y = 70; y < height - 20 && out.length < MAX_DECOR; y += 28) {
    for (let t = 0; t < tries && out.length < MAX_DECOR; t++) {
      let pick = rand() * DECOR_TOTAL
      let kind = 0
      while (pick > DECOR_KINDS[kind].weight) pick -= DECOR_KINDS[kind++].weight
      const K = DECOR_KINDS[kind]
      const w = K.min + rand() * (K.max - K.min)
      const x = -margin + 14 + rand() * (width + 2 * margin - 28)
      const yy = y + rand() * 30
      const small = w < 30
      if (nearPath(x, yy - w * 0.3) < (small ? 44 : 58) + w * 0.5) continue
      if (keepOut.some((r) => x > r.x - w / 2 && x < r.x + r.w + w / 2 && yy > r.y && yy - w < r.y + r.h)) continue
      if (out.some((d) => Math.hypot(d.x - x, d.y - yy) < (d.w + w) * 0.36)) continue
      out.push({ kind, x, y: yy, w })
    }
  }
  return out.sort((a, b) => a.y - b.y)
}

/** Where "TAPOS NA!" leads: the next sesyon (or the next map's first sesyon). */
export function nextSesyon(cycle: number, sesyon: number): string {
  if (sesyon < 3) return `/mapa/${cycle}/${sesyon + 1}`
  if (cycle < 3) return `/mapa/${cycle + 1}/1`
  return '/mapa'
}
