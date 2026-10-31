/** Glossy star used under level nodes and in the level popup. */
export function Star({ filled, size = 14 }: { filled: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`star ${filled ? 'is-filled' : ''}`} aria-hidden>
      <path
        d="M12 1.8l3.1 6.6 7.1.8-5.3 4.9 1.5 7.1L12 17.6l-6.4 3.6 1.5-7.1-5.3-4.9 7.1-.8z"
        fill={filled ? 'url(#star-gold)' : '#c9d3dd'}
        stroke={filled ? '#9a5b00' : '#7d8ba3'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {filled && <path d="M8.5 8.8l2.2-.3 1.1-2.6" fill="none" stroke="#fff7c2" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  )
}

/** Shared gradient for the stars (rendered once per screen). */
export function StarDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <linearGradient id="star-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff1a1" />
          <stop offset="0.45" stopColor="#ffc928" />
          <stop offset="1" stopColor="#f08c00" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** 5 stars in a small arc (Candy Crush style). */
export function StarArc({ stars, max = 5, size = 14 }: { stars: number; max?: number; size?: number }) {
  return (
    <div className="star-arc" aria-label={`${stars} sa ${max} bituin`}>
      {Array.from({ length: max }, (_, i) => {
        const mid = (max - 1) / 2
        const lift = Math.round((mid - Math.abs(i - mid)) * size * 0.22)
        return (
          <span key={i} style={{ transform: `translateY(${-lift}px)`, animationDelay: `${i * 70}ms` }}>
            <Star filled={i < stars} size={size} />
          </span>
        )
      })}
    </div>
  )
}
