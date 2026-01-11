'use client'

/**
 * ShellSkeleton - Shows a skeleton layout during initial load/redirect
 *
 * This provides a consistent shell experience during page transitions,
 * eliminating the "spinner -> redirect -> spinner" pattern by showing
 * a skeleton that matches the target layout structure.
 */

interface ShellSkeletonProps {
  /** Type of skeleton to show - matches target page layout */
  variant?: 'dashboard' | 'solve' | 'generic'
}

export default function ShellSkeleton({ variant = 'dashboard' }: ShellSkeletonProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-app">
      {/* Desktop Layout Skeleton */}
      <div className="hidden md:flex">
        {/* Sidebar Skeleton */}
        <div className={`fixed left-0 top-0 h-full ${variant === 'solve' ? 'w-16' : 'w-64'} bg-white dark:bg-dark-card border-r border-gray-200 dark:border-dark-border transition-all duration-300`}>
          {/* Logo placeholder */}
          <div className="p-4 border-b border-gray-200 dark:border-dark-border">
            <div className="h-8 bg-gray-200 dark:bg-dark-card-soft rounded animate-pulse" />
          </div>
          {/* Nav items skeleton */}
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 bg-gray-100 dark:bg-dark-card-soft rounded-lg animate-pulse" />
            ))}
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className={`flex-1 ${variant === 'solve' ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
          {/* TopBar Skeleton */}
          <div className="h-14 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border flex items-center px-6">
            <div className="h-6 w-48 bg-gray-200 dark:bg-dark-card-soft rounded animate-pulse" />
            <div className="ml-auto flex gap-3">
              <div className="h-8 w-8 bg-gray-200 dark:bg-dark-card-soft rounded-full animate-pulse" />
              <div className="h-8 w-8 bg-gray-200 dark:bg-dark-card-soft rounded-full animate-pulse" />
            </div>
          </div>

          {/* Content Skeleton based on variant */}
          <div className="p-6">
            {variant === 'dashboard' && <DashboardSkeleton />}
            {variant === 'solve' && <SolveSkeleton />}
            {variant === 'generic' && <GenericSkeleton />}
          </div>
        </div>
      </div>

      {/* Mobile Layout Skeleton */}
      <div className="md:hidden flex flex-col min-h-screen">
        {/* TopBar Mobile */}
        <div className="h-14 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border flex items-center justify-center px-4">
          <div className="h-8 w-32 bg-gray-200 dark:bg-dark-card-soft rounded animate-pulse" />
        </div>

        {/* Content */}
        <div className="flex-1 p-4 pb-20">
          {variant === 'dashboard' && <DashboardSkeleton />}
          {variant === 'solve' && <SolveSkeleton />}
          {variant === 'generic' && <GenericSkeleton />}
        </div>

        {/* Bottom Nav Skeleton */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border flex items-center justify-around px-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="w-12 h-10 flex flex-col items-center gap-1">
              <div className="w-6 h-6 bg-gray-200 dark:bg-dark-card-soft rounded animate-pulse" />
              <div className="w-10 h-2 bg-gray-200 dark:bg-dark-card-soft rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 dark:bg-dark-card-soft rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-dark-card-soft rounded animate-pulse" />
        </div>
        <div className="h-10 w-24 bg-gray-200 dark:bg-dark-card-soft rounded-lg animate-pulse" />
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-white dark:bg-dark-card rounded-xl shadow-sm dark:shadow-dark-sm border border-gray-200 dark:border-dark-border p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-200 dark:bg-dark-card-soft rounded-lg animate-pulse" />
              <div className="h-5 w-24 bg-gray-200 dark:bg-dark-card-soft rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-100 dark:bg-dark-card-soft rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-gray-100 dark:bg-dark-card-soft rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SolveSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Problem Input Skeleton */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg dark:shadow-dark-lg p-6 border border-gray-200 dark:border-dark-border">
        <div className="h-7 w-56 bg-gray-200 dark:bg-dark-card-soft rounded animate-pulse mb-6" />
        <div className="space-y-4">
          <div className="h-32 bg-gray-100 dark:bg-dark-card-soft rounded-lg animate-pulse" />
          <div className="h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Sample Problems Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white dark:bg-dark-card rounded-lg border-2 border-gray-200 dark:border-dark-border p-4">
            <div className="h-5 w-32 bg-gray-200 dark:bg-dark-card-soft rounded animate-pulse mb-3" />
            <div className="space-y-2">
              <div className="h-3 w-full bg-gray-100 dark:bg-dark-card-soft rounded animate-pulse" />
              <div className="h-3 w-4/5 bg-gray-100 dark:bg-dark-card-soft rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GenericSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="h-8 w-48 bg-gray-200 dark:bg-dark-card-soft rounded animate-pulse" />
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm dark:shadow-dark-sm border border-gray-200 dark:border-dark-border p-6 space-y-4">
        <div className="h-4 w-full bg-gray-100 dark:bg-dark-card-soft rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-gray-100 dark:bg-dark-card-soft rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-gray-100 dark:bg-dark-card-soft rounded animate-pulse" />
      </div>
    </div>
  )
}
