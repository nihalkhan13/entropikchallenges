/**
 * Calculates per-user performance stats for the performance report card.
 *
 * @param userName       Display name of the user
 * @param checkins       Array of the user's own check-in objects (just needs `date`)
 * @param startDate      Challenge start date 'YYYY-MM-DD'
 * @param currentDay     How many days into the challenge we are (1-based)
 * @param rank           Pre-computed squad rank (1 = best)
 */
export function calculatePerformanceStats(
  userName: string,
  checkins: { date: string }[],
  startDate: string,
  currentDay: number,
  rank: number = 1,
) {
  const totalPossibleDays = Math.max(currentDay, 1)
  const completedDays = checkins.length
  const completionRate = Math.round((completedDays / totalPossibleDays) * 100) || 0

  // Sort checkins by date ascending
  const sortedDates = checkins
    .map(c => c.date)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

  let longestStreak = 0
  let currentStreak = 0
  let lastDate: Date | null = null

  sortedDates.forEach(dateStr => {
    const date = new Date(dateStr)
    if (!lastDate) {
      currentStreak = 1
    } else {
      const diffDays = (date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      if (Math.round(diffDays) === 1) {
        currentStreak++
      } else {
        currentStreak = 1
      }
    }
    longestStreak = Math.max(longestStreak, currentStreak)
    lastDate = date
  })

  return {
    userName,
    completionRate,
    totalDays: completedDays,
    missedDays: totalPossibleDays - completedDays,
    longestStreak,
    rank,
    currentDay,
  }
}

/**
 * Computes the squad rank for a given user based on completion rate.
 * Tiebreaker: who completed a check-in earliest (first checkin date ASC).
 *
 * @param userId      The user whose rank we want
 * @param allCheckins All check-ins across all users (user_id + date)
 * @param currentDay  Days into the challenge (denominator for completion rate)
 */
export function calculateUserRank(
  userId: string,
  allCheckins: { user_id: string; date: string }[],
  currentDay: number,
): number {
  if (currentDay <= 0) return 1

  // Group checkins by user
  const byUser: Record<string, { count: number; firstDate: string }> = {}
  for (const c of allCheckins) {
    if (!byUser[c.user_id]) {
      byUser[c.user_id] = { count: 0, firstDate: c.date }
    }
    byUser[c.user_id].count++
    // Track the earliest check-in date
    if (c.date < byUser[c.user_id].firstDate) {
      byUser[c.user_id].firstDate = c.date
    }
  }

  // Make sure the current user is represented even with 0 check-ins
  if (!byUser[userId]) {
    byUser[userId] = { count: 0, firstDate: '9999-12-31' }
  }

  // Build sorted list: completion rate DESC, earliest firstDate ASC
  const sorted = Object.entries(byUser).sort(([, a], [, b]) => {
    const rateA = a.count / currentDay
    const rateB = b.count / currentDay
    if (rateB !== rateA) return rateB - rateA
    return a.firstDate.localeCompare(b.firstDate)
  })

  const idx = sorted.findIndex(([id]) => id === userId)
  return idx === -1 ? sorted.length + 1 : idx + 1
}
