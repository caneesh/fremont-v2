import { useEffect, useRef, useCallback } from 'react'

/**
 * useAccessibleModal - Hook for making modals accessible
 *
 * Provides:
 * - Focus trap inside modal
 * - Escape key closes modal
 * - Returns focus to trigger element on close
 * - Prevents body scroll while open
 *
 * Usage:
 * ```tsx
 * const { modalRef, handleClose } = useAccessibleModal({
 *   isOpen,
 *   onClose,
 *   triggerRef, // optional - element that opened the modal
 * })
 *
 * return (
 *   <div ref={modalRef} role="dialog" aria-modal="true">
 *     ...
 *   </div>
 * )
 * ```
 */

interface UseAccessibleModalOptions {
  isOpen: boolean
  onClose: () => void
  /** Reference to the element that triggered the modal (for focus return) */
  triggerRef?: React.RefObject<HTMLElement>
  /** Whether Escape should close the modal (default: true) */
  closeOnEscape?: boolean
  /** Whether to trap focus inside the modal (default: true) */
  trapFocus?: boolean
  /** Whether to lock body scroll while open (default: true) */
  lockScroll?: boolean
}

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function useAccessibleModal({
  isOpen,
  onClose,
  triggerRef,
  closeOnEscape = true,
  trapFocus = true,
  lockScroll = true,
}: UseAccessibleModalOptions) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // Store the element that was focused before modal opened
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement
    }
  }, [isOpen])

  // Focus trap
  useEffect(() => {
    if (!isOpen || !trapFocus || !modalRef.current) return

    const modal = modalRef.current
    const focusableElements = modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus first element when modal opens
    if (firstElement) {
      firstElement.focus()
    }

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (!modal.contains(document.activeElement)) {
        // Focus escaped somehow, bring it back
        e.preventDefault()
        firstElement?.focus()
        return
      }

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement?.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement?.focus()
      }
    }

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isOpen, trapFocus])

  // Escape to close
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, closeOnEscape])

  // Return focus on close
  useEffect(() => {
    if (isOpen) return

    // Modal just closed - return focus
    const elementToFocus = triggerRef?.current || previousActiveElement.current
    if (elementToFocus && typeof elementToFocus.focus === 'function') {
      // Small delay to ensure DOM has updated
      requestAnimationFrame(() => {
        elementToFocus.focus()
      })
    }
  }, [isOpen, triggerRef])

  // Lock body scroll
  useEffect(() => {
    if (!lockScroll) return

    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      const originalPaddingRight = document.body.style.paddingRight

      // Calculate scrollbar width to prevent layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

      document.body.style.overflow = 'hidden'
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`
      }

      return () => {
        document.body.style.overflow = originalOverflow
        document.body.style.paddingRight = originalPaddingRight
      }
    }
  }, [isOpen, lockScroll])

  // Wrapped close handler that can be called by modal content
  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  return {
    modalRef,
    handleClose,
  }
}

/**
 * getFocusableElements - Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}
