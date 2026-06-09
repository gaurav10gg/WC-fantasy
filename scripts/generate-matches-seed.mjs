/**
 * Generates supabase/seed/matches.sql from official FIFA WC 2026 fixtures.
 * Run: node scripts/generate-matches-seed.mjs
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const TEAM_ALIASES = {
  'Korea Republic': 'South Korea',
  "Côte d'Ivoire": 'Ivory Coast',
  'Cabo Verde': 'Cape Verde',
  'IR Iran': 'Iran',
  'Congo DR': 'DR Congo',
}

const ROUND_MAP = {
  1: { round_key: 'group_md1', matchday: 1, stage: 'group' },
  2: { round_key: 'group_md2', matchday: 2, stage: 'group' },
  3: { round_key: 'group_md3', matchday: 3, stage: 'group' },
  4: { round_key: 'round_of_32', matchday: null, stage: 'round_of_32' },
  5: { round_key: 'round_of_16', matchday: null, stage: 'round_of_16' },
  6: { round_key: 'quarter_final', matchday: null, stage: 'quarter_final' },
  7: { round_key: 'semi_final', matchday: null, stage: 'semi_final' },
  8: { round_key: 'final', matchday: null, stage: 'final' },
}

function escapeSql(str) {
  return str.replace(/'/g, "''")
}

function normalizeTeam(name) {
  if (!name || name === 'To be announced') return 'TBD'
  return TEAM_ALIASES[name] ?? name
}

function parseDateUtc(dateUtc) {
  return new Date(dateUtc.replace(' ', 'T')).toISOString()
}

function groupLabel(group) {
  if (!group) return null
  const m = group.match(/Group ([A-L])/i)
  return m ? m[1] : null
}

function parseCsvLine(line) {
  const parts = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) {
      parts.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  parts.push(cur)
  return parts
}

function loadFixtures() {
  const jsonPath = join(__dirname, 'wc2026-fixtures.json')
  const csvPath = join(__dirname, 'wc2026-fixtures.csv')

  if (existsSync(jsonPath)) {
    return JSON.parse(readFileSync(jsonPath, 'utf8'))
  }

  const lines = readFileSync(csvPath, 'utf8').trim().split(/\r?\n/).slice(1)
  return lines.filter(Boolean).map((line) => {
    const [MatchNumber, RoundNumber, DateUtc, Location, HomeTeam, AwayTeam, Group] = parseCsvLine(line)
    return {
      MatchNumber: Number(MatchNumber),
      RoundNumber: Number(RoundNumber),
      DateUtc,
      Location,
      HomeTeam,
      AwayTeam,
      Group: Group || null,
    }
  })
}

const fixtures = loadFixtures()

const rows = fixtures.map((f) => {
  const round = ROUND_MAP[f.RoundNumber]
  if (!round) throw new Error(`Unknown RoundNumber ${f.RoundNumber} for match ${f.MatchNumber}`)

  const group_label = groupLabel(f.Group)
  const round_key = round.round_key
  const visible = round_key === 'group_md1'

  return {
    stage: round.stage,
    group_label,
    team_home: normalizeTeam(f.HomeTeam),
    team_away: normalizeTeam(f.AwayTeam),
    match_date: parseDateUtc(f.DateUtc),
    match_number: f.MatchNumber,
    matchday: round.matchday,
    round_key,
    visible,
    location: f.Location,
  }
})

const sql = `-- World Cup 2026 — official FIFA fixture list (${rows.length} matches)
-- Source: scripts/wc2026-fixtures.json — run: node scripts/generate-matches-seed.mjs
-- Only Round 1 (group_md1) is visible for predictions initially

DELETE FROM matches;

INSERT INTO matches (
  stage, group_label, team_home, team_away, match_date, status,
  match_number, matchday, round_key, visible_for_predictions
) VALUES
${rows
  .map((r) => {
    const gl = r.group_label ? `'${r.group_label}'` : 'NULL'
    const md = r.matchday ?? 'NULL'
    return `  ('${r.stage}', ${gl}, '${escapeSql(r.team_home)}', '${escapeSql(r.team_away)}', '${r.match_date}', 'upcoming', ${r.match_number}, ${md}, '${r.round_key}', ${r.visible})`
  })
  .join(',\n')};
`

const outPath = join(__dirname, '..', 'supabase', 'seed', 'matches.sql')
writeFileSync(outPath, sql)
console.log(`Wrote ${rows.length} matches to ${outPath}`)
