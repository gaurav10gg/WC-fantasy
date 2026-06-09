/**
 * Client-side scoring helpers (mirrors DB leaderboard view logic).
 */

export const MATCH_WINNER_POINTS = 2
export const EXACT_SCORE_BONUS = 1
export const GROUP_WINNER_POINTS = 5

export function scoreMatchPrediction(prediction, match) {
  if (!match || match.status !== 'finished' || !prediction.predicted_winner) return 0

  let points = 0
  if (prediction.predicted_winner === match.winner) {
    points += MATCH_WINNER_POINTS
  }

  if (
    prediction.predicted_home_score != null &&
    prediction.predicted_away_score != null &&
    match.result_home != null &&
    match.result_away != null &&
    prediction.predicted_home_score === match.result_home &&
    prediction.predicted_away_score === match.result_away
  ) {
    points += EXACT_SCORE_BONUS
  }

  return points
}

export function scoreGroupWinnerPrediction(prediction, groupResults) {
  if (!prediction.predicted_group_winner_team || !prediction.group_winner_label) return 0
  const actual = groupResults[prediction.group_winner_label]
  if (!actual) return 0
  return prediction.predicted_group_winner_team === actual ? GROUP_WINNER_POINTS : 0
}

export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export const GROUP_TEAMS = {
  A: ['Mexico', 'South Africa', 'South Korea', 'Czechia'],
  B: ['Canada', 'Switzerland', 'Qatar', 'Bosnia and Herzegovina'],
  C: ['Brazil', 'Morocco', 'Scotland', 'Haiti'],
  D: ['USA', 'Paraguay', 'Australia', 'Türkiye'],
  E: ['Germany', 'Curaçao', 'Ivory Coast', 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Tunisia', 'Sweden'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Uruguay', 'Saudi Arabia', 'Cape Verde'],
  I: ['France', 'Senegal', 'Norway', 'Iraq'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'Colombia', 'Uzbekistan', 'DR Congo'],
  L: ['England', 'Croatia', 'Ghana', 'Panama'],
}

export const GROUP_LABELS = Object.keys(GROUP_TEAMS)
