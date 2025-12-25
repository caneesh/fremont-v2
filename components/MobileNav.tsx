'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const navItems = [
    {
      name: 'Network',
      path: '/concept-network',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
      color: 'purple'
    },
    {
      name: 'Study Path',
      path: '/study-path',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: 'blue'
    },
    {
      name: 'Spot Mistake',
      path: '/spot-mistake',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: 'orange'
    },
    {
      name: 'History',
      path: '/history',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'gray'
    },
    {
      name: 'Error Patterns',
      path: '/error-patterns',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'red'
    },
  ]

  const handleNavigate = (path: string) => {
    router.push(path)
    setIsOpen(false)
  }

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 right-4 z-50 p-3 bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-md border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card-soft active:scale-95 transition-all"
        aria-label="Toggle menu"
      >
        <svg
          className="w-6 h-6 text-gray-700 dark:text-dark-text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 dark:bg-black/70 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Panel */}
          <div className="md:hidden fixed top-0 right-0 h-full w-64 bg-white dark:bg-dark-card shadow-2xl dark:shadow-dark-lg border-l border-transparent dark:border-dark-border z-40 transform transition-transform duration-300 ease-in-out">
            <div className="p-6 pt-20">
              <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary mb-6">Navigation</h2>
              <nav className="space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className={`w-full flex items-center gap-3 p-4 rounded-lg text-left transition-colors ${
                      item.color === 'purple'
                        ? 'hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-700 dark:text-purple-400'
                        : item.color === 'blue'
                        ? 'hover:bg-blue-50 dark:hover:bg-accent/10 text-blue-700 dark:text-accent'
                        : item.color === 'orange'
                        ? 'hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                        : item.color === 'red'
                        ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-700 dark:text-red-400'
                        : 'hover:bg-gray-50 dark:hover:bg-dark-card-soft text-gray-700 dark:text-dark-text-secondary'
                    }`}
                  >
                    {item.icon}
                    <span className="font-medium">{item.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </>
      )}
    </>
  )
}
