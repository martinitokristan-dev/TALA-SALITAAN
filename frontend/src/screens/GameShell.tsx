import { Outlet, useLocation } from 'react-router-dom'
import { MapScreen } from './MapScreen'

/**
 * Keeps the 3D map alive under the level path and the game screens.
 * Going back to /mapa only un-hides it: no new WebGL context, no model or texture reload.
 * While hidden its render loop is paused, so it costs no battery.
 */
export function GameShell() {
  const { pathname } = useLocation()
  const onMap = pathname === '/mapa'
  return (
    <>
      <MapScreen active={onMap} />
      {!onMap && <Outlet />}
    </>
  )
}
