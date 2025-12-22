import { useEffect, useRef } from 'react'

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

export function useSwipeGesture(handlers: SwipeHandlers, threshold = 50) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const touchEnd = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchEnd.current = null
      touchStart.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      touchEnd.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      }
    }

    const handleTouchEnd = () => {
      if (!touchStart.current || !touchEnd.current) return

      const deltaX = touchStart.current.x - touchEnd.current.x
      const deltaY = touchStart.current.y - touchEnd.current.y

      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY)

      if (isHorizontalSwipe) {
        if (Math.abs(deltaX) > threshold) {
          if (deltaX > 0 && handlers.onSwipeLeft) {
            handlers.onSwipeLeft()
          } else if (deltaX < 0 && handlers.onSwipeRight) {
            handlers.onSwipeRight()
          }
        }
      } else {
        if (Math.abs(deltaY) > threshold) {
          if (deltaY > 0 && handlers.onSwipeUp) {
            handlers.onSwipeUp()
          } else if (deltaY < 0 && handlers.onSwipeDown) {
            handlers.onSwipeDown()
          }
        }
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handlers, threshold])
}
