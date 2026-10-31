import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scene } from '../art/Scene'
import { ApiError, teacherApi, tokens } from '../lib/api'
import { BackButton } from '../ui/BackButton'
import { GameTitle } from '../ui/GameTitle'
import { PixelButton } from '../ui/PixelButton'

/** TEACHER LOGIN: email + password, same world as the other title screens. */
export function TeacherLoginScreen() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await teacherApi.login(email.trim(), password)
      tokens.set('teacher', res.token)
      navigate('/teacher', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? (err.field('email') ?? err.message) : 'Hindi makakonekta sa server.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <BackButton to="/login" />
      <Scene
        title={<GameTitle word="SALITAAN" />}
        footer="PARA SA MGA GURO"
        middle={
          <form id="teacher-login" className="login-panel" onSubmit={submit}>
            <h2 className="login-panel-title">TEACHER LOGIN</h2>
            <label className="login-label">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                autoFocus
              />
            </label>
            <label className="login-label">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}
          </form>
        }
      >
        <PixelButton type="submit" form="teacher-login" size="medium" mushroom disabled={busy}>
          {busy ? 'SANDALI…' : 'MAG-LOGIN'}
        </PixelButton>
      </Scene>
    </>
  )
}
