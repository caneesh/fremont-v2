import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BoundaryCaseBuilder from '../BoundaryCaseBuilder'
import type { BoundaryCaseDetection, PredictionValidation, BoundaryCase } from '@/types/boundaryCase'

vi.mock('@/lib/boundaryCaseService', () => ({
  boundaryCaseService: {
    detectBoundaryCases: vi.fn(),
    validatePrediction: vi.fn(),
  },
}))

vi.mock('../MathRenderer', () => ({
  default: ({ text }: { text: string }) => <div data-testid="math-renderer">{text}</div>,
}))

import { boundaryCaseService } from '@/lib/boundaryCaseService'

const mockDetect = boundaryCaseService.detectBoundaryCases as ReturnType<typeof vi.fn>
const mockValidate = boundaryCaseService.validatePrediction as ReturnType<typeof vi.fn>

const mockCase: BoundaryCase = {
  id: 'case-1',
  type: 'velocity_limiting',
  variable: 'v',
  variableDisplay: 'velocity v',
  direction: 'approaches_zero',
  limitValue: '0',
  equation: 'R = v^2/g',
  promptQuestion: 'What happens to range as v → 0?',
  expectedPhysicalOutcome: 'Range goes to zero.',
  expectedMathOutcome: 'R → 0',
  physicalReasoning: 'Zero speed means no motion.',
  commonMistakes: ['Range stays finite'],
}

describe('BoundaryCaseBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders entry card when boundary cases exist', () => {
    const detection: BoundaryCaseDetection = {
      hasBoundaryCases: true,
      detectedEquation: 'R = v^2/g',
      cases: [mockCase],
    }
    mockDetect.mockReturnValueOnce(detection)

    render(<BoundaryCaseBuilder scaffoldData={{} as any} />)

    expect(screen.getByText('Stress-Test Your Equation')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Verify Formula/i })).toBeInTheDocument()
  })

  it('does not render when no boundary cases are detected', () => {
    const detection: BoundaryCaseDetection = {
      hasBoundaryCases: false,
      cases: [],
    }
    mockDetect.mockReturnValueOnce(detection)

    const { container } = render(<BoundaryCaseBuilder scaffoldData={{} as any} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('runs a boundary case flow and shows completion state', () => {
    const detection: BoundaryCaseDetection = {
      hasBoundaryCases: true,
      detectedEquation: 'R = v^2/g',
      cases: [mockCase],
    }
    mockDetect.mockReturnValueOnce(detection)

    const validation: PredictionValidation = {
      isCorrect: true,
      feedbackType: 'correct',
      feedback: 'Correct intuition.',
      mathVerification: 'As v → 0, R → 0.',
    }
    mockValidate.mockReturnValueOnce(validation)

    render(<BoundaryCaseBuilder scaffoldData={{} as any} />)

    fireEvent.click(screen.getByRole('button', { name: /Verify Formula/i }))
    fireEvent.click(screen.getByRole('button', { name: /What if velocity v → 0\?/i }))

    const textarea = screen.getByPlaceholderText(/range would be zero/i)
    fireEvent.change(textarea, { target: { value: 'Range goes to zero.' } })

    fireEvent.click(screen.getByRole('button', { name: /Check My Prediction/i }))

    expect(mockValidate).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Correct intuition.')).toBeInTheDocument()
    expect(screen.getByTestId('math-renderer')).toHaveTextContent('As v → 0, R → 0.')

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))

    expect(screen.getByText("You've explored all available boundary cases!")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Done/i })).toBeInTheDocument()
  })
})
