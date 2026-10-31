/*
 * Repeating pixel tiles for CSS backgrounds (grass band, soil, brick wall).
 * Each tile is a tiny SVG grid turned into a data URL; CSS scales it with
 * `image-rendering: pixelated` so the pixels stay sharp.
 */

function tile(rows: string[], palette: Record<string, string>): string {
  const w = rows[0].length
  const h = rows.length
  let rects = ''
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const fill = palette[row[x]]
      if (!fill) {
        x++
        continue
      }
      let end = x + 1
      while (end < row.length && row[end] === row[x]) end++
      rects += `<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${fill}"/>`
      x = end
    }
  })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges">${rects}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

/** Top of the ground: bright grass with tufts, ending in a jagged edge over the soil. */
export const GRASS_TILE = tile(
  [
    '..L.....L...L...',
    '.LLL...LLL.LLL..',
    'LLGLLLLLGLLLLGLL',
    'GGGGGLGGGGGGLGGG',
    'GGgGGGGGGgGGGGGG',
    'GGGGGGgGGGGGGgGG',
    'gGGGgGGGGGgGGGGg',
    'GGGGGGGGgGGGGGGG',
    'ggGgggGggggGgggG',
    'gggggggggggggggg',
    'dgggdggggdgggdgg',
    'd.dgd.dgdd.dgdd.',
  ],
  { L: '#7be36b', G: '#45c24f', g: '#2f9e3c', d: '#22802f' },
)

/** Soil below the grass. */
export const SOIL_TILE = tile(
  [
    'sssssssDsssssssD',
    'sssssssDsssssssD',
    'ssLsssssssssLsss',
    'sssssssDsssssssD',
    'DDDDDDDDDDDDDDDD',
    'sssDsssssssDssss',
    'sssDssssLssDssss',
    'sssDsssssssDssss',
    'ssssssssssssssss',
    'sssDsssssssDssss',
    'DDDDDDDDDDDDDDDD',
    'sssssssDsssssssD',
    'sLssssssssssssLs',
    'sssssssDsssssssD',
    'sssssssDsssssssD',
    'DDDDDDDDDDDDDDDD',
  ],
  { s: '#8b4a2b', D: '#6c3720', L: '#a8623c' },
)

/** Brick wall (consent panel frame). */
export const BRICK_TILE = tile(
  [
    'llllllllmlllllll',
    'lbbbbbbbmbbbbbbb',
    'lbbbbbbbmbbbbbbb',
    'bbbbbbbbmbbbbbbb',
    'mmmmmmmmmmmmmmmm',
    'lllmllllllllmlll',
    'bbbmlbbbbbbbmlbb',
    'bbbmbbbbbbbbmbbb',
    'bbbmbbbbbbbbmbbb',
    'mmmmmmmmmmmmmmmm',
  ],
  { l: '#f08a4b', b: '#d9531e', m: '#8f2f10' },
)

/** Pale brick pattern inside the consent panel. */
export const PALE_BRICK_TILE = tile(
  [
    'mppppppppppppppp',
    'mppppppppppppppp',
    'mppppppppppppppp',
    'mmmmmmmmmmmmmmmm',
    'ppppppppmppppppp',
    'ppppppppmppppppp',
    'ppppppppmppppppp',
    'mmmmmmmmmmmmmmmm',
  ],
  { p: '#f8d3c4', m: '#ecb9a6' },
)
