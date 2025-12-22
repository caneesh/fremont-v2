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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8">
            {/* Logo/Header */}
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                PhysiScaffold
              </h1>
              <p className="text-base sm:text-lg text-gray-600 italic">
                The Socratic Physics Engine
              </p>
              <div className="mt-4 inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                Pilot Access
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Access Code
                </label>
                <input
                  id="accessCode"
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="PILOT-ALPHA-XXX"
                  className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase text-base"
                  autoComplete="off"
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:scale-98 transition-all min-h-[48px] text-base"
              >
                Access PhysiScaffold
              </button>
            </form>

            {/* Info */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <p className="text-xs sm:text-sm text-gray-600 text-center">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Welcome, {user?.name}!
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                You are part of the PhysiScaffold pilot program
              </p>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 sm:p-6 mb-6">
              <h3 className="text-base sm:text-lg font-bold text-blue-900 mb-3">
                Your Daily Limits
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs sm:text-sm text-gray-600">Problems</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{remaining.problems}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs sm:text-sm text-gray-600">Hints</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{remaining.hints}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs sm:text-sm text-gray-600">Prerequisites</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{remaining.prerequisites}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs sm:text-sm text-gray-600">Reflections</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{remaining.reflections}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6 text-xs sm:text-sm text-gray-700">
              <p className="font-semibold">How to use PhysiScaffold:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Enter any IIT-JEE Physics problem to get started</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Use progressive hints (5 levels) to build your understanding</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Complete reflections to deepen your learning</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Limits reset daily at midnight</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => setShowWelcome(false)}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:scale-98 transition-all min-h-[48px] text-base"
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
          className="px-3 py-2 sm:px-4 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:scale-95 flex items-center gap-2 text-sm shadow-md transition-transform min-h-[44px]"
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
