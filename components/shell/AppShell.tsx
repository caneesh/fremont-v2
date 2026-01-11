'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import BottomNavV2 from './BottomNavV2'
import MoreMenu from './MoreMenu'

interface AppShellProps {
  children: React.ReactNode
  userName?: string
  onLogout: () => void
}

/**
 * AppShell - Unified layout shell for the entire application
 *
 * Desktop: Sidebar (left) + TopBar (top) + Content
 * Mobile: TopBar (minimal) + Content + BottomNav (4 items + More)
 */
export default function AppShell({ children, userName, onLogout }: AppShellProps) {
  const pathname = usePathname()
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)

  // Determine if sidebar should be collapsed (for solve page, we want more space)
  const isSolveMode = pathname === '/solve' || pathname === '/'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-app">
      {/* Desktop Layout */}
      <div className="hidden md:flex">
        {/* Sidebar - Desktop only */}
        <Sidebar
          currentPath={pathname}
          collapsed={isSolveMode}
          userName={userName}
          onLogout={onLogout}
        />

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col ${isSolveMode ? 'md:ml-16' : 'md:ml-64'} transition-all duration-300`}>
          <TopBar
            userName={userName}
            onLogout={onLogout}
            showBreadcrumb={!isSolveMode}
          />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col min-h-screen">
        <main className="flex-1 pb-16">
          {children}
        </main>

        {/* Bottom Navigation - Mobile only */}
        <BottomNavV2
          currentPath={pathname}
          onMoreClick={() => setIsMoreMenuOpen(true)}
        />

        {/* More Menu (Bottom Sheet) */}
        <MoreMenu
          isOpen={isMoreMenuOpen}
          onClose={() => setIsMoreMenuOpen(false)}
          userName={userName}
          onLogout={onLogout}
        />
      </div>
    </div>
  )
}
