import { useNavigate } from 'react-router-dom'
import { PixelArt } from '../art/PixelArt'
import { Scene } from '../art/Scene'
import { MUSHROOM, MUSHROOM_PALETTE, SIGN, SIGN_PALETTE } from '../art/sprites'
import { GameTitle } from '../ui/GameTitle'
import { PixelButton } from '../ui/PixelButton'

const POINTER = ['....oo', '..oowo', 'oowwwo', 'oowwwo', '..oowo', '....oo']

/** Design: PUPIL LOGIN / TEACHER LOGIN with the wooden sign and "MISSION STARTS SOON". */
export function LoginChoiceScreen() {
  const navigate = useNavigate()

  return (
    <Scene
      title={<GameTitle word="SALITAAN" />}
      leftProp={<PixelArt rows={SIGN} palette={SIGN_PALETTE} />}
      footer={
        <>
          MISSION STARTS SOON.
          <br />
          SEE YOU THERE!
        </>
      }
    >
      <div className="choice-list">
        <div className="choice" data-default="true">
          <PixelButton size="medium" onClick={() => navigate('/pupil')}>
            PUPIL LOGIN
          </PixelButton>
          <PixelArt rows={POINTER} palette={{ o: '#1d1b16', w: '#ffffff' }} className="choice-pointer" />
        </div>
        <div className="choice">
          <PixelButton size="medium" onClick={() => navigate('/teacher/login')}>
            TEACHER LOGIN
          </PixelButton>
          <PixelArt rows={POINTER} palette={{ o: '#1d1b16', w: '#ffffff' }} className="choice-pointer" />
        </div>
      </div>
      <PixelArt rows={MUSHROOM} palette={MUSHROOM_PALETTE} className="login-mushroom" />
    </Scene>
  )
}
