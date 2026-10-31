interface Props {
  /** Big gold word under "TALA-", e.g. "SALITAAN" or "PANGALAN". */
  word: string
  /** Small top word. */
  prefix?: string
}

/**
 * Outlined pixel text: a dark outline copy sits behind the coloured copy.
 * (Two separate spans, because a gradient text fill cannot share an element with its outline layer.)
 */
export function OutlinedText({ text, className }: { text: string; className: string }) {
  return (
    <span className={`outlined ${className}`}>
      <span className="outlined-back" aria-hidden>
        {text}
      </span>
      <span className="outlined-front">{text}</span>
    </span>
  )
}

/** Two-line title from the designs: white "TALA-" over a big gold pixel word, both outlined in violet. */
export function GameTitle({ word, prefix = 'TALA-' }: Props) {
  return (
    <h1 className="game-title" aria-label={`${prefix}${word}`}>
      <OutlinedText text={prefix} className="game-title-prefix" />
      <OutlinedText text={word} className="game-title-word" />
    </h1>
  )
}
