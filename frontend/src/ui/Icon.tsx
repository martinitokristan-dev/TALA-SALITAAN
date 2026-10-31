import { PixelArt } from '../art/PixelArt'
import { ICONS, type IconName } from '../art/sprites'

interface Props {
  name: IconName
  size?: number
  className?: string
  /** Accessible label; omit for decorative icons next to text. */
  label?: string
}

/** Pixel icon drawn in the current text colour. */
export function Icon({ name, size = 18, className, label }: Props) {
  return (
    <PixelArt
      rows={ICONS[name]}
      palette={{ o: 'currentColor' }}
      width={size}
      className={`icon ${className ?? ''}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      title={label}
    />
  )
}
