import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from './TIcon'

/** Picture box: shows the current picture and lets the teacher choose a new one. */
export function ImagePicker({
  url,
  label,
  onPick,
  busy,
  compact,
}: {
  url: string | null
  label: string
  onPick: (file: File) => void
  busy?: boolean
  compact?: boolean
}) {
  const id = useId()
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  const shown = preview ?? url

  return (
    <div className={`image-picker ${compact ? 'image-picker-compact' : ''}`}>
      <label htmlFor={id} className={`image-picker-frame ${shown ? '' : 'is-empty'}`}>
        {shown ? <img src={shown} alt={label} /> : (
          <span className="image-picker-empty">
            <Icon name="image" size={30} />
            <span>Walang larawan</span>
          </span>
        )}
      </label>
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="visually-hidden"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          setPreview(URL.createObjectURL(file))
          onPick(file)
        }}
      />
      <label htmlFor={id} className="t-btn t-btn-light">
        <Icon name="image" size={16} /> {shown ? 'Palitan' : 'Pumili'} ng larawan
      </label>
    </div>
  )
}

function extensionFor(mime: string): string {
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('mp4') || mime.includes('aac')) return 'm4a'
  if (mime.includes('wav')) return 'wav'
  return 'webm'
}

/**
 * Pronunciation / voice clip: play the current audio, record a new one with the
 * microphone (works on localhost or HTTPS), or upload an audio file.
 */
export function AudioField({
  url,
  onPick,
  busy,
  maxSeconds = 15,
}: {
  url: string | null
  onPick: (file: File) => void
  busy?: boolean
  maxSeconds?: number
}) {
  const id = useId()
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [take, setTake] = useState<{ url: string; file: File } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current)
    recorder.current?.stream.getTracks().forEach((t) => t.stop())
  }, [])

  async function start() {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Hindi kaya ng browser na ito ang pag-record. Mag-upload na lang ng audio file.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const type = rec.mimeType || 'audio/webm'
        const blob = new Blob(chunks, { type })
        const file = new File([blob], `recording.${extensionFor(type)}`, { type })
        setTake((old) => {
          if (old) URL.revokeObjectURL(old.url)
          return { url: URL.createObjectURL(blob), file }
        })
      }
      recorder.current = rec
      rec.start()
      setRecording(true)
      setSeconds(0)
      timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch {
      setError('Hindi magamit ang mikropono. Payagan ang microphone sa browser.')
    }
  }

  function stop() {
    if (timer.current) window.clearInterval(timer.current)
    timer.current = null
    if (recorder.current?.state === 'recording') recorder.current.stop()
    setRecording(false)
  }

  // Stop automatically at the time limit.
  useEffect(() => {
    if (recording && seconds >= maxSeconds) stop()
  }, [recording, seconds, maxSeconds])

  function useTake() {
    if (!take) return
    onPick(take.file)
    setTake(null)
  }

  return (
    <div className="audio-field">
      {url && !take && <audio controls src={url} preload="none" className="audio-player" />}
      {!url && !take && !recording && <p className="t-muted">Wala pang audio.</p>}

      {take && (
        <div className="audio-take">
          <audio controls src={take.url} className="audio-player" />
          <div className="t-row">
            <button type="button" className="t-btn t-btn-primary" onClick={useTake} disabled={busy}>
              <Icon name="check" size={14} /> Gamitin ito
            </button>
            <button type="button" className="t-btn t-btn-light" onClick={() => setTake(null)}>
              <Icon name="close" size={14} /> Huwag
            </button>
          </div>
        </div>
      )}

      <div className="t-row">
        {recording ? (
          <button type="button" className="t-btn t-btn-danger" onClick={stop}>
            <Icon name="stop" size={14} /> Ihinto ({seconds}s)
          </button>
        ) : (
          <button type="button" className="t-btn t-btn-light" onClick={start} disabled={busy}>
            <Icon name="mic" size={14} /> I-record
          </button>
        )}
        <label htmlFor={id} className="t-btn t-btn-light">
          <Icon name="speaker" size={14} /> Mag-upload
        </label>
        <input
          id={id}
          type="file"
          accept="audio/*"
          className="visually-hidden"
          disabled={busy || recording}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) onPick(file)
          }}
        />
      </div>
      {recording && <p className="recording-dot">Nagre-record…</p>}
      {error && <p className="t-error">{error}</p>}
    </div>
  )
}
