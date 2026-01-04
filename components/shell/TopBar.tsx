'use client'

import { usePathname } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'

interface TopBarProps {
  userName?: string
  onLogout: () => void
  showBreadcrumb?: boolean
}

// Map paths to readable names
const pathNames: Record<string, string> = {
  '/study-path': 'Dashboard',
  '/solve': 'Solve',
  '/history': 'History',
  '/mistake-notebook': 'Review',
  '/concept-network': 'Concept Network',
  '/pattern-track': 'Pattern Track',
  '/spot-mistake': 'Spot Mistake',
  '/error-patterns': 'Error Patterns',
  '/drills': 'Drills',
}

export default function TopBar({ showBreadcrumb = true }: TopBarProps) {
  const pathname = usePathname()

  // Generate breadcrumb from path
  const getBreadcrumb = () => {
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length === 0) return null

    const items: { label: string; path: string }[] = []
    let currentPath = ''

    for (const segment of segments) {
      currentPath += '/' + segment
      const label = pathNames[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
      items.push({ label, path: currentPath })
    }

    return items
  }

  const breadcrumb = getBreadcrumb()

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-dark-card/80 backdrop-blur-md border-b border-gray-200 dark:border-dark-border">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          {showBreadcrumb && breadcrumb && breadcrumb.length > 0 && (
            <nav className="flex items-center gap-1 text-gray-500 dark:text-dark-text-muted">
              {breadcrumb.map((item, index) => (
                <span key={item.path} className="flex items-center gap-1">
                  {index > 0 && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  <span className={index === breadcrumb.length - 1 ? 'text-gray-900 dark:text-dark-text-primary font-medium' : ''}>
                    {item.label}
                  </span>
                </span>
              ))}
            </nav>
          )}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {/* Help Link */}
          <a
            href="https://github.com/caneesh/fremont-v2/blob/main/docs/PILOT_USER_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-500 dark:text-dark-text-muted hover:text-gray-700 dark:hover:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-card-soft rounded-lg transition-colors"
            title="User Guide"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </a>

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
