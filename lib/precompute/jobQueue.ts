/**
 * Precompute Job Queue Service
 *
 * Provides methods to queue precomputation jobs.
 * Used by approval flows and manual triggers.
 */

import { prisma } from '@/lib/db'

export type PrecomputeJobType =
  | 'scaffold_outline'
  | 'scaffold_step'
  | 'concept_contrast'
  | 'variation'
  | 'simulation_params'

interface QueueJobOptions {
  priority?: number
  contentKey?: string
}

interface QueueAllJobsResult {
  queued: string[]
  skipped: string[]
  errors: string[]
}

/**
 * Queue a single precompute job
 */
export async function queuePrecomputeJob(
  jobType: PrecomputeJobType,
  questionId: string,
  options: QueueJobOptions = {}
): Promise<{ queued: boolean; jobId?: string; reason?: string }> {
  const { priority = 0, contentKey } = options

  try {
    // Check if job already exists and is pending/running
    const existing = await prisma.precomputeJob.findFirst({
      where: {
        jobType,
        questionId,
        contentKey: contentKey || null,
        status: { in: ['pending', 'running'] },
      },
    })

    if (existing) {
      return { queued: false, reason: 'Job already exists' }
    }

    // Create new job
    const job = await prisma.precomputeJob.create({
      data: {
        jobType,
        questionId,
        contentKey,
        priority,
        status: 'pending',
      },
    })

    return { queued: true, jobId: job.id }
  } catch (error) {
    console.error('[JobQueue] Error queuing job:', error)
    return { queued: false, reason: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Queue all precompute jobs for a question (used on approval)
 */
export async function queueAllJobsForQuestion(
  questionId: string,
  priority: number = 10
): Promise<QueueAllJobsResult> {
  const result: QueueAllJobsResult = {
    queued: [],
    skipped: [],
    errors: [],
  }

  const jobTypes: PrecomputeJobType[] = [
    'scaffold_outline',
    'simulation_params',
    // Note: scaffold_step jobs are queued by the outline job when it completes
    // Note: concept_contrast uses domain-based lookup, not question-specific
  ]

  // Also queue 3 variation types
  const variationTypes = ['easier', 'harder', 'same']

  for (const jobType of jobTypes) {
    const { queued, reason } = await queuePrecomputeJob(jobType, questionId, { priority })
    if (queued) {
      result.queued.push(jobType)
    } else if (reason === 'Job already exists') {
      result.skipped.push(jobType)
    } else {
      result.errors.push(`${jobType}: ${reason}`)
    }
  }

  // Queue variation jobs
  for (const varType of variationTypes) {
    const { queued, reason } = await queuePrecomputeJob('variation', questionId, {
      priority: priority - 1,
      contentKey: varType,
    })
    if (queued) {
      result.queued.push(`variation:${varType}`)
    } else if (reason === 'Job already exists') {
      result.skipped.push(`variation:${varType}`)
    } else {
      result.errors.push(`variation:${varType}: ${reason}`)
    }
  }

  return result
}

/**
 * Get pending job count by type
 */
export async function getPendingJobCounts(): Promise<Record<string, number>> {
  const counts = await prisma.precomputeJob.groupBy({
    by: ['jobType'],
    where: { status: 'pending' },
    _count: true,
  })

  const result: Record<string, number> = {}
  for (const count of counts) {
    result[count.jobType] = count._count
  }
  return result
}

/**
 * Get job statistics
 */
export async function getJobStats(): Promise<{
  pending: number
  running: number
  completed: number
  failed: number
  total: number
}> {
  const [pending, running, completed, failed] = await Promise.all([
    prisma.precomputeJob.count({ where: { status: 'pending' } }),
    prisma.precomputeJob.count({ where: { status: 'running' } }),
    prisma.precomputeJob.count({ where: { status: 'completed' } }),
    prisma.precomputeJob.count({ where: { status: 'failed' } }),
  ])

  return {
    pending,
    running,
    completed,
    failed,
    total: pending + running + completed + failed,
  }
}

/**
 * Retry failed jobs
 */
export async function retryFailedJobs(jobType?: PrecomputeJobType): Promise<number> {
  const where: Record<string, unknown> = {
    status: 'failed',
    attempts: { lt: 3 }, // Only retry if under max attempts
  }

  if (jobType) {
    where.jobType = jobType
  }

  const result = await prisma.precomputeJob.updateMany({
    where,
    data: {
      status: 'pending',
      lastError: null,
    },
  })

  return result.count
}

/**
 * Clear completed jobs older than specified days
 */
export async function clearOldCompletedJobs(daysOld: number = 30): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  const result = await prisma.precomputeJob.deleteMany({
    where: {
      status: 'completed',
      completedAt: { lt: cutoffDate },
    },
  })

  return result.count
}
