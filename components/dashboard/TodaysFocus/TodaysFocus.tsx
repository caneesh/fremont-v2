'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import PrimaryAction from './PrimaryAction'
import SecondaryActions from './SecondaryActions'
import ActionRationale from './ActionRationale'
import { computeTodaysFocus, getEmptyState } from '@/lib/dashboard/todaysFocusService'
import { authService } from '@/lib/auth/authService'
import type { TodaysFocusData } from '@/types/todaysFocus'

/**
 * Loading skeleton for the Today's Focus section
 */
function LoadingSkeleton() {
  return (
    <Card variant="elevated" padding="lg">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="h-5 w-32 bg-gray-200 dark:bg-dark-card-soft rounded mb-4" />

        {/* Primary action skeleton */}
        <div className="h-20 bg-gray-200 dark:bg-dark-card-soft rounded-xl mb-3" />

        {/* Rationale skeleton */}
        <div className="h-4 w-3/4 bg-gray-100 dark:bg-dark-card-soft rounded" />
      </div>
    </Card>
  )
}

/**
 * Empty state for new users with no history
 */
function EmptyState({ data }: { data: TodaysFocusData }) {
  return (
    <Card variant="elevated" padding="lg">
      <div className="text-center py-4">
        {/* Welcome icon */}
        <div className="
          inline-flex items-center justify-center
          w-16 h-16
          mb-4
          bg-accent/10 dark:bg-accent/20
          rounded-full
        ">
          <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
          Welcome to PhysicsScaffold
        </h2>

        <p className="text-gray-600 dark:text-dark-text-secondary mb-6 max-w-sm mx-auto">
          {data.rationale}
        </p>

        <PrimaryAction action={data.primaryAction} />
      </div>
    </Card>
  )
}

interface TodaysFocusProps {
  /**
   * Optional className for custom styling
   */
  className?: string
}

/**
 * Today's Focus Section
 *
 * The primary decision-making component on the dashboard.
 * Shows exactly ONE primary action to reduce decision fatigue.
 *
 * Priority order:
 * 1. In-progress problem (continuity)
 * 2. Overdue SRS cards (urgency)
 * 3. Pattern track recommendation (curriculum)
 * 4. Start fresh (new users)
 */
export default function TodaysFocus({ className = '' }: TodaysFocusProps) {
  const [data, setData] = useState<TodaysFocusData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadFocusData = () => {
      try {
        const userId = authService.getUser()?.userId || 'anonymous'
        const focusData = computeTodaysFocus(userId)
        setData(focusData)
      } catch (error) {
        console.error('[TodaysFocus] Error computing focus data:', error)
        // Fall back to empty state
        setData(getEmptyState())
      } finally {
        setIsLoading(false)
      }
    }

    loadFocusData()
  }, [])

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />
  }

  // No data (shouldn't happen, but handle gracefully)
  if (!data) {
    return <LoadingSkeleton />
  }

  // Check if this is effectively an empty/new user state
  const isNewUser = data.primaryAction.type === 'start_fresh' && data.secondaryActions.length === 0

  if (isNewUser) {
    return <EmptyState data={data} />
  }

  // Normal state with recommendations
  return (
    <Card variant="elevated" padding="lg" className={className}>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
          Today's Focus
        </h2>
        <span className="
          px-2 py-0.5
          text-xs font-medium
          bg-accent/10 dark:bg-accent/20
          text-accent
          rounded-full
        ">
          Recommended
        </span>
      </div>

      {/* Primary action - the single most important CTA */}
      <PrimaryAction action={data.primaryAction} />

      {/* Rationale - explains why this was chosen */}
      <ActionRationale rationale={data.rationale} />

      {/* Secondary actions - de-emphasized alternatives */}
      <SecondaryActions actions={data.secondaryActions} />
    </Card>
  )
}
