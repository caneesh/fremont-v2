'use client'

interface PullToRefreshIndicatorProps {
  pullDistance: number
  isRefreshing: boolean
}

export default function PullToRefreshIndicator({ pullDistance, isRefreshing }: PullToRefreshIndicatorProps) {
  const opacity = Math.min(pullDistance / 60, 1)
  const rotation = (pullDistance / 120) * 360

  if (pullDistance === 0 && !isRefreshing) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 flex justify-center z-50 md:hidden"
      style={{
        transform: `translateY(${Math.min(pullDistance - 40, 40)}px)`,
        opacity: opacity,
        transition: pullDistance === 0 ? 'all 0.3s ease-out' : 'none',
      }}
    >
      <div className="bg-white rounded-full p-3 shadow-lg">
        <svg
          className={`w-6 h-6 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{
            transform: isRefreshing ? 'none' : `rotate(${rotation}deg)`,
          }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </div>
    </div>
  )
}
