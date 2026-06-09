import * as FlagIcons from 'country-flag-icons/react/3x2'
import { getTeamCode, LOCAL_FLAG_FILES } from '../lib/flags'

const SIZES = {
  xs: 'h-3 w-[18px]',
  sm: 'h-3.5 w-[21px]',
  md: 'h-4 w-6',
  lg: 'h-5 w-[30px]',
  xl: 'h-7 w-[42px]',
}

export default function Flag({ team, size = 'md', className = '' }) {
  const sizeClass = `${SIZES[size]} ${className}`

  const localFile = LOCAL_FLAG_FILES[team]
  if (localFile) {
    return (
      <img
        src={localFile}
        alt=""
        className={`inline-block shrink-0 rounded-sm object-cover shadow-sm ring-1 ring-white/10 ${sizeClass}`}
      />
    )
  }

  const code = getTeamCode(team)
  if (!code || code === 'SCT' || code === 'ENG') {
    return <span className={`inline-block shrink-0 rounded-sm bg-border ${sizeClass}`} aria-hidden />
  }

  const FlagSvg = FlagIcons[code]
  if (!FlagSvg) {
    return <span className={`inline-block shrink-0 rounded-sm bg-border ${sizeClass}`} aria-hidden />
  }

  return (
    <FlagSvg
      title={team}
      className={`inline-block shrink-0 rounded-sm shadow-sm ring-1 ring-white/10 ${sizeClass}`}
    />
  )
}
