import { useEffect, useRef } from 'react'
import { fireGoalConfetti, markMatchCelebrated, wasMatchCelebrated } from '../lib/confetti'
import { getMatchPoints, isMatchFinished } from '../lib/matchHelpers'

export function useConfettiOnCorrectResults(matches, matchPredictions) {
  const prevStatusRef = useRef({})

  useEffect(() => {
    for (const match of matches) {
      const prev = prevStatusRef.current[match.id]
      prevStatusRef.current[match.id] = match.status

      if (!isMatchFinished(match)) continue

      const prediction = matchPredictions[match.id]
      const points = getMatchPoints(prediction, match)
      const justFinished = prev && prev !== 'finished'
      const notYetCelebrated = !wasMatchCelebrated(match.id)

      if (points > 0 && justFinished && notYetCelebrated) {
        fireGoalConfetti()
        markMatchCelebrated(match.id)
      }
    }
  }, [matches, matchPredictions])
}
