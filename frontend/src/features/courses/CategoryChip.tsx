import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface CategoryChipProps {
  label: string
  /** Published-course count shown as a small badge (hidden when 0/undefined). */
  count?: number
  /** Selected state (filter chips); active chips invert to the ink fill. */
  active?: boolean
  /** Render as a Link (browse) when set, otherwise a button (filter). */
  to?: string
  onClick?: () => void
}

/**
 * The single category pill used across the app (homepage browse + catalog
 * filter) so the two stay visually identical. Uses the signature `pop` style
 * with an optional count badge and an active (selected) state.
 */
export function CategoryChip({ label, count, active = false, to, onClick }: CategoryChipProps) {
  const className = cn(
    'pop pop-hover inline-flex items-center gap-2 px-4 py-2 text-sm font-bold',
    active && 'text-background'
  )
  // `.pop` hard-sets its own background, which beats a `bg-*` utility class here,
  // so the active (selected) fill is applied inline to guarantee it wins.
  const style = active ? { backgroundColor: 'var(--foreground)' } : undefined

  const badge =
    count != null && count > 0 ? (
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-xs font-bold',
          active ? 'bg-background text-foreground' : 'bg-tint text-muted-foreground'
        )}
      >
        {count}
      </span>
    ) : null

  if (to) {
    return (
      <Link to={to} className={className} style={style}>
        {label}
        {badge}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className} style={style}>
      {label}
      {badge}
    </button>
  )
}
