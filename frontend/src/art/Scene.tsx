import type { ReactNode } from 'react'
import { PixelArt } from './PixelArt'
import {
  BRICK,
  BRICK_PALETTE,
  CHEST,
  CHEST_PALETTE,
  CLOUD,
  CLOUD_PALETTE,
  COIN,
  COIN_PALETTE,
  SPARKLE,
  SPARKLE_GOLD,
  SPARKLE_WHITE,
  STAR,
  STAR_PALETTE,
  TREE,
  TREE_PALETTE,
} from './sprites'
import { GRASS_TILE, SOIL_TILE } from './tiles'

interface SceneProps {
  /** Big title block at the top (use <GameTitle/>). */
  title?: ReactNode
  /** Main content near the bottom (buttons, name box). */
  children?: ReactNode
  /** White footer text on the soil. */
  footer?: ReactNode
  /** Show the big star with light rays in the middle. */
  star?: boolean
  /** Extra decoration on the left side above the ground (e.g. the wooden sign). */
  leftProp?: ReactNode
  /** Replaces the big star in the middle (e.g. a form panel). */
  middle?: ReactNode
}

/**
 * The shared title-screen world from the designs: blue sky, clouds, coins,
 * floating bricks with a star, LEVEL UP block, chest, pine trees, grass and soil.
 */
export function Scene({ title, children, footer, star = true, leftProp, middle }: SceneProps) {
  return (
    <div className="scene">
      <div className="scene-sky" aria-hidden />

      {/* Sky decorations */}
      <PixelArt rows={CLOUD} palette={CLOUD_PALETTE} className="deco cloud cloud-left" />
      <PixelArt rows={CLOUD} palette={CLOUD_PALETTE} className="deco cloud cloud-right" />
      <PixelArt rows={COIN} palette={COIN_PALETTE} className="deco coin coin-left" />
      <PixelArt rows={COIN} palette={COIN_PALETTE} className="deco coin coin-right" />

      <div className="deco float-left">
        <PixelArt rows={STAR} palette={STAR_PALETTE} className="mini-star" />
        <PixelArt rows={BRICK} palette={BRICK_PALETTE} className="brick" />
      </div>

      <div className="deco float-right">
        <PixelArt rows={STAR} palette={STAR_PALETTE} className="mini-star" />
        <PixelArt rows={BRICK} palette={BRICK_PALETTE} className="brick" />
        <div className="chest-stack">
          <PixelArt rows={CHEST} palette={CHEST_PALETTE} className="chest" />
          <PixelArt rows={BRICK} palette={BRICK_PALETTE} className="brick" />
          <PixelArt rows={BRICK} palette={BRICK_PALETTE} className="brick" />
        </div>
        <div className="level-up" aria-hidden>
          <span>LEVEL</span>
          <span className="level-up-big">UP</span>
        </div>
      </div>

      <PixelArt rows={SPARKLE} palette={SPARKLE_GOLD} className="deco sparkle s1" />
      <PixelArt rows={SPARKLE} palette={SPARKLE_GOLD} className="deco sparkle s2" />
      <PixelArt rows={SPARKLE} palette={SPARKLE_GOLD} className="deco sparkle s3" />
      <PixelArt rows={SPARKLE} palette={SPARKLE_WHITE} className="deco sparkle s4" />
      <PixelArt rows={SPARKLE} palette={SPARKLE_WHITE} className="deco sparkle s5" />

      {/* Trees behind the ground edge */}
      <div className="deco trees trees-left">
        <PixelArt rows={TREE} palette={TREE_PALETTE} className="tree t-big" />
        <PixelArt rows={TREE} palette={TREE_PALETTE} className="tree t-mid" />
        <PixelArt rows={TREE} palette={TREE_PALETTE} className="tree t-small" />
      </div>
      <div className="deco trees trees-right">
        <PixelArt rows={TREE} palette={TREE_PALETTE} className="tree t-small" />
        <PixelArt rows={TREE} palette={TREE_PALETTE} className="tree t-big" />
      </div>

      {leftProp && <div className="deco left-prop">{leftProp}</div>}

      <div className="scene-ground" aria-hidden>
        <div className="grass" style={{ backgroundImage: GRASS_TILE }} />
        <div className="soil" style={{ backgroundImage: SOIL_TILE }} />
      </div>

      <div className="scene-content">
        <header className="scene-title">{title}</header>
        <div className="scene-middle">
          {middle}
          {!middle && star && (
            <div className="hero-star">
              <div className="hero-rays" aria-hidden />
              <PixelArt rows={STAR} palette={STAR_PALETTE} className="hero-star-art" title="Tala" />
            </div>
          )}
        </div>
        <div className="scene-actions">{children}</div>
        <footer className="scene-footer">{footer}</footer>
      </div>
    </div>
  )
}
