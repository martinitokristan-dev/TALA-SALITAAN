import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { PixelArt } from '../art/PixelArt'
import { MUSHROOM, MUSHROOM_PALETTE } from '../art/sprites'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  /** Red mushroom on the right side, as on the SIMULAN button. */
  mushroom?: boolean
  size?: 'large' | 'medium' | 'small'
}

/** Yellow pixel button with dark outline and bottom shadow (from the designs). */
export function PixelButton({ children, mushroom, size = 'large', className = '', ...rest }: Props) {
  return (
    <button {...rest} className={`pixel-button pixel-button-${size} ${className}`}>
      <span className="pixel-button-label">{children}</span>
      {mushroom && <PixelArt rows={MUSHROOM} palette={MUSHROOM_PALETTE} className="pixel-button-mushroom" />}
    </button>
  )
}
