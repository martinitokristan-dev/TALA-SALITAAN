import { PixelArt, spriteUrl } from '../art/PixelArt'
import { CLOUD, CLOUD_PALETTE, TREE, TREE_PALETTE } from '../art/sprites'
import { GRASS_TILE } from '../art/tiles'

/** Darker pines for the row behind (gives the forest some depth). */
const TREE_BACK_PALETTE = { ...TREE_PALETTE, g: '#24733a', l: '#3a9a4c' }
// Shared image URLs: each tree is a plain <img> (light to draw on old tablets).
const frontTree = spriteUrl(TREE, TREE_PALETTE, true)
const backTree = spriteUrl(TREE, TREE_BACK_PALETTE, true)

// Back row: small pines all along the horizon (percent of the width, size in px).
const BACK = [
  [2, 64], [8, 52], [15, 70], [23, 56], [31, 62], [40, 50], [48, 66], [56, 54],
  [64, 68], [72, 52], [80, 64], [88, 56], [95, 70],
] as const
// Front: bigger pines on both sides, like the first page (none in the middle, over the game).
const FRONT_LEFT = [
  [-3, 150], [6, 118], [13, 92],
] as const
const FRONT_RIGHT = [
  [84, 96], [90, 132], [97, 110],
] as const

/**
 * Background of the question screens: blue sky with clouds and a pine forest on a
 * strip of grass (the first page's world, without the bricks and blocks).
 */
export function PlayBackdrop() {
  return (
    <div className="pl-backdrop" aria-hidden>
      <PixelArt rows={CLOUD} palette={CLOUD_PALETTE} className="pl-bd-cloud c1" />
      <PixelArt rows={CLOUD} palette={CLOUD_PALETTE} className="pl-bd-cloud c2" />
      <PixelArt rows={CLOUD} palette={CLOUD_PALETTE} className="pl-bd-cloud c3" />

      <div className="pl-bd-forest">
        {BACK.map(([x, w], i) => (
          <img key={`b${i}`} src={backTree} alt="" className="pl-bd-tree is-back" style={{ left: `${x}%`, width: w }} />
        ))}
        {[...FRONT_LEFT, ...FRONT_RIGHT].map(([x, w], i) => (
          <img key={`f${i}`} src={frontTree} alt="" className="pl-bd-tree" style={{ left: `${x}%`, width: w }} />
        ))}
      </div>
      <div
        className="pl-bd-grass"
        style={{ background: `${GRASS_TILE} 0 0 / 32px 24px repeat-x, linear-gradient(180deg, #2f9e3c, #22802f) 0 20px / 100% 100% no-repeat` }}
      />
    </div>
  )
}
