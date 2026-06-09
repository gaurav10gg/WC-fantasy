import Flag from './Flag'

export default function TeamName({ name, size = 'md', className = '' }) {
  const flagSize = size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'
  const textSizes = {
    sm: 'text-sm gap-2',
    md: 'text-base gap-2',
    lg: 'text-lg gap-2.5',
  }

  return (
    <span
      className={`inline-flex items-center font-display font-semibold uppercase tracking-wide ${textSizes[size]} ${className}`}
    >
      <Flag team={name} size={flagSize} />
      <span className="leading-tight">{name}</span>
    </span>
  )
}
