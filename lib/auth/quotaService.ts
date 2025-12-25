import type { UsageQuota, QuotaLimits } from '@/types/auth'
import { DEFAULT_QUOTA_LIMITS } from '@/types/auth'

type QuotaType = 'problems' | 'hints' | 'prerequisites' | 'reflections' | 'variations' | 'paperUploads'

class QuotaService {
  private readonly QUOTA_KEY_PREFIX = 'quota_'

  private getTodayKey(): string {
    const today = new Date().toISOString().split('T')[0]
    return today
  }

  private getQuotaKey(userId: string): string {
    return `${this.QUOTA_KEY_PREFIX}${userId}_${this.getTodayKey()}`
  }

  getQuota(userId: string): UsageQuota {
    if (typeof window === 'undefined') {
      return this.getEmptyQuota(userId)
    }

    const key = this.getQuotaKey(userId)
    const quotaData = localStorage.getItem(key)

    if (!quotaData) {
      return this.getEmptyQuota(userId)
    }

    try {
      return JSON.parse(quotaData) as UsageQuota
    } catch {
      return this.getEmptyQuota(userId)
    }
  }

  private getEmptyQuota(userId: string): UsageQuota {
    return {
      userId,
      date: this.getTodayKey(),
      problemsGenerated: 0,
      hintsGenerated: 0,
      prerequisitesChecked: 0,
      reflectionsGenerated: 0,
      variationsGenerated: 0,
      paperUploadsGenerated: 0,
    }
  }

  private saveQuota(quota: UsageQuota): void {
    if (typeof window === 'undefined') return

    const key = this.getQuotaKey(quota.userId)
    localStorage.setItem(key, JSON.stringify(quota))
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

    this.saveQuota(quota)
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

  resetQuota(userId: string): void {
    if (typeof window === 'undefined') return

    const key = this.getQuotaKey(userId)
    localStorage.removeItem(key)
  }

  cleanOldQuotas(): void {
    if (typeof window === 'undefined') return

    const today = this.getTodayKey()
    const keysToRemove: string[] = []

    // Find all quota keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.QUOTA_KEY_PREFIX) && !key.includes(today)) {
        keysToRemove.push(key)
      }
    }

    // Remove old quotas
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }
}

export const quotaService = new QuotaService()
