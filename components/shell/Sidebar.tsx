'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface NavItem {
  name: string
  path: string
  icon: React.ReactNode
  color?: string
}

interface SidebarProps {
  currentPath: string
  collapsed?: boolean
  userName?: string
  onLogout: () => void
}

const mainNavItems: NavItem[] = [
  {
    name: 'Dashboard',
    path: '/study-path',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    name: 'Solve',
    path: '/solve',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    name: 'Review',
    path: '/mistake-notebook',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    name: 'History',
    path: '/history',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

const secondaryNavItems: NavItem[] = [
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
]

export default function Sidebar({ currentPath, collapsed = false, userName, onLogout }: SidebarProps) {
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

  const getItemClasses = (item: NavItem, active: boolean) => {
    const baseClasses = 'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all'

    if (active) {
      return `${baseClasses} bg-accent/10 text-accent font-medium`
    }

    if (item.color === 'purple') {
      return `${baseClasses} text-gray-600 dark:text-dark-text-secondary hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400`
    }
    if (item.color === 'green') {
      return `${baseClasses} text-gray-600 dark:text-dark-text-secondary hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400`
    }
    if (item.color === 'orange') {
      return `${baseClasses} text-gray-600 dark:text-dark-text-secondary hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400`
    }
    if (item.color === 'red') {
      return `${baseClasses} text-gray-600 dark:text-dark-text-secondary hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400`
    }

    return `${baseClasses} text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-card-soft hover:text-gray-900 dark:hover:text-dark-text-primary`
  }

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-white dark:bg-dark-card border-r border-gray-200 dark:border-dark-border flex flex-col transition-all duration-300 z-40 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className={`p-4 border-b border-gray-200 dark:border-dark-border ${collapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={() => router.push('/study-path')}
          className="hover:opacity-80 transition-opacity"
        >
          {collapsed ? (
            <Image
              src="/favicon.png"
              alt="PhysiScaffold"
              width={32}
              height={32}
              className="dark:brightness-110"
            />
          ) : (
            <Image
              src="/logo.png"
              alt="PhysiScaffold"
              width={180}
              height={36}
              className="h-8 w-auto dark:brightness-110 dark:contrast-90"
            />
          )}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="space-y-1">
          {mainNavItems.map((item) => {
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`w-full ${getItemClasses(item, active)} ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? item.name : undefined}
              >
                {item.icon}
                {!collapsed && <span>{item.name}</span>}
              </button>
            )
          })}
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-gray-200 dark:border-dark-border" />

        {/* Secondary Navigation */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-dark-text-muted uppercase tracking-wider">
              Tools
            </p>
          )}
          {secondaryNavItems.map((item) => {
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`w-full ${getItemClasses(item, active)} ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? item.name : undefined}
              >
                {item.icon}
                {!collapsed && <span>{item.name}</span>}
              </button>
            )
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className={`p-3 border-t border-gray-200 dark:border-dark-border ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        {!collapsed && userName && (
          <div className="flex items-center gap-2 px-3 py-2 mb-2">
            <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
              <span className="text-accent font-semibold text-sm">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary truncate">
              {userName}
            </span>
          </div>
        )}
        <button
          onClick={onLogout}
          className={`flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-card-soft rounded-lg transition-colors w-full ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? 'Logout' : undefined}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
