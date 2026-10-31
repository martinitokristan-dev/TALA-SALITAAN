import { useNavigate } from 'react-router-dom'
import { Scene } from '../art/Scene'
import { GameTitle } from '../ui/GameTitle'
import { PixelButton } from '../ui/PixelButton'

/** Design: TALA-SALITAAN with the big star and the SIMULAN button. */
export function StartScreen() {
  const navigate = useNavigate()

  return (
    <Scene title={<GameTitle word="SALITAAN" />}>
      <PixelButton mushroom onClick={() => navigate('/pahintulot')}>
        SIMULAN
      </PixelButton>
    </Scene>
  )
}
