import type { CSSProperties } from 'react'

export type Palette = Record<string, string>

interface Props {
  /** One string per row; each character is a pixel. "." (or a char missing from the palette) is transparent. */
  rows: readonly string[]
  palette: Palette
  /** Rendered width in CSS units; height follows the grid ratio. */
  width?: number | string
  className?: string
  style?: CSSProperties
  title?: string
}

/** Merge each row's runs of one colour into rects (fewer shapes = lighter SVG). */
function runs(rows: readonly string[], palette: Palette) {
  const rects: { x: number; y: number; w: number; fill: string }[] = []
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      const fill = palette[ch]
      if (!fill) {
        x++
        continue
      }
      let end = x + 1
      while (end < row.length && row[end] === ch) end++
      rects.push({ x, y, w: end - x, fill })
      x = end
    }
  })
  return rects
}

const urlCache = new Map<string, string>()

/**
 * The same pixel art as an image URL (data: SVG), made once per sprite + palette. For sprites
 * repeated hundreds of times (the level path meadow): one <img> each instead of a whole SVG
 * tree, and no CSS filter. `shadow` adds a soft ground shadow under the sprite (one extra row).
 */
export function spriteUrl(rows: readonly string[], palette: Palette, shadow = false): string {
  const key = `${rows.join('|')}#${JSON.stringify(palette)}#${shadow}`
  const hit = urlCache.get(key)
  if (hit) return hit
  const cols = Math.max(...rows.map((r) => r.length))
  const h = rows.length + (shadow ? 1 : 0)
  let body = shadow ? `<ellipse cx="${cols / 2}" cy="${rows.length - 0.1}" rx="${(cols * 0.42).toFixed(2)}" ry="0.9" fill="rgba(0,60,0,0.22)"/>` : ''
  body += runs(rows, palette).map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1" fill="${r.fill}"/>`).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols} ${h}" shape-rendering="crispEdges">${body}</svg>`
  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`
  urlCache.set(key, url)
  return url
}

/**
 * Draws pixel art from a text grid as a crisp SVG. Neighbouring pixels of the same
 * colour in a row are merged into one rect, so even large sprites stay light.
 */
export function PixelArt({ rows, palette, width, className, style, title }: Props) {
  const cols = Math.max(...rows.map((r) => r.length))
  const rects = runs(rows, palette)

  return (
    <svg
      viewBox={`0 0 ${cols} ${rows.length}`}
      width={width}
      className={className}
      style={{ display: 'block', ...style }}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  )
}
