'use client'

import { useRouter, usePathname } from 'next/navigation'

interface NavItem {
  name: string
  path: string
  icon: React.ReactNode
  external?: boolean
}

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()

  const navItems: NavItem[] = [
    {
      name: 'Home',
      path: '/',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Network',
      path: '/concept-network',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
    },
    {
      name: 'Study',
      path: '/study-path',
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
    {
      name: 'Guide',
      path: 'https://github.com/caneesh/fremont-v2/blob/main/docs/PILOT_USER_GUIDE.md',
      external: true,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(path)
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-card border-t-2 border-gray-200 dark:border-dark-border shadow-lg dark:shadow-dark-lg z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const active = !item.external && isActive(item.path)
          const handleClick = () => {
            if (item.external) {
              window.open(item.path, '_blank', 'noopener,noreferrer')
            } else {
              router.push(item.path)
            }
          }
          return (
            <button
              key={item.path}
              onClick={handleClick}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors active:scale-95 ${
                active
                  ? 'text-blue-600 dark:text-accent bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-dark-text-secondary hover:text-blue-600 dark:hover:text-accent hover:bg-gray-50 dark:hover:bg-dark-card-soft'
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
      </div>
    </nav>
  )
}
