import type { UsageQuota, QuotaLimits } from '@/types/auth'
import { DEFAULT_QUOTA_LIMITS } from '@/types/auth'

type QuotaType = 'problems' | 'hints' | 'prerequisites' | 'reflections' | 'variations' | 'paperUploads'

// In-memory quota tracking (in production, use database or Redis)
// Map structure: userId -> date -> UsageQuota
const quotaStore = new Map<string, Map<string, UsageQuota>>()

class ServerQuotaService {
  private getTodayKey(): string {
    const today = new Date().toISOString().split('T')[0]
    return today
  }

  private getUserQuotas(userId: string): Map<string, UsageQuota> {
    if (!quotaStore.has(userId)) {
      quotaStore.set(userId, new Map())
    }
    return quotaStore.get(userId)!
  }

  getQuota(userId: string): UsageQuota {
    const userQuotas = this.getUserQuotas(userId)
    const today = this.getTodayKey()

    if (!userQuotas.has(today)) {
      const newQuota: UsageQuota = {
        userId,
        date: today,
        problemsGenerated: 0,
        hintsGenerated: 0,
        prerequisitesChecked: 0,
        reflectionsGenerated: 0,
        variationsGenerated: 0,
        paperUploadsGenerated: 0,
      }
      userQuotas.set(today, newQuota)
      return newQuota
    }

    return userQuotas.get(today)!
  }

  incrementQuota(userId: string, type: QuotaType): UsageQuota {
    const quota = this.getQuota(userId)

    switch (type) {
      case 'problems':
        quota.problemsGenerated++
        break
      case 'hints':
        quota.hintsGenerated++
        break
      case 'prerequisites':
        quota.prerequisitesChecked++
        break
      case 'reflections':
        quota.reflectionsGenerated++
        break
      case 'variations':
        quota.variationsGenerated++
        break
      case 'paperUploads':
        quota.paperUploadsGenerated++
        break
    }

    return quota
  }

  checkQuota(userId: string, type: QuotaType, limits: QuotaLimits = DEFAULT_QUOTA_LIMITS): boolean {
    const quota = this.getQuota(userId)

    switch (type) {
      case 'problems':
        return quota.problemsGenerated < limits.dailyProblems
      case 'hints':
        return quota.hintsGenerated < limits.dailyHints
      case 'prerequisites':
        return quota.prerequisitesChecked < limits.dailyPrerequisites
      case 'reflections':
        return quota.reflectionsGenerated < limits.dailyReflections
      case 'variations':
        return quota.variationsGenerated < limits.dailyVariations
      case 'paperUploads':
        return quota.paperUploadsGenerated < limits.dailyPaperUploads
      default:
        return false
    }
  }

  getRemainingQuota(userId: string, limits: QuotaLimits = DEFAULT_QUOTA_LIMITS) {
    const quota = this.getQuota(userId)

    return {
      problems: Math.max(0, limits.dailyProblems - quota.problemsGenerated),
      hints: Math.max(0, limits.dailyHints - quota.hintsGenerated),
      prerequisites: Math.max(0, limits.dailyPrerequisites - quota.prerequisitesChecked),
      reflections: Math.max(0, limits.dailyReflections - quota.reflectionsGenerated),
      variations: Math.max(0, limits.dailyVariations - quota.variationsGenerated),
      paperUploads: Math.max(0, limits.dailyPaperUploads - quota.paperUploadsGenerated),
    }
  }

  // Clean up old quotas (run daily)
  cleanOldQuotas(): void {
    const today = this.getTodayKey()

    quotaStore.forEach((userQuotas, userId) => {
      const datesToRemove: string[] = []

      userQuotas.forEach((quota, date) => {
        if (date !== today) {
          datesToRemove.push(date)
        }
      })

      datesToRemove.forEach(date => userQuotas.delete(date))
    })
  }

  // Get all quotas for admin dashboard
  getAllQuotas(): Array<UsageQuota & { userName?: string }> {
    const today = this.getTodayKey()
    const allQuotas: Array<UsageQuota & { userName?: string }> = []

    quotaStore.forEach((userQuotas, userId) => {
      const todayQuota = userQuotas.get(today)
      if (todayQuota) {
        allQuotas.push(todayQuota)
      }
    })

    return allQuotas
  }

  // Get total API calls today
  getTotalAPICalls(): number {
    const today = this.getTodayKey()
    let total = 0

    quotaStore.forEach((userQuotas) => {
      const todayQuota = userQuotas.get(today)
      if (todayQuota) {
        total += todayQuota.problemsGenerated
        total += todayQuota.hintsGenerated
        total += todayQuota.prerequisitesChecked
        total += todayQuota.reflectionsGenerated
        total += todayQuota.variationsGenerated
        total += todayQuota.paperUploadsGenerated
      }
    })

    return total
  }

  // Estimate cost (rough approximation)
  getEstimatedCost(): number {
    const today = this.getTodayKey()
    let totalCost = 0

    quotaStore.forEach((userQuotas) => {
      const todayQuota = userQuotas.get(today)
      if (todayQuota) {
        totalCost += todayQuota.problemsGenerated * 0.10 // $0.10 per scaffold
        totalCost += todayQuota.hintsGenerated * 0.01 // $0.01 per hint
        totalCost += todayQuota.prerequisitesChecked * 0.03 // $0.03 per prerequisite
        totalCost += todayQuota.reflectionsGenerated * 0.02 // $0.02 per reflection
        totalCost += todayQuota.variationsGenerated * 0.03 // $0.03 per variation
        totalCost += todayQuota.paperUploadsGenerated * 0.05 // $0.05 per paper upload analysis
      }
    })

    return totalCost
  }
}

export const serverQuotaService = new ServerQuotaService()

// Clean old quotas every 6 hours
setInterval(() => {
  serverQuotaService.cleanOldQuotas()
}, 6 * 60 * 60 * 1000)
