import { describe, it, expect } from 'vitest';
import {
  CONTENT_TYPE_RULES,
  decideEmbedding,
  buildRetrievalContext,
  getFailureFallback,
  createRAGMetadata,
  validateForIngestion,
} from '../ragIngestion';
import type { RAGMetadata } from '@/types/atomicLearning';

describe('ragIngestion', () => {
  describe('CONTENT_TYPE_RULES', () => {
    it('has rules for all content types', () => {
      expect(CONTENT_TYPE_RULES.authoritative_fact).toBeDefined();
      expect(CONTENT_TYPE_RULES.socratic_prompt).toBeDefined();
      expect(CONTENT_TYPE_RULES.analogy).toBeDefined();
      expect(CONTENT_TYPE_RULES.misconception_trap).toBeDefined();
      expect(CONTENT_TYPE_RULES.procedure).toBeDefined();
      expect(CONTENT_TYPE_RULES.example).toBeDefined();
    });

    it('socratic prompts are not embeddable', () => {
      expect(CONTENT_TYPE_RULES.socratic_prompt.embeddable).toBe(false);
    });

    it('authoritative facts are embeddable with high priority', () => {
      expect(CONTENT_TYPE_RULES.authoritative_fact.embeddable).toBe(true);
      expect(CONTENT_TYPE_RULES.authoritative_fact.priority).toBe(10);
    });
  });

  describe('decideEmbedding', () => {
    it('never embeds Socratic prompts', () => {
      const decision = decideEmbedding('What is the force?', 'socratic_prompt');
      expect(decision.embed).toBe(false);
      expect(decision.reason).toContain('questions');
    });

    it('embeds authoritative facts', () => {
      const decision = decideEmbedding("Newton's Third Law states...", 'authoritative_fact');
      expect(decision.embed).toBe(true);
    });

    it('embeds misconceptions with warning', () => {
      const decision = decideEmbedding('Students often think...', 'misconception_trap');
      expect(decision.embed).toBe(true);
      expect(decision.tags).toContain('misconception');
      expect(decision.exclusions).toContain('direct_use_as_fact');
    });

    it('embeds analogies with reduced priority', () => {
      const decision = decideEmbedding('Friction is like...', 'analogy');
      expect(decision.embed).toBe(true);
      expect(decision.tags).toContain('non-authoritative');
    });

    it('does not embed questions with answers', () => {
      const decision = decideEmbedding('Q: What is force? A: Push or pull', 'example', {
        isQuestion: true,
        hasAnswer: true,
      });
      expect(decision.embed).toBe(false);
    });
  });

  describe('buildRetrievalContext', () => {
    it('builds context for authoritative content', () => {
      const metadata = createRAGMetadata('authoritative_fact', ['newton', 'law']);
      const context = buildRetrievalContext('Force equals mass times acceleration', metadata);
      expect(context.confidence).toBe('high');
      expect(context.warnings).toHaveLength(0);
    });

    it('builds context for analogies with warnings', () => {
      const metadata = createRAGMetadata('analogy', ['comparison']);
      const context = buildRetrievalContext('Like a ball rolling', metadata);
      expect(context.confidence).toBe('medium');
      expect(context.warnings.length).toBeGreaterThan(0);
      expect(context.warnings.some(w => w.includes('analogy'))).toBe(true);
    });

    it('builds context for misconceptions with strong warnings', () => {
      const metadata = createRAGMetadata('misconception_trap', ['error']);
      const context = buildRetrievalContext('Common error...', metadata);
      expect(context.warnings.some(w => w.includes('MISCONCEPTION'))).toBe(true);
      expect(context.usageGuidelines.some(g => g.includes('Do not present'))).toBe(true);
    });

    it('handles uncertain content', () => {
      const metadata = createRAGMetadata('authoritative_fact', ['test'], {
        confident: false,
        fallback: 'Check textbook',
      });
      const context = buildRetrievalContext('Maybe...', metadata);
      expect(context.confidence).toBe('low');
      expect(context.usageGuidelines.some(g => g.includes('Fallback'))).toBe(true);
    });
  });

  describe('getFailureFallback', () => {
    it('returns defer for no retrieval', () => {
      const fallback = getFailureFallback('no_retrieval');
      expect(fallback.fallbackType).toBe('defer');
      expect(fallback.suggestedAction).toContain('textbook');
    });

    it('returns clarify for low confidence', () => {
      const fallback = getFailureFallback('low_confidence');
      expect(fallback.fallbackType).toBe('clarify');
    });

    it('returns redirect for misconception only', () => {
      const fallback = getFailureFallback('misconception_only');
      expect(fallback.fallbackType).toBe('redirect');
      expect(fallback.message).toContain('misconception');
    });

    it('returns clarify for ambiguous', () => {
      const fallback = getFailureFallback('ambiguous');
      expect(fallback.fallbackType).toBe('clarify');
    });
  });

  describe('createRAGMetadata', () => {
    it('creates metadata with default values', () => {
      const metadata = createRAGMetadata('authoritative_fact', ['tag1', 'tag2']);
      expect(metadata.contentType).toBe('authoritative_fact');
      expect(metadata.retrievalTags).toEqual(['tag1', 'tag2']);
      expect(metadata.embeddable).toBe(true);
      expect(metadata.uncertainty.confident).toBe(true);
    });

    it('creates metadata with custom options', () => {
      const metadata = createRAGMetadata('procedure', ['step'], {
        confident: false,
        fallback: 'Try again',
        exclusions: ['advanced'],
      });
      expect(metadata.uncertainty.confident).toBe(false);
      expect(metadata.uncertainty.fallback).toBe('Try again');
      expect(metadata.exclusions).toContain('advanced');
    });
  });

  describe('validateForIngestion', () => {
    it('validates proper authoritative content', () => {
      const metadata = createRAGMetadata('authoritative_fact', ['physics']);
      const result = validateForIngestion('Force is a vector quantity', metadata);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects Socratic prompts with answers', () => {
      const metadata = createRAGMetadata('socratic_prompt', ['question']);
      const result = validateForIngestion('The answer is 5 N', metadata);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('answers'))).toBe(true);
    });

    it('warns about formula-first content', () => {
      const metadata = createRAGMetadata('authoritative_fact', ['formula']);
      const result = validateForIngestion('F = ma', metadata);
      expect(result.warnings.some(w => w.includes('formula-first'))).toBe(true);
    });

    it('warns about missing fallback for uncertain content', () => {
      const metadata: RAGMetadata = {
        contentType: 'authoritative_fact',
        embeddable: true,
        priority: 5,
        retrievalTags: [],
        exclusions: [],
        uncertainty: { confident: false },
      };
      const result = validateForIngestion('Maybe...', metadata);
      expect(result.warnings.some(w => w.includes('fallback'))).toBe(true);
    });

    it('warns about missing retrieval tags', () => {
      const metadata = createRAGMetadata('authoritative_fact', []);
      const result = validateForIngestion('Some content', metadata);
      expect(result.warnings.some(w => w.includes('retrieval tags'))).toBe(true);
    });
  });
});
