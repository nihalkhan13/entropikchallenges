export function calculatePerformanceStats(
  username: string,
  checkins: { date: string }[],
  startDate: string,
  currentDay: number
) {
  const totalPossibleDays = currentDay
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
    username,
    completionRate,
    totalDays: completedDays,
    missedDays: totalPossibleDays - completedDays,
    longestStreak,
    rank: 1,
  }
}
