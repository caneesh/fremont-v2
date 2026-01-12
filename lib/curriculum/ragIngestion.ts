/**
 * RAG Ingestion Rules for Socratic Physics Curriculum
 *
 * Requirements:
 * - Prevent hallucinations in definitions, laws, and reasoning
 * - Support misconception-based questioning
 * - Separate authoritative facts from Socratic questions from analogies
 * - Allow safe uncertainty handling
 */

import type {
  RAGMetadata,
  RAGContentType,
  RAGAnnotation,
  ConceptCard,
  MisconceptionCard,
  ProblemArchetype,
  SocraticTree,
  MasteryCheck,
} from '@/types/atomicLearning';

// =============================================================================
// CONTENT TYPE RULES
// =============================================================================

export interface ContentTypeRule {
  type: RAGContentType;
  embeddable: boolean;
  priority: number;
  description: string;
  examples: string[];
  warnings: string[];
}

export const CONTENT_TYPE_RULES: Record<RAGContentType, ContentTypeRule> = {
  authoritative_fact: {
    type: 'authoritative_fact',
    embeddable: true,
    priority: 10,
    description: 'Physics laws, definitions, established principles',
    examples: [
      'Newton\'s Third Law states that forces come in pairs',
      'Momentum is conserved in isolated systems',
      'Work is the dot product of force and displacement',
    ],
    warnings: [
      'Must be verifiable against standard physics texts',
      'Must not include approximations without explicit qualification',
    ],
  },
  socratic_prompt: {
    type: 'socratic_prompt',
    embeddable: false,
    priority: 5,
    description: 'Questions designed to probe understanding (not facts)',
    examples: [
      'What happens to the forces when the cart speeds up?',
      'How would you test your prediction?',
      'What assumption are you making here?',
    ],
    warnings: [
      'Must NEVER be embedded as factual content',
      'Should not be retrieved for direct answering',
    ],
  },
  analogy: {
    type: 'analogy',
    embeddable: true,
    priority: 3,
    description: 'Illustrative comparisons (non-authoritative)',
    examples: [
      'Friction is like trying to slide a book across sandpaper',
      'Electric potential is analogous to height in a gravitational field',
    ],
    warnings: [
      'Must be clearly marked as analogy',
      'Should not be used to derive conclusions',
      'Retrieve with caution flag',
    ],
  },
  misconception_trap: {
    type: 'misconception_trap',
    embeddable: true,
    priority: 7,
    description: 'Known incorrect thinking patterns',
    examples: [
      'Students often think action-reaction forces cancel',
      'Common error: confusing velocity with acceleration',
    ],
    warnings: [
      'Must be embedded with explicit "misconception" label',
      'Retrieval context must include warning',
    ],
  },
  procedure: {
    type: 'procedure',
    embeddable: true,
    priority: 6,
    description: 'Step-by-step problem-solving sequences',
    examples: [
      'To draw a FBD: 1) Identify the body, 2) List all forces, 3) Draw vectors',
      'Energy conservation approach: 1) Define system, 2) Identify states, 3) Write equation',
    ],
    warnings: [
      'Must be complete (no missing steps)',
      'Must not skip reasoning justification',
    ],
  },
  example: {
    type: 'example',
    embeddable: true,
    priority: 8,
    description: 'Worked examples showing reasoning',
    examples: [
      'Block on incline example with full solution',
      'Two-body problem example with FBD',
    ],
    warnings: [
      'Must include reasoning, not just calculation',
      'Must not be used for direct answer lookup',
    ],
  },
};

// =============================================================================
// EMBEDDING RULES
// =============================================================================

export interface EmbeddingDecision {
  embed: boolean;
  reason: string;
  priority: number;
  tags: string[];
  exclusions: string[];
}

