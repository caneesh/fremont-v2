'use client'

import { useState, useEffect } from 'react'
import { authService } from '@/lib/auth/authService'
import { quotaService } from '@/lib/auth/quotaService'
import { DEFAULT_QUOTA_LIMITS } from '@/types/auth'
import BottomNav from './BottomNav'

interface AuthGateProps {
  children: React.ReactNode
}

export default function AuthGate({ children }: AuthGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    // Check if already authenticated
    const session = authService.getSession()
    if (session) {
      setIsAuthenticated(true)
      // Clean old quotas on login
      quotaService.cleanOldQuotas()
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const session = authService.createSession(accessCode)
    if (!session) {
      setError('Invalid access code. Please check and try again.')
      return
    }

    setIsAuthenticated(true)
    setShowWelcome(true)
    quotaService.cleanOldQuotas()
  }

  const handleLogout = () => {
    authService.clearSession()
    setIsAuthenticated(false)
    setAccessCode('')
    setError(null)
    setShowWelcome(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-accent mb-4"></div>
          <p className="text-gray-600 dark:text-dark-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl dark:shadow-dark-lg p-6 sm:p-8 border border-transparent dark:border-dark-border">
            {/* Logo/Header */}
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
                PhysiScaffold
              </h1>
              <p className="text-base sm:text-lg text-gray-600 dark:text-dark-text-secondary italic">
                The Socratic Physics Engine
              </p>
              <div className="mt-4 inline-block px-4 py-2 bg-blue-100 dark:bg-accent/20 text-blue-800 dark:text-accent rounded-full text-sm font-semibold">
                Pilot Access
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Access Code
                </label>
                <input
                  id="accessCode"
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="PILOT-ALPHA-XXX"
                  className="w-full px-4 py-4 border-2 border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary placeholder:text-gray-400 dark:placeholder:text-dark-text-placeholder focus:ring-2 focus:ring-blue-500 dark:focus:ring-accent focus:border-transparent uppercase text-base"
                  autoComplete="off"
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-500/30 rounded-lg p-3">
                  <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full px-6 py-4 bg-blue-600 dark:bg-accent text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-accent-strong active:scale-98 transition-all min-h-[48px] text-base"
              >
                Access PhysiScaffold
              </button>
            </form>

            {/* Info */}
            <div className="mt-6 bg-gray-50 dark:bg-dark-card-soft rounded-lg p-4 border border-transparent dark:border-dark-border">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-muted text-center">
                This is a pilot program with limited access. If you received an access code, enter it above.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Welcome Modal
  if (showWelcome) {
    const user = authService.getUser()
    const remaining = quotaService.getRemainingQuota(user?.userId || '', DEFAULT_QUOTA_LIMITS)

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl dark:shadow-dark-lg p-6 sm:p-8 border border-transparent dark:border-dark-border">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
                Welcome, {user?.name}!
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-dark-text-secondary">
                You are part of the PhysiScaffold pilot program
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-accent/10 border-2 border-blue-200 dark:border-accent/30 rounded-lg p-4 sm:p-6 mb-6">
              <h3 className="text-base sm:text-lg font-bold text-blue-900 dark:text-accent mb-3">
                Your Daily Limits
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
                <div className="bg-white dark:bg-dark-card rounded-lg p-3 border border-transparent dark:border-dark-border">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-muted">Problems</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-accent">{remaining.problems}</p>
                </div>
                <div className="bg-white dark:bg-dark-card rounded-lg p-3 border border-transparent dark:border-dark-border">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-muted">Hints</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-accent">{remaining.hints}</p>
                </div>
                <div className="bg-white dark:bg-dark-card rounded-lg p-3 border border-transparent dark:border-dark-border">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-muted">Prerequisites</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-accent">{remaining.prerequisites}</p>
                </div>
                <div className="bg-white dark:bg-dark-card rounded-lg p-3 border border-transparent dark:border-dark-border">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-muted">Reflections</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-accent">{remaining.reflections}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6 text-xs sm:text-sm text-gray-700 dark:text-dark-text-secondary">
              <p className="font-semibold dark:text-dark-text-primary">How to use PhysiScaffold:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-accent mt-1">•</span>
                  <span>Enter any IIT-JEE Physics problem to get started</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-accent mt-1">•</span>
                  <span>Use progressive hints (5 levels) to build your understanding</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-accent mt-1">•</span>
                  <span>Complete reflections to deepen your learning</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-accent mt-1">•</span>
                  <span>Limits reset daily at midnight</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => setShowWelcome(false)}
              className="w-full px-6 py-4 bg-blue-600 dark:bg-accent text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-accent-strong active:scale-98 transition-all min-h-[48px] text-base"
            >
              Start Learning
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render children with logout option
  return (
    <div className="pb-16 md:pb-0">
      {/* Logout button - positioned to not interfere with mobile menu */}
      <div className="fixed top-4 left-4 z-40 md:right-4 md:left-auto">
        <button
          onClick={handleLogout}
          className="px-3 py-2 sm:px-4 bg-white dark:bg-dark-card border-2 border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card-soft active:scale-95 flex items-center gap-2 text-sm shadow-md dark:shadow-dark-md transition-transform min-h-[44px]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
      {children}
      <BottomNav />
    </div>
  )
}
