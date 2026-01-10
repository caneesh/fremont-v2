'use client'

/**
 * User Profile Settings Page
 *
 * Allows users to view and change their profile settings, including:
 * - Current level/track
 * - Display name
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MobileNav from '@/components/MobileNav'
import LevelSwitcher from '@/components/LevelSwitcher'
import { useUserProfile, getTrackInfo, getOrderedTracks } from '@/lib/profile'
import { authService } from '@/lib/auth/authService'

export default function ProfileSettingsPage() {
  const router = useRouter()
  const { profile, track, isLoaded, updateProfile, ensureProfile } = useUserProfile()
  const [showLevelSwitcher, setShowLevelSwitcher] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Ensure profile exists on mount
  useEffect(() => {
    if (isLoaded) {
      ensureProfile()
    }
  }, [isLoaded, ensureProfile])

  // Sync display name with profile
  useEffect(() => {
    if (profile?.displayName) {
      setDisplayName(profile.displayName)
    }
  }, [profile?.displayName])

  const handleSaveDisplayName = () => {
    if (!displayName.trim()) return

    setIsSaving(true)
    updateProfile({ displayName: displayName.trim() })

    setTimeout(() => {
      setIsSaving(false)
    }, 500)
  }

  const trackInfo = getTrackInfo(track)
  const user = authService.getUser()

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card">
        <MobileNav />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card">
      <MobileNav />

      <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
            Profile Settings
          </h1>
          <p className="text-gray-600 dark:text-dark-text-secondary mt-1">
            Manage your learning preferences
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg dark:shadow-dark-md border border-gray-200 dark:border-dark-border overflow-hidden">
          {/* User Info Section */}
          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent-strong flex items-center justify-center text-white text-2xl font-bold">
                {(profile?.displayName?.[0] || user?.name?.[0] || 'U').toUpperCase()}
              </div>

              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                  {profile?.displayName || user?.name || 'Student'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-dark-text-muted">
                  {user?.code || 'Guest'}
                </p>
              </div>
            </div>
          </div>

          {/* Level Section */}
          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-dark-text-primary">
                  Current Level
                </h3>
                <p className="text-sm text-gray-500 dark:text-dark-text-muted mt-0.5">
                  Problems will be filtered to match your level
                </p>
              </div>

              <button
                onClick={() => setShowLevelSwitcher(true)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg
                  ${trackInfo.bgColor} ${trackInfo.color}
                  font-medium
                  hover:opacity-90 active:scale-95
                  transition-all
                `}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {trackInfo.name}
                <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Track Progress Indicator */}
            <div className="mt-4 flex items-center gap-2">
              {getOrderedTracks().map((t, i) => (
                <div key={t.id} className="flex items-center">
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                      ${t.id === track
                        ? `${t.bgColor} ${t.color} ring-2 ring-current`
                        : t.order < trackInfo.order
                        ? 'bg-gray-200 dark:bg-dark-card-soft text-gray-500 dark:text-dark-text-muted'
                        : 'bg-gray-100 dark:bg-dark-card-soft text-gray-400 dark:text-dark-text-muted'
                      }
                    `}
                    title={t.name}
                  >
                    {t.shortName}
                  </div>
                  {i < getOrderedTracks().length - 1 && (
                    <div className={`
                      w-4 h-0.5
                      ${t.order < trackInfo.order
                        ? 'bg-gray-300 dark:bg-dark-border'
                        : 'bg-gray-200 dark:bg-dark-card-soft'
                      }
                    `} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Display Name Section */}
          <div className="p-6">
            <h3 className="font-medium text-gray-900 dark:text-dark-text-primary mb-1">
              Display Name
            </h3>
            <p className="text-sm text-gray-500 dark:text-dark-text-muted mb-3">
              How you want to be addressed
            </p>

            <div className="flex gap-3">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              <button
                onClick={handleSaveDisplayName}
                disabled={isSaving || !displayName.trim()}
                className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-500/30">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-300">
                About Levels
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                Your level determines the difficulty of problems shown to you.
                You can change it anytime, and your progress is preserved across all levels.
              </p>
            </div>
          </div>
        </div>

        {/* Profile Data (Debug Info) */}
        {profile && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-dark-card-soft rounded-lg text-xs font-mono text-gray-500 dark:text-dark-text-muted">
            <p>Profile ID: {profile.userId}</p>
            <p>Created: {new Date(profile.createdAt).toLocaleDateString()}</p>
            <p>Updated: {new Date(profile.updatedAt).toLocaleDateString()}</p>
          </div>
        )}
      </div>

      {/* Level Switcher Modal */}
      <LevelSwitcher
        isOpen={showLevelSwitcher}
        onClose={() => setShowLevelSwitcher(false)}
      />
    </div>
  )
}
