import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './lib/quietWarnings'
import '@fontsource-variable/plus-jakarta-sans'
import './index.css'
import { limitZoomOut } from './lib/zoom'
import './styles/scene.css'
import './styles/screens.css'
import './styles/teacher.css'
import './styles/levels.css'
import './styles/play.css'
import './styles/pwa.css'
import App from './App.tsx'
import { initInstallPrompt } from './lib/pwaInstall'

limitZoomOut(0.5)
initInstallPrompt()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
