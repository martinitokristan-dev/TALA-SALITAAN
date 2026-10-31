/**
 * Hearts for the tries left on a question ("SUBOK"). `mini` is the small version that sits
 * inside a sentence (Castle 2), without its own box or label.
 */
export function Tries({ left, max, mini = false }: { left: number; max: number; mini?: boolean }) {
  return (
    <span className={`pl-tries ${mini ? 'is-mini' : ''}`} aria-label={`${left} sa ${max} subok`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`pl-heart ${i < left ? '' : 'is-gone'}`} aria-hidden />
      ))}
      {!mini && <span>SUBOK</span>}
    </span>
  )
}
