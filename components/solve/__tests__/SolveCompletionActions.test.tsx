import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SolveCompletionActions from '../SolveCompletionActions'

describe('SolveCompletionActions', () => {
  const defaultProps = {
    canGenerateNextChallenge: true,
    canLaunchSimulation: true,
    onContinuePath: vi.fn(),
    onReinforce: vi.fn(),
    onExploreWhatIf: vi.fn(),
    onReviewConcepts: vi.fn(),
    topic: 'Mechanics - Kinematics',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the completion card with header', () => {
    render(<SolveCompletionActions {...defaultProps} />)

    expect(screen.getByTestId('solve-completion-actions')).toBeDefined()
    expect(screen.getByText('Problem Completed!')).toBeDefined()
    expect(screen.getByText('Mechanics - Kinematics')).toBeDefined()
  })

  it('renders primary action "Continue the Path" when enabled', () => {
    render(<SolveCompletionActions {...defaultProps} />)

    const primaryButton = screen.getByTestId('completion-action-continue-path')
    expect(primaryButton).toBeDefined()
    expect(primaryButton.textContent).toContain('Continue the Path')
  })

  it('hides primary action when canGenerateNextChallenge is false', () => {
    render(
      <SolveCompletionActions {...defaultProps} canGenerateNextChallenge={false} />
    )

    expect(screen.queryByTestId('completion-action-continue-path')).toBeNull()
  })

  it('renders "Reinforce This Concept" secondary action', () => {
    render(<SolveCompletionActions {...defaultProps} />)

    const reinforceButton = screen.getByTestId('completion-action-reinforce')
    expect(reinforceButton).toBeDefined()
    expect(reinforceButton.textContent).toContain('Reinforce This Concept')
  })

  it('renders "Explore What-If Scenarios" when simulation is available', () => {
    render(<SolveCompletionActions {...defaultProps} />)

    const whatIfButton = screen.getByTestId('completion-action-whatif')
    expect(whatIfButton).toBeDefined()
    expect(whatIfButton.textContent).toContain('Explore What-If')
  })

  it('hides "Explore What-If" when canLaunchSimulation is false', () => {
    render(
      <SolveCompletionActions {...defaultProps} canLaunchSimulation={false} />
    )

    expect(screen.queryByTestId('completion-action-whatif')).toBeNull()
  })

  it('renders "Review Concepts Used" secondary action', () => {
    render(<SolveCompletionActions {...defaultProps} />)

    const reviewButton = screen.getByTestId('completion-action-review-concepts')
    expect(reviewButton).toBeDefined()
    expect(reviewButton.textContent).toContain('Review Concepts Used')
  })

  it('calls onContinuePath when primary action is clicked', () => {
    render(<SolveCompletionActions {...defaultProps} />)

    const primaryButton = screen.getByTestId('completion-action-continue-path')
    fireEvent.click(primaryButton)

    expect(defaultProps.onContinuePath).toHaveBeenCalledTimes(1)
  })

  it('calls onReinforce when "Reinforce" action is clicked', () => {
    render(<SolveCompletionActions {...defaultProps} />)

    const reinforceButton = screen.getByTestId('completion-action-reinforce')
    fireEvent.click(reinforceButton)

    expect(defaultProps.onReinforce).toHaveBeenCalledTimes(1)
  })

  it('calls onExploreWhatIf when "What-If" action is clicked', () => {
    render(<SolveCompletionActions {...defaultProps} />)

    const whatIfButton = screen.getByTestId('completion-action-whatif')
    fireEvent.click(whatIfButton)

    expect(defaultProps.onExploreWhatIf).toHaveBeenCalledTimes(1)
  })

  it('calls onReviewConcepts when "Review Concepts" action is clicked', () => {
    render(<SolveCompletionActions {...defaultProps} />)

    const reviewButton = screen.getByTestId('completion-action-review-concepts')
    fireEvent.click(reviewButton)

    expect(defaultProps.onReviewConcepts).toHaveBeenCalledTimes(1)
  })

  it('renders without topic when not provided', () => {
    render(<SolveCompletionActions {...defaultProps} topic={undefined} />)

    expect(screen.getByText('Problem Completed!')).toBeDefined()
    // Topic should not be present
    expect(screen.queryByText('Mechanics - Kinematics')).toBeNull()
  })
})
