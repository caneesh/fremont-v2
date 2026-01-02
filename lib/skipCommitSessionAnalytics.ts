import type { ProblemAttempt } from '@/types/history'
import type { ProblemProgress } from '@/types/history'
import type { SkipCommitState } from '@/types/skipCommitGate'
import { calculateSkipCommitAnalytics } from '@/types/skipCommitGate'
import { problemHistoryService } from '@/lib/problemHistory'
import { getSessionStartedAtMs } from '@/lib/session'

function parseProgressFromAttempt(attempt: ProblemAttempt): ProblemProgress | null {
  const raw = attempt.status === 'SOLVED'
    ? attempt.finalSolution
    : attempt.draftSolution

  if (!raw) return null

  try {
    return JSON.parse(raw) as ProblemProgress
  } catch {
    return null
  }
}

function toSkipCommitState(progress: ProblemProgress | null | undefined): SkipCommitState | undefined {
  if (!progress?.skipCommit) return undefined
  return {
    decision: progress.skipCommit.decision,
    decisionTimeMs: progress.skipCommit.decisionTimeMs,
    wasSkipped: progress.skipCommit.wasSkipped,
    wasAutoCommit: progress.skipCommit.wasAutoCommit,
    gateShownAt: null,
    decisionMadeAt: null,
  }
}

export function getSkipCommitAnalyticsForCurrentSession() {
  const sessionStartedAtMs = getSessionStartedAtMs()
  const result = problemHistoryService.getHistory({ page: 1, limit: 1000 })
  const attempts = result.attempts.filter(a => {
    const updatedAtMs = Date.parse(a.updatedAt)
    return Number.isFinite(updatedAtMs) && updatedAtMs >= sessionStartedAtMs
  })

  return calculateSkipCommitAnalytics(
    attempts.map(a => {
      const progress = parseProgressFromAttempt(a)
      const skipCommitState = toSkipCommitState(progress)
      const timeSpentMs = progress?.timeSpentMs ?? Math.max(0, Date.parse(a.updatedAt) - Date.parse(a.createdAt))
      return {
        problemId: a.problemId,
        problemTitle: a.problemTitle,
        skipCommitState,
        timeSpentMs,
        expectedTimeMs: progress?.expectedSolveTimeMs,
        wasCorrect: progress?.wasCorrect ?? true,
      }
    })
  )
}
