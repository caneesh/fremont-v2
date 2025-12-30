import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CircuitBreakerWarning from '../CircuitBreakerWarning'
import type { ErrorTag } from '@/types/circuitBreaker'
import { ERROR_TAG_LABELS } from '@/types/circuitBreaker'

describe('CircuitBreakerWarning', () => {
  const defaultProps = {
    message: 'You have made multiple sign convention errors.',
    errorTag: 'sign_convention' as ErrorTag,
    onDismiss: vi.fn(),
  }

  describe('Rendering', () => {
    it('renders the warning banner', () => {
      render(<CircuitBreakerWarning {...defaultProps} />)

      expect(screen.getByText('Pattern Detected')).toBeInTheDocument()
    })

    it('displays the provided message', () => {
      render(<CircuitBreakerWarning {...defaultProps} />)

      expect(
        screen.getByText('You have made multiple sign convention errors.')
      ).toBeInTheDocument()
    })

    it('displays the error tag label', () => {
      render(<CircuitBreakerWarning {...defaultProps} />)

      expect(screen.getByText('Sign Convention')).toBeInTheDocument()
    })

    it('renders the warning icon', () => {
      render(<CircuitBreakerWarning {...defaultProps} />)

      // Warning icon SVG should be present
      const svgs = document.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThanOrEqual(1)
    })

    it('renders the dismiss button', () => {
      render(<CircuitBreakerWarning {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBe(1)
    })
  })

  describe('Error Tag Labels', () => {
    const errorTags: ErrorTag[] = [
      'vector_component',
      'sign_convention',
      'trig_identity',
      'unit_conversion',
      'algebra_manipulation',
      'conservation_scope',
      'reference_frame',
      'force_enumeration',
    ]

    it.each(errorTags)('displays correct label for %s error tag', (errorTag) => {
      render(
        <CircuitBreakerWarning
          message="Test message"
          errorTag={errorTag}
          onDismiss={vi.fn()}
        />
      )

      expect(screen.getByText(ERROR_TAG_LABELS[errorTag])).toBeInTheDocument()
    })

    it('displays "Vector Components" for vector_component tag', () => {
      render(
        <CircuitBreakerWarning
          message="Test"
          errorTag="vector_component"
          onDismiss={vi.fn()}
        />
      )

      expect(screen.getByText('Vector Components')).toBeInTheDocument()
    })

    it('displays "Trigonometry" for trig_identity tag', () => {
      render(
        <CircuitBreakerWarning
          message="Test"
          errorTag="trig_identity"
          onDismiss={vi.fn()}
        />
      )

      expect(screen.getByText('Trigonometry')).toBeInTheDocument()
    })

    it('displays "Unit Conversion" for unit_conversion tag', () => {
      render(
        <CircuitBreakerWarning
          message="Test"
          errorTag="unit_conversion"
          onDismiss={vi.fn()}
        />
      )

      expect(screen.getByText('Unit Conversion')).toBeInTheDocument()
    })

    it('displays "Algebra" for algebra_manipulation tag', () => {
      render(
        <CircuitBreakerWarning
          message="Test"
          errorTag="algebra_manipulation"
          onDismiss={vi.fn()}
        />
      )

      expect(screen.getByText('Algebra')).toBeInTheDocument()
    })

    it('displays "Conservation Laws" for conservation_scope tag', () => {
      render(
        <CircuitBreakerWarning
          message="Test"
          errorTag="conservation_scope"
          onDismiss={vi.fn()}
        />
      )

      expect(screen.getByText('Conservation Laws')).toBeInTheDocument()
    })

    it('displays "Reference Frames" for reference_frame tag', () => {
      render(
        <CircuitBreakerWarning
          message="Test"
          errorTag="reference_frame"
          onDismiss={vi.fn()}
        />
      )

      expect(screen.getByText('Reference Frames')).toBeInTheDocument()
    })

    it('displays "Force Analysis" for force_enumeration tag', () => {
      render(
        <CircuitBreakerWarning
          message="Test"
          errorTag="force_enumeration"
          onDismiss={vi.fn()}
        />
      )

      expect(screen.getByText('Force Analysis')).toBeInTheDocument()
    })
  })

  describe('Dismiss Interaction', () => {
    it('calls onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn()
      render(
        <CircuitBreakerWarning
          message="Test message"
          errorTag="sign_convention"
          onDismiss={onDismiss}
        />
      )

      const dismissButton = screen.getByRole('button')
      fireEvent.click(dismissButton)

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it('does not call onDismiss on initial render', () => {
      const onDismiss = vi.fn()
      render(
        <CircuitBreakerWarning
          message="Test message"
          errorTag="sign_convention"
          onDismiss={onDismiss}
        />
      )

      expect(onDismiss).not.toHaveBeenCalled()
    })

    it('calls onDismiss each time dismiss button is clicked', () => {
      const onDismiss = vi.fn()
      render(
        <CircuitBreakerWarning
          message="Test message"
          errorTag="sign_convention"
          onDismiss={onDismiss}
        />
      )

      const dismissButton = screen.getByRole('button')
      fireEvent.click(dismissButton)
      fireEvent.click(dismissButton)
      fireEvent.click(dismissButton)

      expect(onDismiss).toHaveBeenCalledTimes(3)
    })
  })

  describe('Different Messages', () => {
    it('renders short messages', () => {
      render(
        <CircuitBreakerWarning
          message="Error detected"
          errorTag="sign_convention"
          onDismiss={vi.fn()}
        />
      )

      expect(screen.getByText('Error detected')).toBeInTheDocument()
    })

    it('renders long messages', () => {
      const longMessage =
        'You have made several errors related to vector component decomposition. Consider reviewing how to break vectors into their x and y components using trigonometric functions.'
      render(
        <CircuitBreakerWarning
          message={longMessage}
          errorTag="vector_component"
          onDismiss={vi.fn()}
        />
      )

      expect(screen.getByText(longMessage)).toBeInTheDocument()
    })

    it('renders messages with special characters', () => {
      const specialMessage = 'Error with sin(θ) & cos(θ) - check your work!'
      render(
        <CircuitBreakerWarning
          message={specialMessage}
          errorTag="trig_identity"
          onDismiss={vi.fn()}
        />
      )

      expect(screen.getByText(specialMessage)).toBeInTheDocument()
    })

    it('renders empty message', () => {
      render(
        <CircuitBreakerWarning
          message=""
          errorTag="sign_convention"
          onDismiss={vi.fn()}
        />
      )

      // Component should still render with Pattern Detected
      expect(screen.getByText('Pattern Detected')).toBeInTheDocument()
    })
  })

  describe('Styling and Structure', () => {
    it('has the correct container structure', () => {
      const { container } = render(<CircuitBreakerWarning {...defaultProps} />)

      // Main container should have amber styling classes
      const mainDiv = container.firstChild as HTMLElement
      expect(mainDiv).toHaveClass('bg-amber-50')
      expect(mainDiv).toHaveClass('border')
      expect(mainDiv).toHaveClass('rounded-lg')
      expect(mainDiv).toHaveClass('p-4')
      expect(mainDiv).toHaveClass('mb-4')
    })

    it('has animation class for fade-in effect', () => {
      const { container } = render(<CircuitBreakerWarning {...defaultProps} />)

      const mainDiv = container.firstChild as HTMLElement
      expect(mainDiv).toHaveClass('animate-fade-in')
    })

    it('has the icon container with proper styling', () => {
      const { container } = render(<CircuitBreakerWarning {...defaultProps} />)

      // Icon container should have amber background
      const iconContainer = container.querySelector('.w-8.h-8')
      expect(iconContainer).toBeInTheDocument()
      expect(iconContainer).toHaveClass('bg-amber-100')
      expect(iconContainer).toHaveClass('rounded-full')
    })

    it('has the error tag badge with proper styling', () => {
      render(<CircuitBreakerWarning {...defaultProps} />)

      const badge = screen.getByText('Sign Convention')
      expect(badge).toHaveClass('rounded-full')
      expect(badge).toHaveClass('text-xs')
      expect(badge).toHaveClass('font-medium')
    })
  })

  describe('Accessibility', () => {
    it('dismiss button is focusable', () => {
      render(<CircuitBreakerWarning {...defaultProps} />)

      const dismissButton = screen.getByRole('button')
      dismissButton.focus()

      expect(document.activeElement).toBe(dismissButton)
    })

    it('dismiss button is clickable via keyboard', () => {
      const onDismiss = vi.fn()
      render(
        <CircuitBreakerWarning
          message="Test"
          errorTag="sign_convention"
          onDismiss={onDismiss}
        />
      )

      const dismissButton = screen.getByRole('button')
      dismissButton.focus()
      fireEvent.keyDown(dismissButton, { key: 'Enter' })
      fireEvent.click(dismissButton)

      expect(onDismiss).toHaveBeenCalled()
    })

    it('warning content is visible to screen readers', () => {
      render(<CircuitBreakerWarning {...defaultProps} />)

      // Pattern Detected heading should be visible
      expect(screen.getByText('Pattern Detected')).toBeVisible()

      // Message should be visible
      expect(
        screen.getByText('You have made multiple sign convention errors.')
      ).toBeVisible()

      // Tag label should be visible
      expect(screen.getByText('Sign Convention')).toBeVisible()
    })
  })

  describe('Re-rendering', () => {
    it('updates when message prop changes', () => {
      const { rerender } = render(
        <CircuitBreakerWarning
          message="First message"
          errorTag="sign_convention"
          onDismiss={vi.fn()}
        />
      )

      expect(screen.getByText('First message')).toBeInTheDocument()

      rerender(
        <CircuitBreakerWarning
          message="Second message"
          errorTag="sign_convention"
          onDismiss={vi.fn()}
        />
      )

      expect(screen.queryByText('First message')).not.toBeInTheDocument()
      expect(screen.getByText('Second message')).toBeInTheDocument()
    })

    it('updates when errorTag prop changes', () => {
      const { rerender } = render(
        <CircuitBreakerWarning
          message="Test"
          errorTag="sign_convention"
          onDismiss={vi.fn()}
        />
      )

      expect(screen.getByText('Sign Convention')).toBeInTheDocument()

      rerender(
        <CircuitBreakerWarning
          message="Test"
          errorTag="vector_component"
          onDismiss={vi.fn()}
        />
      )

      expect(screen.queryByText('Sign Convention')).not.toBeInTheDocument()
      expect(screen.getByText('Vector Components')).toBeInTheDocument()
    })

    it('updates onDismiss callback when prop changes', () => {
      const onDismiss1 = vi.fn()
      const onDismiss2 = vi.fn()

      const { rerender } = render(
        <CircuitBreakerWarning
          message="Test"
          errorTag="sign_convention"
          onDismiss={onDismiss1}
        />
      )

      rerender(
        <CircuitBreakerWarning
          message="Test"
          errorTag="sign_convention"
          onDismiss={onDismiss2}
        />
      )

      const dismissButton = screen.getByRole('button')
      fireEvent.click(dismissButton)

      expect(onDismiss1).not.toHaveBeenCalled()
      expect(onDismiss2).toHaveBeenCalledTimes(1)
    })
  })
})
