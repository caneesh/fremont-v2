'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import ThemeToggle from '@/components/ThemeToggle'

interface NavItem {
  name: string
  path: string
  icon: React.ReactNode
  color?: string
  external?: boolean
}

interface MoreMenuProps {
  isOpen: boolean
  onClose: () => void
  userName?: string
  onLogout: () => void
}

const menuItems: NavItem[] = [
  {
    name: 'Concept Network',
    path: '/concept-network',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
    color: 'purple',
  },
  {
    name: 'Pattern Track',
    path: '/pattern-track',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    color: 'green',
  },
  {
    name: 'Spot Mistake',
    path: '/spot-mistake',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    color: 'orange',
  },
  {
    name: 'Error Patterns',
    path: '/error-patterns',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'red',
  },
  {
    name: 'User Guide',
    path: 'https://github.com/caneesh/fremont-v2/blob/main/docs/PILOT_USER_GUIDE.md',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    external: true,
  },
]

export default function MoreMenu({ isOpen, onClose, userName, onLogout }: MoreMenuProps) {
  const router = useRouter()

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleNavigate = (item: NavItem) => {
    if (item.external) {
      window.open(item.path, '_blank', 'noopener,noreferrer')
    } else {
      router.push(item.path)
    }
    onClose()
  }

  const getItemColorClasses = (color?: string) => {
    switch (color) {
      case 'purple':
        return 'text-purple-600 dark:text-purple-400'
      case 'green':
        return 'text-green-600 dark:text-green-400'
      case 'orange':
        return 'text-orange-600 dark:text-orange-400'
      case 'red':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-700 dark:text-dark-text-secondary'
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-card rounded-t-2xl shadow-2xl dark:shadow-dark-lg z-50 max-h-[80vh] overflow-y-auto animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 dark:bg-dark-border rounded-full" />
        </div>

        {/* User Section */}
        {userName && (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                <span className="text-accent font-semibold">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-dark-text-primary">{userName}</p>
                <p className="text-sm text-gray-500 dark:text-dark-text-muted">Pilot User</p>
              </div>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <div className="p-3">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigate(item)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card-soft transition-colors ${getItemColorClasses(item.color)}`}
              >
                {item.icon}
                <span className="font-medium">{item.name}</span>
                {item.external && (
                  <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="my-3 border-t border-gray-200 dark:border-dark-border" />

          {/* Theme Toggle Row */}
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-gray-700 dark:text-dark-text-secondary font-medium">Theme</span>
            <ThemeToggle />
          </div>

          {/* Logout */}
          <button
            onClick={() => {
              onLogout()
              onClose()
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors mt-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium">Logout</span>
          </button>
        </div>

        {/* Safe Area Padding for iPhone */}
        <div className="h-6" />
      </div>
    </>
  )
}
