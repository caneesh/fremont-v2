'use client'

import { useRouter } from 'next/navigation'

interface NavItem {
  name: string
  path: string
  icon: React.ReactNode
}

interface BottomNavV2Props {
  currentPath: string
  onMoreClick: () => void
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    path: '/study-path',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    name: 'Solve',
    path: '/solve',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    name: 'Review',
    path: '/mistake-notebook',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    name: 'History',
    path: '/history',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

export default function BottomNavV2({ currentPath, onMoreClick }: BottomNavV2Props) {
  const router = useRouter()

  const isActive = (path: string) => {
    if (path === '/study-path') {
      return currentPath === '/study-path' || currentPath.startsWith('/study-path/')
    }
    if (path === '/solve') {
      return currentPath === '/solve' || currentPath === '/'
    }
    return currentPath === path || currentPath.startsWith(path + '/')
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-card border-t-2 border-gray-200 dark:border-dark-border shadow-lg dark:shadow-dark-lg z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors active:scale-95 ${
                active
                  ? 'text-accent bg-accent/5'
                  : 'text-gray-600 dark:text-dark-text-secondary hover:text-accent hover:bg-gray-50 dark:hover:bg-dark-card-soft'
              }`}
            >
              <div className={`${active ? 'scale-110' : ''} transition-transform`}>
                {item.icon}
              </div>
              <span className={`text-xs mt-1 font-medium ${active ? 'font-semibold' : ''}`}>
                {item.name}
              </span>
            </button>
          )
        })}

        {/* More Button */}
        <button
          onClick={onMoreClick}
          className="flex flex-col items-center justify-center flex-1 h-full transition-colors active:scale-95 text-gray-600 dark:text-dark-text-secondary hover:text-accent hover:bg-gray-50 dark:hover:bg-dark-card-soft"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
          <span className="text-xs mt-1 font-medium">More</span>
        </button>
      </div>
    </nav>
  )
}
