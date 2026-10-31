import { useId, type FormEvent } from 'react'
import { PixelArt } from '../art/PixelArt'
import { MUSHROOM, MUSHROOM_PALETTE } from '../art/sprites'

interface Props {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  label: string
  maxLength: number
  busy?: boolean
  autoComplete?: string
  inputMode?: 'text' | 'numeric'
}

/**
 * Yellow name box from the TALA-PANGALAN design: dashed line to type on and the
 * red mushroom on the right, which also submits.
 */
export function PixelField({ value, onChange, onSubmit, label, maxLength, busy, autoComplete = 'off', inputMode = 'text' }: Props) {
  const id = useId()

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!busy && value.trim()) onSubmit()
  }

  return (
    <form className="pixel-field" onSubmit={submit}>
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        autoComplete={autoComplete}
        autoCapitalize="characters"
        spellCheck={false}
        inputMode={inputMode}
        enterKeyHint="go"
        placeholder={label}
        autoFocus
      />
      <button type="submit" className="pixel-field-go" aria-label="Tuloy" disabled={busy}>
        <PixelArt rows={MUSHROOM} palette={MUSHROOM_PALETTE} />
      </button>
    </form>
  )
}
