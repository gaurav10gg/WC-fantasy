import { useEffect, useState } from 'react'
import { getCountdownParts } from '../lib/matchHelpers'

export function useKickoffCountdown(matchDate, active = true) {
  const [parts, setParts] = useState(() =>
    matchDate ? getCountdownParts(matchDate) : { expired: true }
  )

  useEffect(() => {
    if (!matchDate || !active) return

    function tick() {
      setParts(getCountdownParts(matchDate))
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [matchDate, active])

  return parts
}
