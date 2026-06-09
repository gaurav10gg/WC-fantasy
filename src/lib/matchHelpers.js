import { scoreMatchPrediction } from './scoring'

export function winnerSideLabel(match, side) {
  if (side === 'home') return match.team_home
  if (side === 'away') return match.team_away
  return 'Draw'
}

export function getMatchWinnerLabel(match) {
  if (!match?.winner) return null
  return winnerSideLabel(match, match.winner)
}

export function formatMatchScore(match) {
  if (match.result_home == null || match.result_away == null) return null
  return `${match.result_home}–${match.result_away}`
}

export function formatPredictionScore(prediction) {
  if (prediction?.predicted_home_score == null || prediction?.predicted_away_score == null) return null
  return `${prediction.predicted_home_score}–${prediction.predicted_away_score}`
}

export function getMatchPoints(prediction, match) {
  if (!prediction) return 0
  return scoreMatchPrediction(prediction, match)
}

export function isMatchFinished(match) {
  return match?.status === 'finished'
}

export function isMatchUpcoming(match) {
  return match?.status === 'upcoming'
}

export function getCountdownParts(targetDate) {
  const target = new Date(targetDate).getTime()
  const diff = target - Date.now()

  if (diff <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 }
  }

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { expired: false, days, hours, minutes, seconds, totalMs: diff }
}

export function formatCountdown(parts) {
  if (parts.expired) return 'Kickoff'
  if (parts.days > 0) {
    return `${parts.days}d ${parts.hours}h ${parts.minutes}m`
  }
  if (parts.hours > 0) {
    return `${parts.hours}h ${parts.minutes}m ${parts.seconds}s`
  }
  return `${parts.minutes}m ${parts.seconds}s`
}
