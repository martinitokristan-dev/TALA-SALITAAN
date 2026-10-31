import { createContext, useContext, useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import '@fontsource-variable/plus-jakarta-sans'
import { peek, teacherApi, tokens } from '../lib/api'
import type { Teacher } from '../lib/types'
import { Icon, type TIconName } from './TIcon'

const TeacherContext = createContext<Teacher | null>(null)
export const useTeacher = () => useContext(TeacherContext)!

const NAV: { group: string; items: { to: string; label: string; icon: TIconName; desc: string }[] }[] = [
  {
    group: 'Laro',
    items: [
      { to: '/teacher/salita', label: 'Laman ng Laro', icon: 'castle', desc: 'Mga salita, larawan at tanong' },
      { to: '/teacher/boses', label: 'Boses ng Guro', icon: 'mic', desc: 'Boses para sa bawat sandali ng laro' },
    ],
  },
  {
    group: 'Klase',
    items: [
      { to: '/teacher/seksyon', label: 'Mga Seksyon', icon: 'sections', desc: 'Game room ng bawat klase' },
      { to: '/teacher/mag-aaral', label: 'Mga Mag-aaral', icon: 'pupils', desc: 'Progress at mga sagot' },
    ],
  },
  {
    group: 'Settings',
    items: [{ to: '/teacher/settings', label: 'Pahintulot', icon: 'shield', desc: 'Consent bago maglaro' }],
  },
]

function Logo() {
  return (
    <svg viewBox="0 0 32 32" width="36" height="36" aria-hidden>
      <rect width="32" height="32" rx="9" fill="#4f46e5" />
      <path d="M16 6.5l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6-4.5-4.2 6.1-.8z" fill="#fcd34d" />
    </svg>
  )
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

/** Teacher portal frame: sidebar navigation, top bar with the page title, and the page. */
export function TeacherLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [teacher, setTeacher] = useState<Teacher | null>(() => peek<{ teacher: Teacher }>('teacher', '/teacher/me')?.teacher ?? null)
  const [failed, setFailed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!tokens.get('teacher')) return
    teacherApi.me().then((r) => setTeacher(r.teacher), () => setFailed(true))
  }, [])

  useEffect(() => setMenuOpen(false), [location.pathname])

  if (!tokens.get('teacher') || failed) return <Navigate to="/teacher/login" replace />
  if (!teacher) return <div className="tp tp-loading">Sandali lang…</div>

  async function logout() {
    await teacherApi.logout().catch(() => undefined)
    tokens.clear('teacher')
    navigate('/login', { replace: true })
  }

  const current = NAV.flatMap((g) => g.items).find((i) => location.pathname.startsWith(i.to))

  return (
    <TeacherContext.Provider value={teacher}>
      <div className={`tp ${menuOpen ? 'is-menu-open' : ''}`}>
        <aside className="tp-side" aria-label="Portal">
          <div className="tp-brand">
            <Logo />
            <div>
              <div className="tp-brand-name">Tala-Salitaan</div>
              <div className="tp-brand-sub">Portal ng Guro</div>
            </div>
          </div>

          <nav className="tp-nav">
            {NAV.map((g) => (
              <div key={g.group} className="tp-nav-group">
                <div className="tp-nav-label">{g.group}</div>
                {g.items.map((item) => (
                  <NavLink key={item.to} to={item.to} className={({ isActive }) => `tp-nav-link ${isActive ? 'is-active' : ''}`}>
                    <Icon name={item.icon} size={20} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <div className="tp-user">
            <span className="tp-avatar">{initials(teacher.name)}</span>
            <div className="tp-user-text">
              <div className="tp-user-name">{teacher.name}</div>
              <div className="tp-user-mail">{teacher.email}</div>
            </div>
            <button type="button" className="tp-icon-btn" onClick={logout} title="Logout" aria-label="Logout">
              <Icon name="logout" size={18} />
            </button>
          </div>
        </aside>
        <div className="tp-scrim" onClick={() => setMenuOpen(false)} aria-hidden />

        <div className="tp-body">
          <header className="tp-topbar">
            <button type="button" className="tp-icon-btn tp-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Buksan ang menu">
              <Icon name="menu" size={20} />
            </button>
            <div>
              <div className="tp-topbar-title">{current?.label ?? 'Portal'}</div>
              <div className="tp-topbar-sub">{current?.desc}</div>
            </div>
          </header>
          <main className="tp-main">
            <Outlet />
          </main>
        </div>
      </div>
    </TeacherContext.Provider>
  )
}
