export const ROUNDS = [
  { key: 'group_md1', label: 'Round 1', subtitle: 'Group Stage — Matchday 1', type: 'matches' },
  { key: 'group_md2', label: 'Round 2', subtitle: 'Group Stage — Matchday 2', type: 'matches' },
  { key: 'group_md3', label: 'Round 3', subtitle: 'Group Stage — Matchday 3', type: 'matches' },
  { key: 'group_winners', label: 'Round 4', subtitle: 'Group Winners', type: 'group_winners' },
  { key: 'round_of_32', label: 'Round of 32', subtitle: 'Knockout', type: 'matches' },
  { key: 'round_of_16', label: 'Round of 16', subtitle: 'Knockout', type: 'matches' },
  { key: 'quarter_final', label: 'Quarter-Finals', subtitle: 'Knockout', type: 'matches' },
  { key: 'semi_final', label: 'Semi-Finals', subtitle: 'Knockout', type: 'matches' },
  { key: 'final', label: 'Final', subtitle: 'Knockout', type: 'matches' },
]

export function getRoundInfo(roundKey) {
  return ROUNDS.find((r) => r.key === roundKey) ?? { key: roundKey, label: roundKey, subtitle: '', type: 'matches' }
}

export function matchdayFromNumber(n) {
  if (n <= 2) return 1
  if (n <= 4) return 2
  return 3
}

export function roundKeyFromMatch(stage, matchNumber) {
  if (stage === 'group') {
    if (matchNumber <= 2) return 'group_md1'
    if (matchNumber <= 4) return 'group_md2'
    return 'group_md3'
  }
  return stage
}
