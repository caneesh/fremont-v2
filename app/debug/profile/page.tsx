'use client'

/**
 * Profile Debug Inspector (Dev-Only)
 *
 * Shows:
 * - Current profile data from localStorage
 * - Track selection with immediate update
 * - Raw localStorage data view
 * - Clear profile button
 */

import { useState, useEffect, useCallback } from 'react'
import { useUserProfile, getOrderedTracks, TRACK_INFO } from '@/lib/profile'
import type { Track } from '@prisma/client'
import { authService } from '@/lib/auth/authService'

export default function ProfileDebugPage() {
  const { profile, track, isLoaded, setTrack, clearProfile, ensureProfile } = useUserProfile()
  const [rawData, setRawData] = useState<string | null>(null)
  const [actionLog, setActionLog] = useState<string[]>([])

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setActionLog(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 20))
  }, [])

  const refreshRawData = useCallback(() => {
    const raw = localStorage.getItem('physiscaffold_user_profile')
    setRawData(raw)
    addLog('Refreshed raw data from localStorage')
  }, [addLog])

  useEffect(() => {
    refreshRawData()
  }, [refreshRawData, profile])

  const handleTrackChange = (newTrack: Track) => {
    setTrack(newTrack)
    addLog(`Changed track to: ${TRACK_INFO[newTrack].name}`)
  }

  const handleClearProfile = () => {
    clearProfile()
    addLog('Cleared profile from localStorage')
  }

  const handleEnsureProfile = () => {
    const result = ensureProfile()
    if (result) {
      addLog(`Ensured profile exists: ${result.userId}`)
    } else {
      addLog('Failed to ensure profile (no user ID)')
    }
  }

  // Dev-only guard
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
            Debug Page Not Available
          </h1>
          <p className="text-gray-600 dark:text-dark-text-secondary">
            This page is only available in development mode.
          </p>
        </div>
      </div>
    )
  }

  const user = authService.getUser()
  const session = authService.getSession()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
              Profile Debug Inspector
            </h1>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
              Development-only view of user profile data
            </p>
          </div>
          <button
            onClick={refreshRawData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Refresh Data
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Current Profile */}
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border">
                <h2 className="font-semibold text-gray-900 dark:text-dark-text-primary">
                  Current Profile
                </h2>
              </div>
              <div className="p-4 space-y-3">
                {!isLoaded ? (
                  <div className="text-gray-500 dark:text-dark-text-muted">Loading...</div>
                ) : profile ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-dark-text-secondary">User ID:</span>
                      <span className="font-mono text-gray-900 dark:text-dark-text-primary">{profile.userId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-dark-text-secondary">Track:</span>
                      <span className={`font-medium ${TRACK_INFO[profile.track].color}`}>
                        {TRACK_INFO[profile.track].name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-dark-text-secondary">Display Name:</span>
                      <span className="text-gray-900 dark:text-dark-text-primary">{profile.displayName || '(not set)'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-dark-text-secondary">Created:</span>
                      <span className="text-gray-900 dark:text-dark-text-primary">{new Date(profile.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-dark-text-secondary">Updated:</span>
                      <span className="text-gray-900 dark:text-dark-text-primary">{new Date(profile.updatedAt).toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-amber-600 dark:text-amber-400">
                    No profile found in localStorage
                  </div>
                )}
              </div>
            </div>

            {/* Auth Session */}
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border">
                <h2 className="font-semibold text-gray-900 dark:text-dark-text-primary">
                  Auth Session
                </h2>
              </div>
              <div className="p-4 space-y-3">
                {session ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-dark-text-secondary">User ID:</span>
                      <span className="font-mono text-gray-900 dark:text-dark-text-primary">{session.userId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-dark-text-secondary">Code:</span>
                      <span className="font-mono text-gray-900 dark:text-dark-text-primary">{session.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-dark-text-secondary">Name:</span>
                      <span className="text-gray-900 dark:text-dark-text-primary">{user?.name || '(unknown)'}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-amber-600 dark:text-amber-400">
                    No auth session found
                  </div>
                )}
              </div>
            </div>

            {/* Track Selector */}
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border">
                <h2 className="font-semibold text-gray-900 dark:text-dark-text-primary">
                  Change Track
                </h2>
              </div>
              <div className="p-4 space-y-2">
                {getOrderedTracks().map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTrackChange(t.id)}
                    className={`
                      w-full p-3 rounded-lg text-left transition-all
                      ${track === t.id
                        ? `${t.bgColor} ${t.color} border-2 border-current`
                        : 'bg-gray-50 dark:bg-dark-card-soft hover:bg-gray-100 dark:hover:bg-dark-border border-2 border-transparent'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{t.name}</span>
                      {track === t.id && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border">
                <h2 className="font-semibold text-gray-900 dark:text-dark-text-primary">
                  Actions
                </h2>
              </div>
              <div className="p-4 flex flex-wrap gap-3">
                <button
                  onClick={handleEnsureProfile}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Ensure Profile
                </button>
                <button
                  onClick={handleClearProfile}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Clear Profile
                </button>
                <button
                  onClick={refreshRawData}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Refresh Data
                </button>
              </div>
            </div>

            {/* Raw localStorage Data */}
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border">
                <h2 className="font-semibold text-gray-900 dark:text-dark-text-primary">
                  Raw localStorage Data
                </h2>
                <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-0.5">
                  physiscaffold_user_profile
                </p>
              </div>
              <div className="p-4">
                <pre className="p-3 bg-gray-900 dark:bg-gray-950 text-green-400 rounded overflow-x-auto text-xs leading-relaxed max-h-48 overflow-y-auto">
                  {rawData ? JSON.stringify(JSON.parse(rawData), null, 2) : '(empty)'}
                </pre>
              </div>
            </div>

            {/* Action Log */}
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-dark-text-primary">
                  Action Log
                </h2>
                <button
                  onClick={() => setActionLog([])}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-dark-text-muted dark:hover:text-dark-text-secondary"
                >
                  Clear
                </button>
              </div>
              <div className="p-4 max-h-48 overflow-y-auto">
                {actionLog.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-dark-text-muted">No actions yet</p>
                ) : (
                  <div className="space-y-1">
                    {actionLog.map((log, i) => (
                      <p key={i} className="text-xs font-mono text-gray-600 dark:text-dark-text-secondary">
                        {log}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-500 dark:text-dark-text-muted">
          This page is only visible in development mode (NODE_ENV !== &apos;production&apos;)
        </div>
      </div>
    </div>
  )
}
