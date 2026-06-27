/** Format seconds as m:ss / h:mm:ss. */
export function formatDuration(totalSec?: number | null): string | null {
  if (!totalSec || totalSec <= 0) return null
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = Math.floor(totalSec % 60)
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? h + ':' : ''}${mm}:${String(s).padStart(2, '0')}`
}
