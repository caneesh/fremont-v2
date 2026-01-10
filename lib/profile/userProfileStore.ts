/**
 * User Profile Store
 *
 * Manages user profile data in localStorage with subscription support.
 * Provides persistence for user's selected track/level.
 */

import type { Track } from '@prisma/client'
import type { UserProfile, UserProfileUpdate, ProfileChangeEvent } from './types'

const STORAGE_KEY = 'physiscaffold_user_profile'
const DEFAULT_TRACK: Track = 'foundation2' // Sensible default for new users

type Subscriber = (event: ProfileChangeEvent) => void

class UserProfileStore {
  private subscribers: Set<Subscriber> = new Set()
  private cachedProfile: UserProfile | null = null

  /**
   * Get the current user profile
   */
  get(): UserProfile | null {
    if (typeof window === 'undefined') return null

    // Return cached if available
    if (this.cachedProfile) return this.cachedProfile

    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null

      const profile = JSON.parse(raw) as UserProfile
      this.cachedProfile = profile
      return profile
    } catch {
      console.error('[UserProfileStore] Failed to parse profile from localStorage')
      return null
    }
  }

  /**
   * Get the current track, or default if no profile exists
   */
  getTrack(): Track {
    const profile = this.get()
    return profile?.track ?? DEFAULT_TRACK
  }

  /**
   * Create or update the user profile
   */
  set(userId: string, update: UserProfileUpdate): UserProfile {
    if (typeof window === 'undefined') {
      throw new Error('Cannot set profile in server context')
    }

    const previous = this.get()
    const now = new Date().toISOString()

    const newProfile: UserProfile = {
      userId,
      track: update.track ?? previous?.track ?? DEFAULT_TRACK,
      displayName: update.displayName ?? previous?.displayName,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    }

    // Determine changed fields
    const changedFields: (keyof UserProfile)[] = []
    if (previous) {
      if (previous.track !== newProfile.track) changedFields.push('track')
      if (previous.displayName !== newProfile.displayName) changedFields.push('displayName')
    } else {
      changedFields.push('track', 'userId', 'createdAt')
    }

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile))
    this.cachedProfile = newProfile

    // Notify subscribers
    this.notify({ previous, current: newProfile, changedFields })

    return newProfile
  }

  /**
   * Update just the track
   */
  setTrack(userId: string, track: Track): UserProfile {
    return this.set(userId, { track })
  }

  /**
   * Clear the user profile (logout)
   */
  clear(): void {
    if (typeof window === 'undefined') return

    const previous = this.get()
    localStorage.removeItem(STORAGE_KEY)
    this.cachedProfile = null

    if (previous) {
      this.notify({
        previous,
        current: null,
        changedFields: ['track', 'userId', 'displayName', 'createdAt', 'updatedAt'],
      })
    }
  }

  /**
   * Subscribe to profile changes
   * Returns unsubscribe function
   */
  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback)
    return () => {
      this.subscribers.delete(callback)
    }
  }

  /**
   * Check if profile exists
   */
  hasProfile(): boolean {
    return this.get() !== null
  }

  /**
   * Initialize profile if not exists (for new users)
   */
  ensureProfile(userId: string): UserProfile {
    const existing = this.get()
    if (existing && existing.userId === userId) {
      return existing
    }

    // Create new profile with default track
    return this.set(userId, { track: DEFAULT_TRACK })
  }

  private notify(event: ProfileChangeEvent): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(event)
      } catch (error) {
        console.error('[UserProfileStore] Subscriber error:', error)
      }
    }
  }
}

// Singleton instance
export const userProfileStore = new UserProfileStore()

// Re-export types
export type { UserProfile, UserProfileUpdate, ProfileChangeEvent }
