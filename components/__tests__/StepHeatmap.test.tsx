import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StepHeatmap, { StepHeatmapInline } from '../StepHeatmap'
import type { Confidence } from '@/types/confidence'

describe('StepHeatmap', () => {
  const defaultProps = {
    stepConfidenceRatings: new Map<number, Confidence>(),
    stepTitles: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
    completedSteps: [] as number[],
    currentStep: 0,
  }

  describe('rendering', () => {
    it('renders nothing when stepTitles is empty', () => {
      const { container } = render(
        <StepHeatmap
          {...defaultProps}
          stepTitles={[]}
        />
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders heatmap with correct number of cells', () => {
      render(<StepHeatmap {...defaultProps} />)

      // Should have 4 step cells
      expect(screen.getByTitle(/Step 1/)).toBeInTheDocument()
      expect(screen.getByTitle(/Step 2/)).toBeInTheDocument()
      expect(screen.getByTitle(/Step 3/)).toBeInTheDocument()
      expect(screen.getByTitle(/Step 4/)).toBeInTheDocument()
    })

    it('shows "Confidence Heatmap" label', () => {
      render(<StepHeatmap {...defaultProps} />)
      expect(screen.getByText('Confidence Heatmap')).toBeInTheDocument()
    })

    it('shows empty state message when no steps completed', () => {
      render(<StepHeatmap {...defaultProps} />)
      expect(screen.getByText('Complete steps to see your confidence ratings here')).toBeInTheDocument()
    })
  })

  describe('confidence colors', () => {
    it('shows green for high confidence completed steps', () => {
      const ratings = new Map<number, Confidence>([[0, 'high']])
      render(
        <StepHeatmap
          {...defaultProps}
          stepConfidenceRatings={ratings}
          completedSteps={[0]}
        />
      )

      const step1Button = screen.getByTitle(/Step 1.*high confidence/)
      expect(step1Button).toBeInTheDocument()
      expect(step1Button.className).toContain('bg-green')
    })

    it('shows blue for medium confidence completed steps', () => {
      const ratings = new Map<number, Confidence>([[1, 'medium']])
      render(
        <StepHeatmap
          {...defaultProps}
          stepConfidenceRatings={ratings}
          completedSteps={[1]}
        />
      )

      const step2Button = screen.getByTitle(/Step 2.*medium confidence/)
      expect(step2Button).toBeInTheDocument()
      expect(step2Button.className).toContain('bg-blue')
    })

    it('shows amber for low confidence completed steps', () => {
      const ratings = new Map<number, Confidence>([[2, 'low']])
      render(
        <StepHeatmap
          {...defaultProps}
          stepConfidenceRatings={ratings}
          completedSteps={[2]}
        />
      )

      const step3Button = screen.getByTitle(/Step 3.*low confidence/)
      expect(step3Button).toBeInTheDocument()
      expect(step3Button.className).toContain('bg-amber')
    })

    it('shows gray for incomplete steps', () => {
      render(<StepHeatmap {...defaultProps} />)

      const step1Button = screen.getByTitle(/Step 1.*not completed/)
      expect(step1Button.className).toContain('bg-slate')
    })
  })

  describe('current step indicator', () => {
    it('highlights current step with ring', () => {
      render(
        <StepHeatmap
          {...defaultProps}
          currentStep={1}
        />
      )

      const step2Button = screen.getByTitle(/Step 2/)
      expect(step2Button.className).toContain('ring-2')
      expect(step2Button.className).toContain('ring-indigo')
    })
  })

  describe('statistics', () => {
    it('shows rated count when steps have ratings', () => {
      const ratings = new Map<number, Confidence>([
        [0, 'high'],
        [1, 'medium'],
      ])
      render(
        <StepHeatmap
          {...defaultProps}
          stepConfidenceRatings={ratings}
          completedSteps={[0, 1]}
        />
      )

      expect(screen.getByText('2/4 rated')).toBeInTheDocument()
    })

    it('shows confidence breakdown', () => {
      const ratings = new Map<number, Confidence>([
        [0, 'high'],
        [1, 'high'],
        [2, 'medium'],
        [3, 'low'],
      ])
      render(
        <StepHeatmap
          {...defaultProps}
          stepConfidenceRatings={ratings}
          completedSteps={[0, 1, 2, 3]}
        />
      )

      expect(screen.getByText('High: 2')).toBeInTheDocument()
      expect(screen.getByText('Med: 1')).toBeInTheDocument()
      expect(screen.getByText('Low: 1')).toBeInTheDocument()
    })

    it('shows average score', () => {
      const ratings = new Map<number, Confidence>([
        [0, 'high'],   // 3
        [1, 'medium'], // 2
      ])
      render(
        <StepHeatmap
          {...defaultProps}
          stepConfidenceRatings={ratings}
          completedSteps={[0, 1]}
        />
      )

      // Average: (3 + 2) / 2 = 2.5
      expect(screen.getByText('Avg: 2.5/3')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onStepClick when a step is clicked', () => {
      const onStepClick = vi.fn()
      render(
        <StepHeatmap
          {...defaultProps}
          onStepClick={onStepClick}
        />
      )

      const step2Button = screen.getByTitle(/Step 2/)
      fireEvent.click(step2Button)

      expect(onStepClick).toHaveBeenCalledWith(1)
    })
  })
})

describe('StepHeatmapInline', () => {
  it('renders nothing when no ratings', () => {
    const { container } = render(
      <StepHeatmapInline
        stepConfidenceRatings={new Map()}
        completedSteps={[]}
        totalSteps={4}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders confidence bars when ratings exist', () => {
    const ratings = new Map<number, Confidence>([
      [0, 'high'],
      [1, 'low'],
    ])
    render(
      <StepHeatmapInline
        stepConfidenceRatings={ratings}
        completedSteps={[0, 1]}
        totalSteps={4}
      />
    )

    expect(screen.getByText('Confidence:')).toBeInTheDocument()
  })

  it('shows emoji counts', () => {
    const ratings = new Map<number, Confidence>([
      [0, 'high'],
      [1, 'medium'],
      [2, 'low'],
    ])
    render(
      <StepHeatmapInline
        stepConfidenceRatings={ratings}
        completedSteps={[0, 1, 2]}
        totalSteps={4}
      />
    )

    // Should show count with emojis: (1💪 1🤔 1🎲)
    expect(screen.getByText(/1💪/)).toBeInTheDocument()
    expect(screen.getByText(/1🤔/)).toBeInTheDocument()
    expect(screen.getByText(/1🎲/)).toBeInTheDocument()
  })
})