export function decideEmbedding(
  content: string,
  contentType: RAGContentType,
  context?: { isQuestion: boolean; hasAnswer: boolean }
): EmbeddingDecision {
  const rule = CONTENT_TYPE_RULES[contentType];

  // Socratic prompts are never embedded
  if (contentType === 'socratic_prompt') {
    return {
      embed: false,
      reason: 'Socratic prompts are questions, not facts',
      priority: 0,
      tags: ['socratic', 'non-factual'],
      exclusions: ['answer_generation', 'fact_retrieval'],
    };
  }

  // Questions with answers should not be directly embedded
  if (context?.isQuestion && context?.hasAnswer) {
    return {
      embed: false,
      reason: 'Questions with answers should not be in retrieval to prevent direct lookup',
      priority: 0,
      tags: ['question_answer'],
      exclusions: ['direct_retrieval'],
    };
  }

  // Misconceptions need special handling
  if (contentType === 'misconception_trap') {
    return {
      embed: true,
      reason: 'Misconceptions are embedded for recognition, with warning labels',
      priority: rule.priority,
      tags: ['misconception', 'warning_required'],
      exclusions: ['direct_use_as_fact'],
    };
  }

  // Analogies get reduced priority
  if (contentType === 'analogy') {
    return {
      embed: true,
      reason: 'Analogies are embedded with caution flag',
      priority: rule.priority,
      tags: ['analogy', 'non-authoritative'],
      exclusions: ['derivation', 'proof'],
    };
  }

  // Standard embedding
  return {
    embed: rule.embeddable,
    reason: `Standard embedding for ${contentType}`,
    priority: rule.priority,
    tags: [contentType],
    exclusions: [],
  };
}

// =============================================================================
// RETRIEVAL CONTEXT INJECTION
// =============================================================================

export interface RetrievalContext {
  content: string;
  contentType: RAGContentType;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
  usageGuidelines: string[];
}

export function buildRetrievalContext(
  content: string,
  metadata: RAGMetadata
): RetrievalContext {
  const warnings: string[] = [];
  const usageGuidelines: string[] = [];

  // Add warnings based on content type
  if (metadata.contentType === 'analogy') {
    warnings.push('This is an analogy, not an authoritative definition');
    usageGuidelines.push('Use for illustration only, not for derivation');
  }

  if (metadata.contentType === 'misconception_trap') {
    warnings.push('This describes a MISCONCEPTION (incorrect thinking)');
    usageGuidelines.push('Do not present as correct physics');
    usageGuidelines.push('Use to recognize and address student errors');
  }

  if (!metadata.uncertainty.confident) {
    warnings.push('This content has uncertainty; verify before using');
    if (metadata.uncertainty.fallback) {
      usageGuidelines.push(`Fallback: ${metadata.uncertainty.fallback}`);
    }
  }

  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (metadata.contentType === 'analogy') confidence = 'medium';
  if (!metadata.uncertainty.confident) confidence = 'low';

  return {
    content,
    contentType: metadata.contentType,
    confidence,
    warnings,
    usageGuidelines,
  };
}

// =============================================================================
// FAILURE FALLBACK BEHAVIOR
// =============================================================================

export interface FailureFallback {
  fallbackType: 'defer' | 'clarify' | 'redirect' | 'refuse';
  message: string;
  suggestedAction?: string;
}

export function getFailureFallback(
  failureType: 'no_retrieval' | 'low_confidence' | 'misconception_only' | 'ambiguous'
): FailureFallback {
  switch (failureType) {
    case 'no_retrieval':
      return {
        fallbackType: 'defer',
        message: 'I don\'t have specific information about this in my curriculum database.',
        suggestedAction: 'Consult your textbook or ask your teacher for this specific topic.',
      };

    case 'low_confidence':
      return {
        fallbackType: 'clarify',
        message: 'I found some related information, but I\'m not fully confident it addresses your question.',
        suggestedAction: 'Can you rephrase or provide more context?',
      };

    case 'misconception_only':
      return {
        fallbackType: 'redirect',
        message: 'I notice this might involve a common misconception. Let me ask you a question first.',
        suggestedAction: 'Engage with Socratic questioning before providing information.',
      };

    case 'ambiguous':
      return {
        fallbackType: 'clarify',
        message: 'This could relate to several different concepts.',
        suggestedAction: 'Which specific aspect are you asking about?',
      };

    default:
      return {
        fallbackType: 'refuse',
        message: 'I cannot provide a reliable answer to this question.',
      };
  }
}

