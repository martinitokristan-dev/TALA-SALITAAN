import { Link } from 'react-router-dom'
import { Icon } from './Icon'

/** Small back button with a word under the icon (pupils may not know icons alone). */
export function BackButton({ to, label = 'BUMALIK' }: { to: string; label?: string }) {
  return (
    <Link to={to} className="scene-back">
      <Icon name="back" size={20} />
      <span>{label}</span>
    </Link>
  )
}
