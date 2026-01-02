/**
 * Question Engine Adapter
 *
 * Converts QuestionDoc (from Question Engine) to ScaffoldData (for existing UI).
 * This allows the Question Engine to integrate seamlessly with the existing
 * SolutionScaffold and MicroTaskStepAccordion components.
 */

import type { QuestionDoc, Step as QEStep } from './schemas'
import type { ScaffoldData, Step, Concept, HintLevel, StepType } from '@/types/scaffold'

/**
 * Maps Question Engine step types to ScaffoldData step types
 */
function mapStepType(qeType: QEStep['type']): StepType {
  switch (qeType) {
    case 'diagram':
      return 'diagram'
    case 'equation':
      return 'math_manipulation'
    case 'mcq':
    case 'fill':
    case 'short':
    default:
      return 'physics_concept'
  }
}

/**
 * Converts a Question Engine step to a ScaffoldData step
 * Creates a 5-level hint ladder from the QE step's hint/trap/solution
 */
function convertStep(qeStep: QEStep, index: number): Step {
  // Build 5-level hint ladder from the QE step data
  const hints: HintLevel[] = [
    {
      level: 1,
      title: 'Concept Identification',
      content: `Think about what physics concept applies here. ${qeStep.hint.split('.')[0]}.`,
    },
    {
      level: 2,
      title: 'Visualization',
      content: qeStep.hint,
    },
    {
      level: 3,
      title: 'Strategy Selection',
      content: `Watch out: ${qeStep.trap}`,
    },
    {
      level: 4,
      title: 'Structural Equation',
      content: qeStep.solution.split('.').slice(0, 2).join('.') + '.',
    },
    {
      level: 5,
      title: 'Full Solution',
      content: qeStep.solution,
    },
  ]

  return {
    id: index + 1,
    title: qeStep.prompt,
    stepType: mapStepType(qeStep.type),
    hints,
    requiredConcepts: [],
    question: qeStep.prompt,
    validationPrompt: `Expected: ${qeStep.expected.type === 'exact' ? qeStep.expected.value : 'See solution'}`,
  }
}

/**
 * Extracts concepts from the QuestionDoc fingerprint and template
 */
function extractConcepts(doc: QuestionDoc): Concept[] {
  const concepts: Concept[] = []

  // Add topic as a concept
  concepts.push({
    id: doc.topic,
    name: doc.topic.charAt(0).toUpperCase() + doc.topic.slice(1),
    definition: `Core concepts from ${doc.topic}`,
  })

  // Add subtopic as a concept
  if (doc.subtopic && doc.subtopic !== doc.topic) {
    concepts.push({
      id: doc.subtopic,
      name: doc.subtopic.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      definition: `Specific focus on ${doc.subtopic.replace(/_/g, ' ')}`,
    })
  }

  // Add keywords from fingerprint as concepts
  doc.fingerprint.keywords.slice(0, 3).forEach((keyword, i) => {
    concepts.push({
      id: `keyword_${i}`,
      name: keyword.replace(/\b\w/g, c => c.toUpperCase()),
      definition: `Key concept: ${keyword}`,
    })
  })

  return concepts
}

/**
 * Converts a QuestionDoc from the Question Engine to ScaffoldData
 * for use with the existing SolutionScaffold component
 */
export function questionDocToScaffoldData(doc: QuestionDoc): ScaffoldData {
  return {
    problem: doc.statement,
    domain: doc.topic,
    subdomain: doc.subtopic,
    concepts: extractConcepts(doc),
    steps: doc.steps.map((step, index) => convertStep(step, index)),
    sanityCheck: {
      question: 'Does your answer make physical sense?',
      expectedBehavior: `The answer should be ${doc.finalAnswer}`,
      type: 'dimension',
    },
    finalAnswer: doc.finalAnswer,
    density: 3,
  }
}

/**
 * Fetches a question from the Question Engine and converts it to ScaffoldData
 */
export async function resolveWithQuestionEngine(
  problemText: string,
  options?: {
    topic?: string
    subtopic?: string
    userId?: string
  }
): Promise<{ success: true; data: ScaffoldData } | { success: false; error: string }> {
  try {
    const response = await fetch('/api/question/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        statement: problemText,
        topic: options?.topic,
        subtopic: options?.subtopic,
        userId: options?.userId,
      }),
    })

    const result = await response.json()

    if (!result.success || !result.question) {
      return {
        success: false,
        error: result.error?.message || 'Failed to resolve question',
      }
    }

    const scaffoldData = questionDocToScaffoldData(result.question)
    return { success: true, data: scaffoldData }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}
