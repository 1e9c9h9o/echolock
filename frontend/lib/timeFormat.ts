/**
 * Shared time formatting utility for urgency displays.
 *
 * Returns human-readable remaining time strings:
 *   "2d 5h" | "3h 12m" | "47m" | "Expired"
 */
export function formatTimeRemaining(targetDate: string | Date): string {
  const now = Date.now()
  const target = new Date(targetDate).getTime()
  const diffMs = target - now

  if (diffMs <= 0) return 'Expired'

  const totalMinutes = Math.floor(diffMs / (1000 * 60))
  const totalHours = Math.floor(totalMinutes / 60)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  const minutes = totalMinutes % 60

  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (totalHours > 0) {
    return `${totalHours}h ${minutes}m`
  }
  return `${totalMinutes}m`
}
