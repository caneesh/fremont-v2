/**
 * User Profile Types
 *
 * Defines the structure for user profile data, including their selected track/level.
 */

import type { Track } from '@prisma/client'

/**
 * User profile stored in localStorage
 */
export interface UserProfile {
  /** User ID from auth session */
  userId: string

  /** Selected learning track/level */
  track: Track

  /** Optional display name */
  displayName?: string

  /** When the profile was first created */
  createdAt: string

  /** When the profile was last updated */
  updatedAt: string
}

/**
 * Partial profile for updates
 */
export type UserProfileUpdate = Partial<Omit<UserProfile, 'userId' | 'createdAt'>>

/**
 * Profile change event for subscribers
 */
export interface ProfileChangeEvent {
  previous: UserProfile | null
  current: UserProfile | null
  changedFields: (keyof UserProfile)[]
}

/**
 * Track display information
 */
export interface TrackInfo {
  id: Track
  name: string
  shortName: string
  description: string
  color: string
  bgColor: string
  order: number
}

/**
 * All available tracks with display info
 */
export const TRACK_INFO: Record<Track, TrackInfo> = {
  foundation1: {
    id: 'foundation1',
    name: 'Foundation 1',
    shortName: 'F1',
    description: 'Build physical intuition without advanced math. Qualitative reasoning, diagrams, cause-effect.',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    order: 1,
  },
  foundation2: {
    id: 'foundation2',
    name: 'Foundation 2',
    shortName: 'F2',
    description: 'Bridge to quantitative reasoning. Vector sense, constraints, multi-step problems.',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    order: 2,
  },
  intermediate: {
    id: 'intermediate',
    name: 'Intermediate',
    shortName: 'Int',
    description: 'Standard physics problems. Algebra, trigonometry, multi-concept integration.',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    order: 3,
  },
  competitive: {
    id: 'competitive',
    name: 'Competitive',
    shortName: 'Comp',
    description: 'Competition-level problems. Advanced techniques, time pressure, challenging scenarios.',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    order: 4,
  },
}

/**
 * Get sorted list of tracks
 */
export function getOrderedTracks(): TrackInfo[] {
  return Object.values(TRACK_INFO).sort((a, b) => a.order - b.order)
}

/**
 * Get track info by ID
 */
export function getTrackInfo(track: Track): TrackInfo {
  return TRACK_INFO[track]
}
