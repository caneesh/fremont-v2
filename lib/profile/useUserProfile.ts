/**
 * useUserProfile Hook
 *
 * React hook for accessing and updating user profile.
 * Subscribes to profile changes for reactive updates.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Track } from '@prisma/client'
import { userProfileStore } from './userProfileStore'
import type { UserProfile, UserProfileUpdate, ProfileChangeEvent } from './types'
import { authService } from '@/lib/auth/authService'

export interface UseUserProfileReturn {
  /** Current user profile (null if not set) */
  profile: UserProfile | null

  /** Current track (returns default if no profile) */
  track: Track

  /** Whether profile has been loaded */
  isLoaded: boolean

  /** Update the profile */
  updateProfile: (update: UserProfileUpdate) => void

  /** Set the track */
  setTrack: (track: Track) => void

  /** Clear the profile */
  clearProfile: () => void

  /** Ensure profile exists for current user */
  ensureProfile: () => UserProfile | null
}

/**
 * Hook to access and manage user profile
 */
export function useUserProfile(): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load initial profile
  useEffect(() => {
    const currentProfile = userProfileStore.get()
    setProfile(currentProfile)
    setIsLoaded(true)
  }, [])

  // Subscribe to changes
  useEffect(() => {
    const unsubscribe = userProfileStore.subscribe((event: ProfileChangeEvent) => {
      setProfile(event.current)
    })
    return unsubscribe
  }, [])

  const getUserId = useCallback((): string | null => {
    return authService.getUserId() || authService.getUserCode()
  }, [])

  const updateProfile = useCallback((update: UserProfileUpdate) => {
    const userId = getUserId()
    if (!userId) {
      console.warn('[useUserProfile] No user ID available, cannot update profile')
      return
    }
    userProfileStore.set(userId, update)
  }, [getUserId])

  const setTrack = useCallback((track: Track) => {
    const userId = getUserId()
    if (!userId) {
      console.warn('[useUserProfile] No user ID available, cannot set track')
      return
    }
    userProfileStore.setTrack(userId, track)
  }, [getUserId])

  const clearProfile = useCallback(() => {
    userProfileStore.clear()
  }, [])

  const ensureProfile = useCallback((): UserProfile | null => {
    const userId = getUserId()
    if (!userId) {
      console.warn('[useUserProfile] No user ID available, cannot ensure profile')
      return null
    }
    return userProfileStore.ensureProfile(userId)
  }, [getUserId])

  return {
    profile,
    track: profile?.track ?? 'foundation2',
    isLoaded,
    updateProfile,
    setTrack,
    clearProfile,
    ensureProfile,
  }
}
