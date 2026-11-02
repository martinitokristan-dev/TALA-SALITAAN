import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { setInstallPromptPath } from './lib/pwaInstall'
import { ConsentScreen } from './screens/ConsentScreen'
import { GameShell } from './screens/GameShell'
import { LoginChoiceScreen } from './screens/LoginChoiceScreen'
import { LevelMapScreen } from './screens/LevelMapScreen'
import { PlayScreen } from './screens/PlayScreen'
import { NameScreen } from './screens/NameScreen'
import { SectionScreen } from './screens/SectionScreen'
import { SectionsPage } from './teacher/SectionsPage'
import { StartScreen } from './screens/StartScreen'
import { TeacherLoginScreen } from './screens/TeacherLoginScreen'
import { PupilDetailPage } from './teacher/PupilDetailPage'
import { PupilsPage } from './teacher/PupilsPage'
import { SettingsPage } from './teacher/SettingsPage'
import { TeacherLayout } from './teacher/TeacherLayout'
import { VoicePage } from './teacher/VoicePage'
import { WordsPage } from './teacher/WordsPage'

// 3D screens load three.js only when needed.
const CharacterScreen = lazy(() => import('./screens/CharacterScreen').then((m) => ({ default: m.CharacterScreen })))

/** PWA helpers that follow the route: install card on the start/login screens, launch splash out. */
function PwaRouteEffects() {
  const { pathname } = useLocation()
  useEffect(() => {
    setInstallPromptPath(pathname)
  }, [pathname])
  useEffect(() => {
    // First screen is on the page: let the launch splash (index.html, installed app only) fade out.
    requestAnimationFrame(() => (window as unknown as { __talaLaunchReady?: () => void }).__talaLaunchReady?.())
  }, [])
  return null
}

/**
 * Pupil: / (SIMULAN) -> /login (PUPIL LOGIN) -> /pupil (section) -> /pupil/pangalan (TALA-PANGALAN)
 *        -> /pahintulot (CONCENT; SUMASANGAYON signs in) -> /pupil/karakter (PILIIN ANG KARAKTER) -> /mapa
 * Teacher: /login -> /teacher/login -> /teacher/...
 */
export default function App() {
  return (
    <BrowserRouter>
      <PwaRouteEffects />
      <Routes>
        <Route path="/" element={<StartScreen />} />
        <Route path="/pahintulot" element={<ConsentScreen />} />
        <Route path="/login" element={<LoginChoiceScreen />} />
        <Route path="/pupil" element={<SectionScreen />} />
        <Route path="/pupil/pangalan" element={<NameScreen />} />
        <Route
          path="/pupil/karakter"
          element={
            <Suspense fallback={<div className="lv-loading">Sandali lang…</div>}>
              <CharacterScreen />
            </Suspense>
          }
        />
        {/* The 3D map stays mounted under the level path and the game (GameShell). */}
        <Route element={<GameShell />}>
          <Route path="/mapa" element={null} />
          <Route path="/mapa/:cycle/:sesyon" element={<LevelMapScreen />} />
          <Route path="/laro/:cycle/:sesyon" element={<PlayScreen />} />
        </Route>

        <Route path="/teacher/login" element={<TeacherLoginScreen />} />
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<Navigate to="salita" replace />} />
          <Route path="salita" element={<WordsPage />} />
          <Route path="seksyon" element={<SectionsPage />} />
          <Route path="mag-aaral" element={<PupilsPage />} />
          <Route path="mag-aaral/:id" element={<PupilDetailPage />} />
          <Route path="boses" element={<VoicePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
