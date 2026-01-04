/**
 * Question Engine Adapter
 *
 * Converts QuestionDoc (from Question Engine) to ScaffoldData (for existing UI).
 * This allows the Question Engine to integrate seamlessly with the existing
 * SolutionScaffold and MicroTaskStepAccordion components.
 *
 * Includes local scaffold cache for instant response on known questions.
 */

import type { QuestionDoc, Step as QEStep } from './schemas'
import type { ScaffoldData, Step, Concept, HintLevel, StepType } from '@/types/scaffold'
import scaffoldsData from '@/data/scaffolds.json'

// Local scaffold cache type
interface LocalScaffold {
  id: string
  topic: string
  subtopic: string
  statement: string
  fingerprint: {
    topic: string
    subtopic: string
    keywords: string[]
  }
  steps: Array<{
    type: string
    prompt: string
    hint: string
    trap: string
    solution: string
    expected: { type: string; value: string }
  }>
  finalAnswer: string
}

const localScaffolds = scaffoldsData.scaffolds as Record<string, LocalScaffold>

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
 * Converts a local scaffold to ScaffoldData
 */
function localScaffoldToScaffoldData(scaffold: LocalScaffold): ScaffoldData {
  const concepts: Concept[] = [
    {
      id: scaffold.topic,
      name: scaffold.topic.charAt(0).toUpperCase() + scaffold.topic.slice(1),
      definition: `Core concepts from ${scaffold.topic}`,
    },
    {
      id: scaffold.subtopic,
      name: scaffold.subtopic.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      definition: `Specific focus on ${scaffold.subtopic.replace(/_/g, ' ')}`,
    },
    ...scaffold.fingerprint.keywords.slice(0, 3).map((keyword, i) => ({
      id: `keyword_${i}`,
      name: keyword.replace(/\b\w/g, c => c.toUpperCase()),
      definition: `Key concept: ${keyword}`,
    })),
  ]

  const steps: Step[] = scaffold.steps.map((step, index) => {
    const stepType: StepType = step.type === 'diagram' ? 'diagram' :
                               step.type === 'equation' ? 'math_manipulation' :
                               'physics_concept'

    const hints: HintLevel[] = [
      {
        level: 1,
        title: 'Concept Identification',
        content: `Think about what physics concept applies here. ${step.hint.split('.')[0]}.`,
      },
      {
        level: 2,
        title: 'Visualization',
        content: step.hint,
      },
      {
        level: 3,
        title: 'Strategy Selection',
        content: `Watch out: ${step.trap}`,
      },
      {
        level: 4,
        title: 'Structural Equation',
        content: step.solution.split('.').slice(0, 2).join('.') + '.',
      },
      {
        level: 5,
        title: 'Full Solution',
        content: step.solution,
      },
    ]

    return {
      id: index + 1,
      title: step.prompt,
      stepType,
      hints,
      requiredConcepts: [],
      question: step.prompt,
      validationPrompt: `Expected: ${step.expected.value}`,
    }
  })

  return {
    problem: scaffold.statement,
    domain: scaffold.topic,
    subdomain: scaffold.subtopic,
    concepts,
    steps,
    sanityCheck: {
      question: 'Does your answer make physical sense?',
      expectedBehavior: `The answer should be ${scaffold.finalAnswer}`,
      type: 'dimension',
    },
    finalAnswer: scaffold.finalAnswer,
    density: 3,
  }
}

/**
 * Find a local scaffold by ID or by matching problem text
 */
function findLocalScaffold(problemText: string): LocalScaffold | null {
  // First, try to find by exact or close match on statement
  const normalizedInput = problemText.toLowerCase().trim()

  for (const [id, scaffold] of Object.entries(localScaffolds)) {
    const normalizedStatement = scaffold.statement.toLowerCase().trim()

    // Exact match
    if (normalizedStatement === normalizedInput) {
      return scaffold
    }

    // Fuzzy match - check if the first 100 chars are similar
    const inputPrefix = normalizedInput.slice(0, 100)
    const statementPrefix = normalizedStatement.slice(0, 100)

    // Check if they share enough common words (simple similarity)
    const inputWords = new Set(inputPrefix.split(/\s+/).filter(w => w.length > 3))
    const statementWords = new Set(statementPrefix.split(/\s+/).filter(w => w.length > 3))
    const intersection = [...inputWords].filter(w => statementWords.has(w))

    if (intersection.length >= Math.min(inputWords.size, statementWords.size) * 0.7) {
      return scaffold
    }
  }

  return null
}

/**
 * Get a scaffold by question ID directly
 */
export function getLocalScaffoldById(questionId: string): ScaffoldData | null {
  const scaffold = localScaffolds[questionId]
  if (scaffold) {
    return localScaffoldToScaffoldData(scaffold)
  }
  return null
}

/**
 * Fetches a question from the Question Engine and converts it to ScaffoldData.
 * First checks local scaffold cache for instant response on known questions.
 */
export async function resolveWithQuestionEngine(
  problemText: string,
  options?: {
    topic?: string
    subtopic?: string
    userId?: string
    questionId?: string
  }
): Promise<{ success: true; data: ScaffoldData; source: 'local' | 'api' } | { success: false; error: string }> {
  // First, check local scaffold cache by question ID
  if (options?.questionId) {
    const localScaffold = getLocalScaffoldById(options.questionId)
    if (localScaffold) {
      console.log('[Question Engine] Using local scaffold for', options.questionId)
      return { success: true, data: localScaffold, source: 'local' }
    }
  }

  // Then, try to find by matching problem text
  const matchingScaffold = findLocalScaffold(problemText)
  if (matchingScaffold) {
    console.log('[Question Engine] Found matching local scaffold')
    return { success: true, data: localScaffoldToScaffoldData(matchingScaffold), source: 'local' }
  }

  // Fall back to API call
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
    return { success: true, data: scaffoldData, source: 'api' }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}
