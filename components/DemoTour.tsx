'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface TourStep {
  target: string // CSS selector
  title: string
  content: string
  position: 'top' | 'bottom' | 'left' | 'right'
  action?: () => void
  waitFor?: string // Wait for this element to appear
}

interface DemoTourProps {
  isActive: boolean
  onEnd: () => void
  onStartDemo: () => void
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '.demo-step-input',
    title: 'Enter Your Problem',
    content: 'Type or paste any physics problem here. You can also use voice input or upload a diagram.',
    position: 'bottom',
  },
  {
    target: '.demo-step-samples',
    title: 'Sample Problems',
    content: 'Try these curated IIT-JEE level problems to see how PhysiScaffold works.',
    position: 'top',
  },
  {
    target: '.demo-step-submit',
    title: 'Generate Scaffold',
    content: 'Click here to generate your step-by-step solution framework. Our AI analyzes the problem and creates a learning scaffold.',
    position: 'top',
  },
]

const SCAFFOLD_TOUR_STEPS: TourStep[] = [
  {
    target: '.demo-step-concepts',
    title: 'Key Concepts',
    content: 'These are the physics concepts needed to solve this problem. Review them to strengthen your understanding.',
    position: 'left',
    waitFor: '.demo-step-concepts',
  },
  {
    target: '.demo-step-steps',
    title: 'Solution Steps',
    content: 'Work through each step progressively. Expand steps when ready - we guide you without giving away the answer.',
    position: 'right',
    waitFor: '.demo-step-steps',
  },
  {
    target: '.demo-step-sanity',
    title: 'Sanity Check',
    content: 'Verify your answer makes physical sense. Check units, limiting cases, and reasonableness.',
    position: 'top',
    waitFor: '.demo-step-sanity',
  },
]

export default function DemoTour({ isActive, onEnd, onStartDemo }: DemoTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const [highlightPosition, setHighlightPosition] = useState({ top: 0, left: 0, width: 0, height: 0 })
  const [isVisible, setIsVisible] = useState(false)
  const [phase, setPhase] = useState<'input' | 'scaffold'>('input')
  const [mounted, setMounted] = useState(false)

  const steps = phase === 'input' ? TOUR_STEPS : SCAFFOLD_TOUR_STEPS

  useEffect(() => {
    setMounted(true)
  }, [])

  const updatePosition = useCallback(() => {
    if (!isActive) return

    const step = steps[currentStep]
    if (!step) return

    const element = document.querySelector(step.target)
    if (!element) {
      // If element not found and we have a waitFor, keep checking
      if (step.waitFor) {
        const timer = setTimeout(updatePosition, 100)
        return () => clearTimeout(timer)
      }
      return
    }

    const rect = element.getBoundingClientRect()
    const padding = 8

    setHighlightPosition({
      top: rect.top - padding + window.scrollY,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    })

    // Calculate tooltip position
    const tooltipWidth = 320
    const tooltipHeight = 150
    let top = 0
    let left = 0

    switch (step.position) {
      case 'bottom':
        top = rect.bottom + 16 + window.scrollY
        left = rect.left + rect.width / 2 - tooltipWidth / 2
        break
      case 'top':
        top = rect.top - tooltipHeight - 16 + window.scrollY
        left = rect.left + rect.width / 2 - tooltipWidth / 2
        break
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2 + window.scrollY
        left = rect.left - tooltipWidth - 16
        break
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2 + window.scrollY
        left = rect.right + 16
        break
    }

    // Keep tooltip in viewport
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16))
    top = Math.max(16, top)

    setTooltipPosition({ top, left })
    setIsVisible(true)
  }, [isActive, currentStep, steps])

  useEffect(() => {
    if (isActive) {
      setCurrentStep(0)
      setPhase('input')
      updatePosition()
    } else {
      setIsVisible(false)
    }
  }, [isActive, updatePosition])

  useEffect(() => {
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [updatePosition])

  // Watch for scaffold to appear
  useEffect(() => {
    if (!isActive || phase !== 'scaffold') return

    const observer = new MutationObserver(() => {
      updatePosition()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [isActive, phase, updatePosition])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else if (phase === 'input') {
      // Transition to scaffold phase
      onStartDemo()
      setPhase('scaffold')
      setCurrentStep(0)
      setIsVisible(false)
      // Wait for scaffold to load
      setTimeout(() => {
        updatePosition()
      }, 2000)
    } else {
      onEnd()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    onEnd()
  }

  if (!mounted || !isActive || !isVisible) return null

  const step = steps[currentStep]
  if (!step) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Overlay with cutout */}
      <div className="absolute inset-0 pointer-events-auto">
        <svg className="w-full h-full" style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <mask id="demo-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={highlightPosition.left}
                y={highlightPosition.top}
                width={highlightPosition.width}
                height={highlightPosition.height}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.7)"
            mask="url(#demo-mask)"
          />
        </svg>

        {/* Highlight border */}
        <div
          className="absolute border-2 border-blue-500 rounded-lg pointer-events-none"
          style={{
            top: highlightPosition.top,
            left: highlightPosition.left,
            width: highlightPosition.width,
            height: highlightPosition.height,
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.4)',
          }}
        />
      </div>

      {/* Tooltip */}
      <div
        className="absolute w-80 bg-white dark:bg-dark-card rounded-xl shadow-2xl dark:shadow-dark-xl pointer-events-auto border border-gray-200 dark:border-dark-border"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        {/* Progress indicator */}
        <div className="flex gap-1 p-3 border-b border-gray-100 dark:border-dark-border">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 flex-1 rounded-full transition-colors ${
                idx <= currentStep ? 'bg-blue-500' : 'bg-gray-200 dark:bg-dark-border'
              }`}
            />
          ))}
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full">
              {currentStep + 1}
            </span>
            <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">
              {step.title}
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
            {step.content}
          </p>

          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 dark:text-dark-text-muted hover:text-gray-700 dark:hover:text-dark-text-secondary transition-colors"
            >
              Skip tour
            </button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card-soft transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                {currentStep === steps.length - 1 && phase === 'scaffold' ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>

        {/* Phase indicator */}
        {phase === 'scaffold' && (
          <div className="px-4 pb-3">
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Exploring the Solution Scaffold
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
