import { describe, it, expect } from 'vitest'
import {
  generateRevealBundleFromTask,
  generateReconstructFromTask,
  determineValidationOutcome,
  generateValidationFeedback,
  type RevealBundle,
  type ReconstructQuestion,
  type QuestionResult,
  type ValidationOutcome,
  type StepLearningStatus,
  type RevealSection,
  type ReconstructBundle,
  type ValidationResult,
  type RevealFlowData,
  type RevealFlowState,
  type RevealFlowEventType,
  type RevealFlowEventMetadata,
} from '../revealFlow'

describe('revealFlow types and helpers', () => {
  describe('generateRevealBundleFromTask', () => {
    it('creates a RevealBundle with 3 sections', () => {
      const bundle = generateRevealBundleFromTask(
        'Concept',
        'Newton\'s second law states F = ma',
        'Calculate Force'
      )

      expect(bundle.sections).toHaveLength(3)
      expect(bundle.sections[0].title).toBe('1. Approach')
      expect(bundle.sections[1].title).toBe('2. Key Insight')
      expect(bundle.sections[2].title).toBe('3. Takeaway')
    })

    it('includes step title in the approach section', () => {
      const bundle = generateRevealBundleFromTask(
        'Method',
        'Use energy conservation',
        'Find Velocity'
      )

      expect(bundle.sections[0].content).toContain('Find Velocity')
      expect(bundle.sections[0].content).toContain('method')
    })

    it('uses explanation as key insight content', () => {
      const explanation = 'Energy is conserved in isolated systems'
      const bundle = generateRevealBundleFromTask(
        'Concept',
        explanation,
        'Energy Problem'
      )

      expect(bundle.sections[1].content).toBe(explanation)
    })

    it('includes level title in takeaway', () => {
      const bundle = generateRevealBundleFromTask(
        'Setup',
        'Define coordinate system',
        'Vector Problem'
      )

      expect(bundle.sections[2].content).toContain('setup')
    })

    it('includes full explanation as moreDetail', () => {
      const explanation = 'This is a detailed explanation of the concept.'
      const bundle = generateRevealBundleFromTask(
        'Concept',
        explanation,
        'Step Title'
      )

      expect(bundle.moreDetail).toBe(explanation)
    })
  })

  describe('generateReconstructFromTask', () => {
    const options = [
      { id: 'a', text: 'Option A' },
      { id: 'b', text: 'Option B' },
      { id: 'c', text: 'Option C' },
    ]

    it('creates a ReconstructQuestion with correct id format', () => {
      const question = generateReconstructFromTask(
        'task-123',
        'MULTIPLE_CHOICE',
        'What is the answer?',
        options,
        'a',
        'Option A is correct because it follows the principle.'
      )

      expect(question.id).toBe('reconstruct-task-123')
    })

    it('sets type to single_choice for MULTIPLE_CHOICE tasks', () => {
      const question = generateReconstructFromTask(
        'task-1',
        'MULTIPLE_CHOICE',
        'Question?',
        options,
        'a',
        'Explanation.'
      )

      expect(question.type).toBe('single_choice')
    })

    it('sets type to single_choice for FILL_BLANK tasks', () => {
      const question = generateReconstructFromTask(
        'task-1',
        'FILL_BLANK',
        'Question?',
        options,
        'a',
        'Explanation.'
      )

      expect(question.type).toBe('single_choice')
    })

    it('prefixes prompt with "Quick check:"', () => {
      const question = generateReconstructFromTask(
        'task-1',
        'MULTIPLE_CHOICE',
        'What is F=ma?',
        options,
        'a',
        'Explanation.'
      )

      expect(question.prompt).toBe('Quick check: What is F=ma?')
    })

    it('limits options to 4 maximum', () => {
      const manyOptions = [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
        { id: 'c', text: 'C' },
        { id: 'd', text: 'D' },
        { id: 'e', text: 'E' },
        { id: 'f', text: 'F' },
      ]

      const question = generateReconstructFromTask(
        'task-1',
        'MULTIPLE_CHOICE',
        'Question?',
        manyOptions,
        'a',
        'Explanation.'
      )

      expect(question.options).toHaveLength(4)
    })

    it('extracts first sentence for explainCorrect', () => {
      const question = generateReconstructFromTask(
        'task-1',
        'MULTIPLE_CHOICE',
        'Question?',
        options,
        'a',
        'This is the first sentence. This is the second sentence. And a third.'
      )

      expect(question.explainCorrect).toBe('This is the first sentence.')
    })

    it('uses default explainWrong message', () => {
      const question = generateReconstructFromTask(
        'task-1',
        'MULTIPLE_CHOICE',
        'Question?',
        options,
        'a',
        'Explanation.'
      )

      expect(question.explainWrong).toBe('Review the explanation above and try again.')
    })

    it('sets correctOptionId correctly', () => {
      const question = generateReconstructFromTask(
        'task-1',
        'MULTIPLE_CHOICE',
        'Question?',
        options,
        'b',
        'Explanation.'
      )

      expect(question.correctOptionId).toBe('b')
    })
  })

  describe('determineValidationOutcome', () => {
    it('returns solid when all answers are correct', () => {
      const results: QuestionResult[] = [
        { questionId: 'q1', selectedOptionId: 'a', isCorrect: true },
        { questionId: 'q2', selectedOptionId: 'b', isCorrect: true },
      ]

      expect(determineValidationOutcome(results)).toBe('solid')
    })

    it('returns solid for single correct answer', () => {
      const results: QuestionResult[] = [
        { questionId: 'q1', selectedOptionId: 'a', isCorrect: true },
      ]

      expect(determineValidationOutcome(results)).toBe('solid')
    })

    it('returns partial when some answers are correct', () => {
      const results: QuestionResult[] = [
        { questionId: 'q1', selectedOptionId: 'a', isCorrect: true },
        { questionId: 'q2', selectedOptionId: 'b', isCorrect: false },
      ]

      expect(determineValidationOutcome(results)).toBe('partial')
    })

    it('returns partial when 1 of 3 is correct', () => {
      const results: QuestionResult[] = [
        { questionId: 'q1', selectedOptionId: 'a', isCorrect: false },
        { questionId: 'q2', selectedOptionId: 'b', isCorrect: true },
        { questionId: 'q3', selectedOptionId: 'c', isCorrect: false },
      ]

      expect(determineValidationOutcome(results)).toBe('partial')
    })

    it('returns mismatch when all answers are wrong', () => {
      const results: QuestionResult[] = [
        { questionId: 'q1', selectedOptionId: 'a', isCorrect: false },
        { questionId: 'q2', selectedOptionId: 'b', isCorrect: false },
      ]

      expect(determineValidationOutcome(results)).toBe('mismatch')
    })

    it('returns mismatch for single wrong answer', () => {
      const results: QuestionResult[] = [
        { questionId: 'q1', selectedOptionId: 'a', isCorrect: false },
      ]

      expect(determineValidationOutcome(results)).toBe('mismatch')
    })

    it('handles empty results array as solid (vacuously true)', () => {
      const results: QuestionResult[] = []

      // 0 correct out of 0 total means correctCount === totalCount
      expect(determineValidationOutcome(results)).toBe('solid')
    })
  })

  describe('generateValidationFeedback', () => {
    const explainCorrect = 'You understood the key concept!'
    const explainWrong = 'The answer relates to momentum.'

    it('generates positive feedback for solid outcome', () => {
      const feedback = generateValidationFeedback('solid', explainCorrect, explainWrong)

      expect(feedback).toContain('Great understanding!')
      expect(feedback).toContain(explainCorrect)
    })

    it('generates encouraging feedback for partial outcome', () => {
      const feedback = generateValidationFeedback('partial', explainCorrect, explainWrong)

      expect(feedback).toContain("You're on the right track")
      expect(feedback).toContain(explainWrong)
      expect(feedback).toContain('specific case')
    })

    it('generates clarifying feedback for mismatch outcome', () => {
      const feedback = generateValidationFeedback('mismatch', explainCorrect, explainWrong)

      expect(feedback).toContain("Let's clarify")
      expect(feedback).toContain(explainWrong)
      expect(feedback).toContain('key insight')
    })

    it('returns empty string for unknown outcome', () => {
      // @ts-expect-error - testing invalid input
      const feedback = generateValidationFeedback('unknown', explainCorrect, explainWrong)

      expect(feedback).toBe('')
    })
  })

  describe('type definitions', () => {
    it('StepLearningStatus has correct values', () => {
      const statuses: StepLearningStatus[] = [
        'not_started',
        'in_progress',
        'revealed_not_validated',
        'conceptually_validated',
        'completed',
      ]

      expect(statuses).toHaveLength(5)
    })

    it('ValidationOutcome has correct values', () => {
      const outcomes: ValidationOutcome[] = ['solid', 'partial', 'mismatch']

      expect(outcomes).toHaveLength(3)
    })

    it('RevealFlowEventType has correct values', () => {
      const eventTypes: RevealFlowEventType[] = [
        'reveal_opened',
        'reveal_explanation_shown',
        'reconstruct_question_answered',
        'reconstruct_completed',
        'reveal_closed',
        'concept_confusion_detected',
      ]

      expect(eventTypes).toHaveLength(6)
    })

    it('RevealSection interface works correctly', () => {
      const section: RevealSection = {
        title: 'Test Title',
        content: 'Test Content',
      }

      expect(section.title).toBe('Test Title')
      expect(section.content).toBe('Test Content')
    })

    it('RevealBundle interface works correctly', () => {
      const bundle: RevealBundle = {
        sections: [
          { title: 'S1', content: 'C1' },
          { title: 'S2', content: 'C2' },
          { title: 'S3', content: 'C3' },
        ],
        moreDetail: 'Additional detail',
      }

      expect(bundle.sections).toHaveLength(3)
      expect(bundle.moreDetail).toBe('Additional detail')
    })

    it('ReconstructQuestion interface works correctly', () => {
      const question: ReconstructQuestion = {
        id: 'q1',
        type: 'single_choice',
        prompt: 'What is 2+2?',
        options: [
          { id: 'a', text: '3' },
          { id: 'b', text: '4' },
        ],
        correctOptionId: 'b',
        explainCorrect: 'Correct!',
        explainWrong: 'Try again.',
      }

      expect(question.type).toBe('single_choice')
      expect(question.options).toHaveLength(2)
    })

    it('ReconstructBundle interface works correctly', () => {
      const bundle: ReconstructBundle = {
        questions: [
          {
            id: 'q1',
            type: 'yes_no',
            prompt: 'Is gravity real?',
            options: [
              { id: 'yes', text: 'Yes' },
              { id: 'no', text: 'No' },
            ],
            correctOptionId: 'yes',
            explainCorrect: 'Correct!',
            explainWrong: 'Wrong!',
          },
        ],
      }

      expect(bundle.questions).toHaveLength(1)
      expect(bundle.questions[0].type).toBe('yes_no')
    })

    it('QuestionResult interface works correctly', () => {
      const result: QuestionResult = {
        questionId: 'q1',
        selectedOptionId: 'a',
        isCorrect: true,
      }

      expect(result.isCorrect).toBe(true)
    })

    it('ValidationResult interface works correctly', () => {
      const result: ValidationResult = {
        outcome: 'solid',
        questionResults: [
          { questionId: 'q1', selectedOptionId: 'a', isCorrect: true },
        ],
        feedback: 'Great job!',
      }

      expect(result.outcome).toBe('solid')
      expect(result.feedback).toBe('Great job!')
    })

    it('RevealFlowData interface works correctly', () => {
      const data: RevealFlowData = {
        reveal: {
          sections: [{ title: 'T', content: 'C' }],
        },
        reconstruct: {
          questions: [],
        },
      }

      expect(data.reveal.sections).toHaveLength(1)
      expect(data.reconstruct.questions).toHaveLength(0)
    })

    it('RevealFlowState interface works correctly', () => {
      const state: RevealFlowState = {
        stepId: 1,
        levelId: 2,
        status: 'in_progress',
        revealViewedAt: '2024-01-01T00:00:00Z',
        reconstructAttempts: 1,
        lastValidationOutcome: 'partial',
        questionResults: [
          { questionId: 'q1', selectedOptionId: 'a', isCorrect: true },
        ],
      }

      expect(state.stepId).toBe(1)
      expect(state.status).toBe('in_progress')
      expect(state.reconstructAttempts).toBe(1)
    })

    it('RevealFlowEventMetadata interface works correctly', () => {
      const metadata: RevealFlowEventMetadata = {
        stepId: 1,
        levelId: 2,
        questionId: 'q1',
        selectedOptionId: 'a',
        isCorrect: true,
        outcome: 'solid',
        conceptTag: 'newton_laws',
      }

      expect(metadata.stepId).toBe(1)
      expect(metadata.conceptTag).toBe('newton_laws')
    })
  })
})