// =============================================================================
// CONTENT ANNOTATION
// =============================================================================

export function annotateConceptCard(card: ConceptCard): RAGAnnotation {
  const segments: RAGAnnotation['segments'] = [];

  // Target insight is authoritative
  segments.push({
    text: card.targetInsight,
    type: 'authoritative_fact',
    embeddable: true,
    confidence: 'high',
  });

  // Mental model description is authoritative
  segments.push({
    text: card.mentalModel.description,
    type: 'authoritative_fact',
    embeddable: true,
    confidence: 'high',
  });

  // Analogies are non-authoritative
  for (const analogy of card.mentalModel.analogies) {
    segments.push({
      text: analogy,
      type: 'analogy',
      embeddable: true,
      confidence: 'medium',
    });
  }

  return { contentId: card.id, segments };
}

export function annotateMisconceptionCard(card: MisconceptionCard): RAGAnnotation {
  const segments: RAGAnnotation['segments'] = [];

  // The misconception itself
  segments.push({
    text: card.misconception,
    type: 'misconception_trap',
    embeddable: true,
    confidence: 'high',
  });

  // Correct understanding is authoritative
  segments.push({
    text: card.correctUnderstanding,
    type: 'authoritative_fact',
    embeddable: true,
    confidence: 'high',
  });

  // Socratic questions are not embeddable
  for (const question of card.exposureQuestions) {
    segments.push({
      text: question,
      type: 'socratic_prompt',
      embeddable: false,
      confidence: 'high',
    });
  }

  return { contentId: card.id, segments };
}

export function annotateSocraticTree(tree: SocraticTree): RAGAnnotation {
  const segments: RAGAnnotation['segments'] = [];

  // All Socratic tree questions are non-embeddable
  for (const node of Object.values(tree.nodes)) {
    segments.push({
      text: node.question,
      type: 'socratic_prompt',
      embeddable: false,
      confidence: 'high',
    });
  }

  return { contentId: tree.id, segments };
}

// =============================================================================
// RAG METADATA CREATION
// =============================================================================

export function createRAGMetadata(
  contentType: RAGContentType,
  retrievalTags: string[],
  options?: {
    confident?: boolean;
    fallback?: string;
    exclusions?: string[];
  }
): RAGMetadata {
  const rule = CONTENT_TYPE_RULES[contentType];

  return {
    contentType,
    embeddable: rule.embeddable,
    priority: rule.priority,
    retrievalTags,
    exclusions: options?.exclusions ?? [],
    uncertainty: {
      confident: options?.confident ?? true,
      fallback: options?.fallback,
    },
  };
}

// =============================================================================
// INGESTION VALIDATION
// =============================================================================

export interface IngestionValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateForIngestion(
  content: string,
  metadata: RAGMetadata
): IngestionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for direct answers in Socratic prompts
  if (metadata.contentType === 'socratic_prompt') {
    if (content.includes('The answer is') || content.includes('Therefore,')) {
      errors.push('Socratic prompts must not contain direct answers');
    }
  }

  // Check for formula-first content
  if (metadata.contentType === 'authoritative_fact') {
    // Simple heuristic: if it starts with an equation, it might be formula-first
    if (/^[A-Za-z]\s*=/.test(content.trim())) {
      warnings.push('Content may be formula-first; consider adding conceptual framing');
    }
  }

  // Check for missing uncertainty handling
  if (!metadata.uncertainty.confident && !metadata.uncertainty.fallback) {
    warnings.push('Low-confidence content should have a fallback defined');
  }

  // Check for missing retrieval tags
  if (metadata.retrievalTags.length === 0) {
    warnings.push('Content has no retrieval tags; it may not be findable');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
