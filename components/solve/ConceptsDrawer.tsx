'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Concept } from '@/types/scaffold'
import MathRenderer from '../MathRenderer'
import { getDrawerState, setDrawerState } from '@/lib/solveUIConfig'

interface ConceptsDrawerProps {
  concepts: Concept[]
  /** Optional callback when drawer state changes */
  onToggle?: (isOpen: boolean) => void
  /** Force open/close from parent (useful for completion actions) */
  forceOpen?: boolean
}

/**
 * ConceptsDrawer - Collapsible concept inventory drawer
 *
 * Replaces the always-visible ConceptPanel with a progressive disclosure pattern:
 * - Collapsed state: Small "Concepts (N)" button
 * - Expanded state: Full concept inventory as overlay/slide-over
 * - State persisted in localStorage
 */
export default function ConceptsDrawer({ concepts, onToggle, forceOpen }: ConceptsDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedConcept, setExpandedConcept] = useState<string | null>(null)

  // Load persisted state on mount
  useEffect(() => {
    const savedState = getDrawerState()
    setIsOpen(savedState)
  }, [])

  // Handle forceOpen prop
  useEffect(() => {
    if (forceOpen !== undefined) {
      setIsOpen(forceOpen)
    }
  }, [forceOpen])

  const handleToggle = useCallback(() => {
    const newState = !isOpen
    setIsOpen(newState)
    setDrawerState(newState)
    onToggle?.(newState)
  }, [isOpen, onToggle])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setDrawerState(false)
    onToggle?.(false)
  }, [onToggle])

  const toggleConcept = (conceptId: string) => {
    setExpandedConcept(expandedConcept === conceptId ? null : conceptId)
  }

  return (
    <>
      {/* Collapsed Button - Always visible */}
      <button
        onClick={handleToggle}
        className={`
          fixed right-4 top-1/2 -translate-y-1/2 z-40
          flex items-center gap-2 px-3 py-3
          bg-white dark:bg-dark-card
          border border-gray-200 dark:border-dark-border
          rounded-l-lg shadow-lg dark:shadow-dark-lg
          hover:bg-gray-50 dark:hover:bg-dark-card-soft
          transition-all duration-200
          ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        `}
        data-testid="concepts-drawer-toggle"
        aria-expanded={isOpen}
        aria-label={`${isOpen ? 'Close' : 'Open'} concepts drawer`}
      >
        <svg
          className="w-5 h-5 text-primary-600 dark:text-accent"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        <span className="text-sm font-medium text-gray-700 dark:text-dark-text-primary whitespace-nowrap">
          Concepts ({concepts.length})
        </span>
        <svg
          className="w-4 h-4 text-gray-400 dark:text-dark-text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 transition-opacity"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer Panel */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full max-w-md z-50
          bg-white dark:bg-dark-card
          shadow-2xl dark:shadow-dark-xl
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        data-testid="concepts-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Concept Inventory"
      >
        {/* Drawer Header */}
        <div className="sticky top-0 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary flex items-center gap-2">
            <svg
              className="w-6 h-6 text-primary-600 dark:text-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            Concept Inventory
          </h3>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
            aria-label="Close concepts drawer"
          >
            <svg
              className="w-5 h-5 text-gray-500 dark:text-dark-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-6 overflow-y-auto h-[calc(100%-73px)]">
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
            Click any concept to see its definition and relevant formulas.
          </p>

          <div className="space-y-2">
            {concepts.map((concept) => (
              <div
                key={concept.id}
                className="border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden hover:border-primary-400 dark:hover:border-accent transition-colors"
              >
                <button
                  onClick={() => toggleConcept(concept.id)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left bg-gray-50 dark:bg-dark-card-soft hover:bg-gray-100 dark:hover:bg-dark-border"
                >
                  <span className="font-medium text-gray-900 dark:text-dark-text-primary">
                    {concept.name}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-600 dark:text-dark-text-muted transition-transform ${
                      expandedConcept === concept.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedConcept === concept.id && (
                  <div className="px-4 py-3 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-600">
                    <div className="text-sm text-gray-700 dark:text-slate-200 mb-3">
                      <MathRenderer text={concept.definition} />
                    </div>

                    {concept.formula && (
                      <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-100 dark:border-blue-700">
                        <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-2">
                          Formula:
                        </p>
                        <div className="text-gray-900 dark:text-slate-100">
                          <MathRenderer text={concept.formula} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
