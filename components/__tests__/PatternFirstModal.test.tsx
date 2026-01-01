import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import PatternFirstModal from '../PatternFirstModal'
import type { PatternOption } from '@/types/patternFirst'

// Mock timers
vi.useFakeTimers()

describe('PatternFirstModal', () => {
  const mockPatterns: PatternOption[] = [
    {
      id: 'momentum',
      name: 'Conservation of Momentum',
      description: 'Collision and explosion problems',
      triggers: ['collision', 'explosion'],
    },
    {
      id: 'energy',
      name: 'Conservation of Energy',
      description: 'Height, speed, and work problems',
      triggers: ['height', 'speed'],
    },
    {
      id: 'kinematics',
      name: 'Kinematics',
      description: 'Motion with constant acceleration',
    },
    {
      id: 'forces',
      name: 'Newton\'s Laws',
      description: 'Force analysis and equilibrium',
    },
  ]

  const defaultProps = {
    patterns: mockPatterns,
    primaryPatternId: 'momentum',
    lockSeconds: 12,
    showCountdown: true,
    problemText: 'A 5 kg ball collides with a 3 kg ball...',
    onSelect: vi.fn(),
    onTimeout: vi.fn(),
    onSkip: vi.fn(),
    canDismiss: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  describe('rendering', () => {
    it('renders the modal with title', () => {
      render(<PatternFirstModal {...defaultProps} />)
      expect(screen.getByText('Identify the Pattern')).toBeInTheDocument()
    })

    it('renders all pattern options', () => {
      render(<PatternFirstModal {...defaultProps} />)
      expect(screen.getByText('Conservation of Momentum')).toBeInTheDocument()
      expect(screen.getByText('Conservation of Energy')).toBeInTheDocument()
      expect(screen.getByText('Kinematics')).toBeInTheDocument()
      expect(screen.getByText("Newton's Laws")).toBeInTheDocument()
    })

    it('renders pattern descriptions', () => {
      render(<PatternFirstModal {...defaultProps} />)
      expect(screen.getByText('Collision and explosion problems')).toBeInTheDocument()
      expect(screen.getByText('Height, speed, and work problems')).toBeInTheDocument()
    })

    it('renders pattern triggers as tags', () => {
      render(<PatternFirstModal {...defaultProps} />)
      expect(screen.getByText('collision')).toBeInTheDocument()
      expect(screen.getByText('explosion')).toBeInTheDocument()
    })

    it('shows countdown timer when showCountdown is true', () => {
      render(<PatternFirstModal {...defaultProps} />)
      expect(screen.getByText('12s')).toBeInTheDocument()
    })

    it('hides countdown timer when showCountdown is false', () => {
      render(<PatternFirstModal {...defaultProps} showCountdown={false} />)
      expect(screen.queryByText('Time:')).not.toBeInTheDocument()
    })

    it('renders problem statement in details element', () => {
      render(<PatternFirstModal {...defaultProps} />)
      expect(screen.getByText('View problem statement')).toBeInTheDocument()
    })
  })

  describe('pattern selection', () => {
    it('calls onSelect when a pattern is clicked', () => {
      render(<PatternFirstModal {...defaultProps} />)

      fireEvent.click(screen.getByText('Conservation of Momentum'))

      expect(defaultProps.onSelect).toHaveBeenCalledWith(
        'momentum',
        expect.any(Number),
        true // isCorrect since momentum is primary
      )
    })

    it('passes isCorrect=false when wrong pattern is selected', () => {
      render(<PatternFirstModal {...defaultProps} />)

      fireEvent.click(screen.getByText('Kinematics'))

      expect(defaultProps.onSelect).toHaveBeenCalledWith(
        'kinematics',
        expect.any(Number),
        false
      )
    })

    it('shows "Selected" badge after selection', () => {
      render(<PatternFirstModal {...defaultProps} />)

      fireEvent.click(screen.getByText('Conservation of Energy'))

      expect(screen.getByText('Selected')).toBeInTheDocument()
    })

    it('disables pattern buttons after selection', () => {
      render(<PatternFirstModal {...defaultProps} />)

      fireEvent.click(screen.getByText('Conservation of Momentum'))

      // Try to click another pattern
      fireEvent.click(screen.getByText('Kinematics'))

      // onSelect should only be called once
      expect(defaultProps.onSelect).toHaveBeenCalledTimes(1)
    })
  })

  describe('countdown timer', () => {
    it('decrements timer every 100ms', () => {
      render(<PatternFirstModal {...defaultProps} />)

      expect(screen.getByText('12s')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByText('11s')).toBeInTheDocument()
    })

    it('calls onTimeout when timer reaches zero', () => {
      render(<PatternFirstModal {...defaultProps} />)

      act(() => {
        vi.advanceTimersByTime(12000)
      })

      expect(defaultProps.onTimeout).toHaveBeenCalledWith(expect.any(Number))
    })

    it('shows timeout message when timer expires', () => {
      render(<PatternFirstModal {...defaultProps} />)

      act(() => {
        vi.advanceTimersByTime(12100)
      })

      // Check for the warning message (more specific)
      expect(screen.getByText(/Pick a pattern to continue/)).toBeInTheDocument()
    })

    it('stops timer after selection', () => {
      render(<PatternFirstModal {...defaultProps} />)

      // Wait 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      // Make selection
      fireEvent.click(screen.getByText('Conservation of Momentum'))

      // Timer should stop - onTimeout should not be called even after more time
      act(() => {
        vi.advanceTimersByTime(10000)
      })

      expect(defaultProps.onTimeout).not.toHaveBeenCalled()
    })
  })

  describe('skip functionality', () => {
    it('shows skip button after timeout when canDismiss is true', () => {
      render(<PatternFirstModal {...defaultProps} />)

      act(() => {
        vi.advanceTimersByTime(12100)
      })

      expect(screen.getByText(/Skip pattern selection/)).toBeInTheDocument()
    })

    it('calls onSkip when skip button is clicked', () => {
      render(<PatternFirstModal {...defaultProps} />)

      act(() => {
        vi.advanceTimersByTime(12100)
      })

      fireEvent.click(screen.getByText(/Skip pattern selection/))

      expect(defaultProps.onSkip).toHaveBeenCalled()
    })

    it('does not show skip button when canDismiss is false', () => {
      render(<PatternFirstModal {...defaultProps} canDismiss={false} />)

      act(() => {
        vi.advanceTimersByTime(12100)
      })

      expect(screen.queryByText(/Skip pattern selection/)).not.toBeInTheDocument()
    })
  })

  describe('keyboard navigation', () => {
    it('handles arrow key navigation', () => {
      render(<PatternFirstModal {...defaultProps} />)

      // The focusable container is the inner div with tabIndex={0}
      const focusableContainer = screen.getByRole('dialog').querySelector('[tabindex="0"]') as HTMLElement

      // Arrow down should increase focused index
      fireEvent.keyDown(focusableContainer, { key: 'ArrowDown' })
      fireEvent.keyDown(focusableContainer, { key: 'ArrowDown' })

      // Enter should select the focused pattern (index 2 = Kinematics)
      fireEvent.keyDown(focusableContainer, { key: 'Enter' })

      expect(defaultProps.onSelect).toHaveBeenCalledWith(
        'kinematics',
        expect.any(Number),
        false
      )
    })

    it('handles Escape key when canDismiss is true after timeout', () => {
      render(<PatternFirstModal {...defaultProps} />)

      act(() => {
        vi.advanceTimersByTime(12100)
      })

      const focusableContainer = screen.getByRole('dialog').querySelector('[tabindex="0"]') as HTMLElement
      fireEvent.keyDown(focusableContainer, { key: 'Escape' })

      expect(defaultProps.onSkip).toHaveBeenCalled()
    })

    it('wraps navigation at boundaries', () => {
      render(<PatternFirstModal {...defaultProps} />)

      const focusableContainer = screen.getByRole('dialog').querySelector('[tabindex="0"]') as HTMLElement

      // Arrow up at index 0 should wrap to last item (index 3)
      fireEvent.keyDown(focusableContainer, { key: 'ArrowUp' })
      fireEvent.keyDown(focusableContainer, { key: 'Enter' })

      expect(defaultProps.onSelect).toHaveBeenCalledWith(
        'forces',
        expect.any(Number),
        false
      )
    })
  })

  describe('accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<PatternFirstModal {...defaultProps} />)

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'pattern-first-title')
    })

    it('has focusable container', () => {
      render(<PatternFirstModal {...defaultProps} />)

      const container = screen.getByRole('dialog').querySelector('[tabindex="0"]')
      expect(container).toBeInTheDocument()
    })
  })
})
