/** Team name → ISO 3166-1 alpha-2 */
export const TEAM_CODES = {
  Mexico: 'MX',
  'South Africa': 'ZA',
  'South Korea': 'KR',
  Czechia: 'CZ',
  Canada: 'CA',
  Switzerland: 'CH',
  Qatar: 'QA',
  'Bosnia and Herzegovina': 'BA',
  Brazil: 'BR',
  Morocco: 'MA',
  Scotland: 'SCT',
  Haiti: 'HT',
  USA: 'US',
  Paraguay: 'PY',
  Australia: 'AU',
  Türkiye: 'TR',
  Turkey: 'TR',
  Germany: 'DE',
  Curaçao: 'CW',
  'Ivory Coast': 'CI',
  Ecuador: 'EC',
  Netherlands: 'NL',
  Japan: 'JP',
  Tunisia: 'TN',
  Sweden: 'SE',
  Belgium: 'BE',
  Egypt: 'EG',
  Iran: 'IR',
  'New Zealand': 'NZ',
  Spain: 'ES',
  Uruguay: 'UY',
  'Saudi Arabia': 'SA',
  'Cape Verde': 'CV',
  France: 'FR',
  Senegal: 'SN',
  Norway: 'NO',
  Iraq: 'IQ',
  Argentina: 'AR',
  Algeria: 'DZ',
  Austria: 'AT',
  Jordan: 'JO',
  Portugal: 'PT',
  Colombia: 'CO',
  Uzbekistan: 'UZ',
  'DR Congo': 'CD',
  England: 'ENG',
  Croatia: 'HR',
  Ghana: 'GH',
  Panama: 'PA',
}

/** Home nations — local SVGs in /public/flags */
export const LOCAL_FLAG_FILES = {
  Scotland: '/flags/gb-sct.svg',
  England: '/flags/gb-eng.svg',
}

export function getTeamCode(teamName) {
  if (!teamName) return null
  return TEAM_CODES[teamName] ?? null
}

export const HERO_TEAMS = ['Brazil', 'Argentina', 'France', 'Germany', 'Spain', 'USA', 'Mexico', 'England']
