export interface PilotUser {
  code: string
  userId: string
  email?: string
  name?: string
  isActive: boolean
  createdAt: string
  lastActiveAt: string
}

export interface UserSession {
  userId: string
  code: string
  authenticatedAt: string
}

export interface UsageQuota {
  userId: string
  date: string // YYYY-MM-DD
  problemsGenerated: number
  hintsGenerated: number
  prerequisitesChecked: number
  reflectionsGenerated: number
  variationsGenerated: number
  paperUploadsGenerated: number
}

export interface QuotaLimits {
  dailyProblems: number
  dailyHints: number
  dailyPrerequisites: number
  dailyReflections: number
  dailyVariations: number
  dailyPaperUploads: number
}

export const DEFAULT_QUOTA_LIMITS: QuotaLimits = {
  dailyProblems: 5,
  dailyHints: 10,
  dailyPrerequisites: 2,
  dailyReflections: 2,
  dailyVariations: 2,
  dailyPaperUploads: 20,
}
