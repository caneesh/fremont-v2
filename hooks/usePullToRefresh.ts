import { useState, useEffect, useRef } from 'react'

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const touchStart = useRef<number>(0)
  const isRefreshing = useRef(false)

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0 && !isRefreshing.current) {
        touchStart.current = e.touches[0].clientY
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY === 0 && touchStart.current > 0 && !isRefreshing.current) {
        const currentTouch = e.touches[0].clientY
        const distance = currentTouch - touchStart.current

        if (distance > 0) {
          setPullDistance(Math.min(distance, 120))
          setIsPulling(true)

          // Add some resistance
          if (distance > 60) {
            e.preventDefault()
          }
        }
      }
    }

    const handleTouchEnd = async () => {
      if (pullDistance > 60 && !isRefreshing.current) {
        isRefreshing.current = true
        try {
          await onRefresh()
        } finally {
          isRefreshing.current = false
          setIsPulling(false)
          setPullDistance(0)
        }
      } else {
        setIsPulling(false)
        setPullDistance(0)
      }
      touchStart.current = 0
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [pullDistance, onRefresh])

  return { isPulling, pullDistance, isRefreshing: isRefreshing.current }
}
