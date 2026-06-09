/**
 * Generates supabase/seed/matches.sql from official WC 2026 group draw.
 * Run: node scripts/generate-matches-seed.mjs
 */

import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const GROUPS = {
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

const FIXTURES = [
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
  [0, 3],
  [1, 2],
]

const GROUP_START = new Date('2026-06-11T15:00:00Z')
const DAY_MS = 24 * 60 * 60 * 1000

function escapeSql(str) {
  return str.replace(/'/g, "''")
}

function matchdayFromNumber(n) {
  if (n <= 2) return 1
  if (n <= 4) return 2
  return 3
}

function roundKeyFromNumber(n) {
  if (n <= 2) return 'group_md1'
  if (n <= 4) return 'group_md2'
  return 'group_md3'
}

const rows = []
let globalDay = 0

for (const [label, teams] of Object.entries(GROUPS)) {
  FIXTURES.forEach(([hi, ai], i) => {
    const matchNumber = i + 1
    const matchDate = new Date(GROUP_START.getTime() + globalDay * DAY_MS + i * 3 * 60 * 60 * 1000)
    rows.push({
      group_label: label,
      team_home: teams[hi],
      team_away: teams[ai],
      match_date: matchDate.toISOString(),
      match_number: matchNumber,
      matchday: matchdayFromNumber(matchNumber),
      round_key: roundKeyFromNumber(matchNumber),
      visible: roundKeyFromNumber(matchNumber) === 'group_md1',
    })
  })
  globalDay += 1
}

const sql = `-- World Cup 2026 group stage matches (72 matches, 12 groups)
-- Generated from official FIFA draw data
-- Only Round 1 (group_md1) is visible for predictions initially

DELETE FROM matches WHERE stage = 'group';

INSERT INTO matches (
  stage, group_label, team_home, team_away, match_date, status,
  match_number, matchday, round_key, visible_for_predictions
) VALUES
${rows
  .map(
    (r) =>
      `  ('group', '${r.group_label}', '${escapeSql(r.team_home)}', '${escapeSql(r.team_away)}', '${r.match_date}', 'upcoming', ${r.match_number}, ${r.matchday}, '${r.round_key}', ${r.visible})`
  )
  .join(',\n')};
`

const outPath = join(__dirname, '..', 'supabase', 'seed', 'matches.sql')
writeFileSync(outPath, sql)
console.log(`Wrote ${rows.length} matches to ${outPath}`)
