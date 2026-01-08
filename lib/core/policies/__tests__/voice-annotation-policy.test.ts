/**
 * Voice Annotation Policy Tests
 *
 * Tests for deterministic validation and management of voice-annotated code reviews.
 */

import { describe, it, expect } from 'vitest'
import {
  validateLineRange,
  validateVoiceDuration,
  validateTextComment,
  validateAnnotationContent,
  validateAnnotation,
  canAddAnnotation,
  addAnnotation,
  removeAnnotation,
  updateAnnotation,
  validateVoiceUpload,
  createPeerReview,
  canSubmitReview,
  submitReview,
  acknowledgeReview,
  setRating,
  setOverallComment,
  setOverallVoice,
  getAnnotationById,
  getAnnotationsForRange,
  getVoiceAnnotations,
  getTextOnlyAnnotations,
  calculateTotalVoiceDuration,
  getReviewStats,
  sortAnnotationsByLine,
  findOverlappingAnnotations,
  getConsentText,
  createAnnotation,
  VOICE_ANNOTATION_POLICY,
  EXTENDED_VOICE_POLICY,
} from '../voice-annotation-policy'
import type { VoiceAnnotation, PeerReviewWithVoice } from '@/types/voiceAnnotations'

// Helper to create annotation
function createTestAnnotation(overrides?: Partial<VoiceAnnotation>): VoiceAnnotation {
  return {
    id: 'ann-1',
    reviewId: 'review-1',
    startLine: 1,
    endLine: 5,
    textComment: 'This is a test comment that is long enough',
    createdAt: new Date().toISOString(),
    createdBy: 'user-1',
    ...overrides,
  }
}

// Helper to create review
function createTestReview(overrides?: Partial<PeerReviewWithVoice>): PeerReviewWithVoice {
  return {
    id: 'review-1',
    submissionId: 'sub-1',
    reviewerId: 'reviewer-1',
    annotations: [],
    rating: 4,
    status: 'draft',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('validateLineRange', () => {
  it('should accept valid line range', () => {
    const result = validateLineRange(1, 10)
    expect(result.valid).toBe(true)
  })

  it('should accept single line range', () => {
    const result = validateLineRange(5, 5)
    expect(result.valid).toBe(true)
  })

  it('should reject non-integer line numbers', () => {
    const result = validateLineRange(1.5, 10)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('integers')
  })

  it('should reject start line below minimum', () => {
    const result = validateLineRange(0, 10)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('at least')
  })

  it('should reject end line before start line', () => {
    const result = validateLineRange(10, 5)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('>=')
  })

  it('should reject end line beyond max lines', () => {
    const result = validateLineRange(1, 100, 50)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('exceeds')
  })

  it('should accept end line at max lines', () => {
    const result = validateLineRange(1, 50, 50)
    expect(result.valid).toBe(true)
  })
})

describe('validateVoiceDuration', () => {
  it('should accept valid duration', () => {
    const result = validateVoiceDuration(10)
    expect(result.valid).toBe(true)
  })

  it('should accept minimum duration', () => {
    const result = validateVoiceDuration(EXTENDED_VOICE_POLICY.MIN_DURATION_SECONDS)
    expect(result.valid).toBe(true)
  })

  it('should accept maximum duration', () => {
    const result = validateVoiceDuration(VOICE_ANNOTATION_POLICY.MAX_DURATION_SECONDS)
    expect(result.valid).toBe(true)
  })

  it('should reject duration below minimum', () => {
    const result = validateVoiceDuration(0.5)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('at least')
  })

  it('should reject duration above maximum', () => {
    const result = validateVoiceDuration(20)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('exceeds')
  })

  it('should reject NaN', () => {
    const result = validateVoiceDuration(NaN)
    expect(result.valid).toBe(false)
  })
})

describe('validateTextComment', () => {
  it('should accept undefined comment', () => {
    const result = validateTextComment(undefined)
    expect(result.valid).toBe(true)
  })

  it('should accept empty string', () => {
    const result = validateTextComment('')
    expect(result.valid).toBe(true)
  })

  it('should accept valid comment', () => {
    const result = validateTextComment('This is a valid comment that meets the minimum length')
    expect(result.valid).toBe(true)
  })

  it('should reject too short comment', () => {
    const result = validateTextComment('short')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('at least')
  })

  it('should reject too long comment', () => {
    const result = validateTextComment('a'.repeat(501))
    expect(result.valid).toBe(false)
    expect(result.error).toContain('exceeds')
  })
})

describe('validateAnnotationContent', () => {
  it('should accept text comment only', () => {
    const result = validateAnnotationContent('This is a comment', undefined)
    expect(result.valid).toBe(true)
  })

  it('should accept voice only', () => {
    const result = validateAnnotationContent(undefined, 'https://example.com/voice.webm')
    expect(result.valid).toBe(true)
  })

  it('should accept both text and voice', () => {
    const result = validateAnnotationContent('Comment', 'https://example.com/voice.webm')
    expect(result.valid).toBe(true)
  })

  it('should reject neither text nor voice', () => {
    const result = validateAnnotationContent(undefined, undefined)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('either text or voice')
  })

  it('should reject empty text without voice', () => {
    const result = validateAnnotationContent('', undefined)
    expect(result.valid).toBe(false)
  })
})

describe('validateAnnotation', () => {
  it('should accept valid annotation with text', () => {
    const annotation = createTestAnnotation()
    const result = validateAnnotation(annotation)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should accept valid annotation with voice', () => {
    const annotation = createTestAnnotation({
      textComment: undefined,
      voiceUrl: 'https://example.com/voice.webm',
      durationSec: 10,
    })
    const result = validateAnnotation(annotation)
    expect(result.valid).toBe(true)
  })

  it('should collect multiple errors', () => {
    const annotation = {
      id: 'ann-1',
      reviewId: 'review-1',
      startLine: 0, // Invalid
      endLine: -1, // Invalid
      durationSec: 100, // Invalid
      createdAt: new Date().toISOString(),
      createdBy: 'user-1',
      // No content - invalid
    }
    const result = validateAnnotation(annotation)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })

  it('should require start and end lines', () => {
    const result = validateAnnotation({})
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('required'))).toBe(true)
  })
})

describe('canAddAnnotation', () => {
  it('should allow adding to draft review', () => {
    const review = createTestReview()
    const result = canAddAnnotation(review)
    expect(result.canAdd).toBe(true)
  })

  it('should reject adding to submitted review', () => {
    const review = createTestReview({ status: 'submitted' })
    const result = canAddAnnotation(review)
    expect(result.canAdd).toBe(false)
    expect(result.reason).toContain('submitted')
  })

  it('should reject adding to acknowledged review', () => {
    const review = createTestReview({ status: 'acknowledged' })
    const result = canAddAnnotation(review)
    expect(result.canAdd).toBe(false)
  })

  it('should reject when max annotations reached', () => {
    const annotations = Array(VOICE_ANNOTATION_POLICY.MAX_ANNOTATIONS_PER_REVIEW)
      .fill(null)
      .map((_, i) => createTestAnnotation({ id: `ann-${i}` }))
    const review = createTestReview({ annotations })

    const result = canAddAnnotation(review)
    expect(result.canAdd).toBe(false)
    expect(result.reason).toContain('Maximum')
  })
})

describe('addAnnotation', () => {
  it('should add annotation to review', () => {
    const review = createTestReview()
    const annotation = createTestAnnotation()

    const updated = addAnnotation(review, annotation)

    expect(updated.annotations).toHaveLength(1)
    expect(updated.annotations[0].id).toBe('ann-1')
  })

  it('should preserve existing annotations', () => {
    const review = createTestReview({
      annotations: [createTestAnnotation({ id: 'existing' })],
    })
    const annotation = createTestAnnotation({ id: 'new' })

    const updated = addAnnotation(review, annotation)

    expect(updated.annotations).toHaveLength(2)
  })
})

describe('removeAnnotation', () => {
  it('should remove annotation from review', () => {
    const review = createTestReview({
      annotations: [
        createTestAnnotation({ id: 'ann-1' }),
        createTestAnnotation({ id: 'ann-2' }),
      ],
    })

    const updated = removeAnnotation(review, 'ann-1')

    expect(updated.annotations).toHaveLength(1)
    expect(updated.annotations[0].id).toBe('ann-2')
  })

  it('should handle non-existent annotation', () => {
    const review = createTestReview({
      annotations: [createTestAnnotation({ id: 'ann-1' })],
    })

    const updated = removeAnnotation(review, 'non-existent')

    expect(updated.annotations).toHaveLength(1)
  })
})

describe('updateAnnotation', () => {
  it('should update annotation text', () => {
    const review = createTestReview({
      annotations: [createTestAnnotation({ id: 'ann-1', textComment: 'Original comment here' })],
    })

    const updated = updateAnnotation(review, 'ann-1', { textComment: 'Updated comment here' })

    expect(updated.annotations[0].textComment).toBe('Updated comment here')
  })

  it('should update annotation voice', () => {
    const review = createTestReview({
      annotations: [createTestAnnotation({ id: 'ann-1' })],
    })

    const updated = updateAnnotation(review, 'ann-1', {
      voiceUrl: 'https://new-voice.webm',
      durationSec: 5,
    })

    expect(updated.annotations[0].voiceUrl).toBe('https://new-voice.webm')
    expect(updated.annotations[0].durationSec).toBe(5)
  })

  it('should not modify other annotations', () => {
    const review = createTestReview({
      annotations: [
        createTestAnnotation({ id: 'ann-1', textComment: 'Comment 1 here' }),
        createTestAnnotation({ id: 'ann-2', textComment: 'Comment 2 here' }),
      ],
    })

    const updated = updateAnnotation(review, 'ann-1', { textComment: 'Updated' })

    expect(updated.annotations[1].textComment).toBe('Comment 2 here')
  })
})

describe('validateVoiceUpload', () => {
  it('should accept valid upload', () => {
    const result = validateVoiceUpload({
      reviewId: 'review-1',
      durationSec: 10,
      fileSize: 1024 * 1024, // 1MB
      mimeType: 'audio/webm',
    })

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject too long duration', () => {
    const result = validateVoiceUpload({
      reviewId: 'review-1',
      durationSec: 30,
      fileSize: 1024 * 1024,
      mimeType: 'audio/webm',
    })

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('exceeds'))).toBe(true)
  })

  it('should reject too large file', () => {
    const result = validateVoiceUpload({
      reviewId: 'review-1',
      durationSec: 10,
      fileSize: 5 * 1024 * 1024, // 5MB
      mimeType: 'audio/webm',
    })

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('size'))).toBe(true)
  })

  it('should reject invalid format', () => {
    const result = validateVoiceUpload({
      reviewId: 'review-1',
      durationSec: 10,
      fileSize: 1024 * 1024,
      mimeType: 'audio/wav',
    })

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('not allowed'))).toBe(true)
  })

  it('should collect multiple errors', () => {
    const result = validateVoiceUpload({
      reviewId: 'review-1',
      durationSec: 30,
      fileSize: 5 * 1024 * 1024,
      mimeType: 'audio/wav',
    })

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBe(3)
  })
})

describe('createPeerReview', () => {
  it('should create review with initial values', () => {
    const review = createPeerReview('rev-1', 'sub-1', 'reviewer-1')

    expect(review.id).toBe('rev-1')
    expect(review.submissionId).toBe('sub-1')
    expect(review.reviewerId).toBe('reviewer-1')
    expect(review.annotations).toHaveLength(0)
    expect(review.rating).toBe(0)
    expect(review.status).toBe('draft')
  })

  it('should set createdAt timestamp', () => {
    const review = createPeerReview('rev-1', 'sub-1', 'reviewer-1')

    expect(review.createdAt).toBeDefined()
    expect(new Date(review.createdAt).getTime()).toBeGreaterThan(0)
  })
})

describe('canSubmitReview', () => {
  it('should allow valid review submission', () => {
    const review = createTestReview({
      annotations: [createTestAnnotation()],
      rating: 4,
    })

    const result = canSubmitReview(review)

    expect(result.canSubmit).toBe(true)
    expect(result.blockers).toHaveLength(0)
  })

  it('should block already submitted review', () => {
    const review = createTestReview({ status: 'submitted' })

    const result = canSubmitReview(review)

    expect(result.canSubmit).toBe(false)
    expect(result.blockers.some(b => b.includes('already'))).toBe(true)
  })

  it('should require at least one annotation', () => {
    const review = createTestReview({ annotations: [] })

    const result = canSubmitReview(review)

    expect(result.canSubmit).toBe(false)
    expect(result.blockers.some(b => b.includes('annotation'))).toBe(true)
  })

  it('should require valid rating', () => {
    const review = createTestReview({
      annotations: [createTestAnnotation()],
      rating: 0,
    })

    const result = canSubmitReview(review)

    expect(result.canSubmit).toBe(false)
    expect(result.blockers.some(b => b.includes('Rating'))).toBe(true)
  })
})

describe('submitReview', () => {
  it('should change status to submitted', () => {
    const review = createTestReview()

    const submitted = submitReview(review)

    expect(submitted.status).toBe('submitted')
  })

  it('should set submittedAt timestamp', () => {
    const review = createTestReview()

    const submitted = submitReview(review)

    expect(submitted.submittedAt).toBeDefined()
  })
})

describe('acknowledgeReview', () => {
  it('should change status to acknowledged', () => {
    const review = createTestReview({ status: 'submitted' })

    const acknowledged = acknowledgeReview(review)

    expect(acknowledged.status).toBe('acknowledged')
  })
})

describe('setRating', () => {
  it('should set valid rating', () => {
    const review = createTestReview()

    const { review: updated, error } = setRating(review, 5)

    expect(updated.rating).toBe(5)
    expect(error).toBeUndefined()
  })

  it('should reject rating below minimum', () => {
    const review = createTestReview()

    const { review: updated, error } = setRating(review, 0)

    expect(updated.rating).toBe(4) // Unchanged
    expect(error).toContain('between')
  })

  it('should reject rating above maximum', () => {
    const review = createTestReview()

    const { error } = setRating(review, 6)

    expect(error).toContain('between')
  })
})

describe('setOverallComment', () => {
  it('should set overall comment', () => {
    const review = createTestReview()

    const updated = setOverallComment(review, 'Great work overall!')

    expect(updated.overallComment).toBe('Great work overall!')
  })
})

describe('setOverallVoice', () => {
  it('should set overall voice URL', () => {
    const review = createTestReview()

    const updated = setOverallVoice(review, 'https://example.com/overall.webm')

    expect(updated.overallVoiceUrl).toBe('https://example.com/overall.webm')
  })
})

describe('getAnnotationById', () => {
  it('should find annotation by ID', () => {
    const review = createTestReview({
      annotations: [
        createTestAnnotation({ id: 'ann-1' }),
        createTestAnnotation({ id: 'ann-2' }),
      ],
    })

    const annotation = getAnnotationById(review, 'ann-2')

    expect(annotation?.id).toBe('ann-2')
  })

  it('should return undefined for non-existent ID', () => {
    const review = createTestReview()

    const annotation = getAnnotationById(review, 'non-existent')

    expect(annotation).toBeUndefined()
  })
})

describe('getAnnotationsForRange', () => {
  it('should find annotations overlapping range', () => {
    const review = createTestReview({
      annotations: [
        createTestAnnotation({ id: 'ann-1', startLine: 1, endLine: 5 }),
        createTestAnnotation({ id: 'ann-2', startLine: 10, endLine: 15 }),
        createTestAnnotation({ id: 'ann-3', startLine: 3, endLine: 8 }),
      ],
    })

    const annotations = getAnnotationsForRange(review, 4, 6)

    expect(annotations).toHaveLength(2) // ann-1 and ann-3
    expect(annotations.some(a => a.id === 'ann-1')).toBe(true)
    expect(annotations.some(a => a.id === 'ann-3')).toBe(true)
  })

  it('should return empty for non-overlapping range', () => {
    const review = createTestReview({
      annotations: [createTestAnnotation({ startLine: 1, endLine: 5 })],
    })

    const annotations = getAnnotationsForRange(review, 10, 15)

    expect(annotations).toHaveLength(0)
  })
})

describe('getVoiceAnnotations', () => {
  it('should return only voice annotations', () => {
    const review = createTestReview({
      annotations: [
        createTestAnnotation({ id: 'text-only', voiceUrl: undefined }),
        createTestAnnotation({ id: 'voice', voiceUrl: 'https://example.com/voice.webm' }),
      ],
    })

    const voiceAnnotations = getVoiceAnnotations(review)

    expect(voiceAnnotations).toHaveLength(1)
    expect(voiceAnnotations[0].id).toBe('voice')
  })
})

describe('getTextOnlyAnnotations', () => {
  it('should return only text annotations', () => {
    const review = createTestReview({
      annotations: [
        createTestAnnotation({ id: 'text-only', textComment: 'Comment here', voiceUrl: undefined }),
        createTestAnnotation({ id: 'voice', voiceUrl: 'https://example.com/voice.webm', textComment: undefined }),
      ],
    })

    const textAnnotations = getTextOnlyAnnotations(review)

    expect(textAnnotations).toHaveLength(1)
    expect(textAnnotations[0].id).toBe('text-only')
  })
})

describe('calculateTotalVoiceDuration', () => {
  it('should sum all voice durations', () => {
    const review = createTestReview({
      annotations: [
        createTestAnnotation({ durationSec: 5 }),
        createTestAnnotation({ durationSec: 10 }),
        createTestAnnotation({ durationSec: 3 }),
      ],
    })

    const total = calculateTotalVoiceDuration(review)

    expect(total).toBe(18)
  })

  it('should handle missing durations', () => {
    const review = createTestReview({
      annotations: [
        createTestAnnotation({ durationSec: 5 }),
        createTestAnnotation({ durationSec: undefined }),
      ],
    })

    const total = calculateTotalVoiceDuration(review)

    expect(total).toBe(5)
  })
})

describe('getReviewStats', () => {
  it('should calculate all statistics', () => {
    const review = createTestReview({
      annotations: [
        createTestAnnotation({ id: 'a1', startLine: 1, endLine: 3, voiceUrl: 'url', durationSec: 5 }),
        createTestAnnotation({ id: 'a2', startLine: 5, endLine: 7, voiceUrl: undefined, textComment: 'Text here' }),
      ],
      overallComment: 'Overall feedback',
      overallVoiceUrl: 'https://overall.webm',
    })

    const stats = getReviewStats(review)

    expect(stats.totalAnnotations).toBe(2)
    expect(stats.voiceAnnotations).toBe(1)
    expect(stats.textOnlyAnnotations).toBe(1)
    expect(stats.totalVoiceDuration).toBe(5)
    expect(stats.linesAnnotated).toBe(6) // Lines 1-3, 5-7
    expect(stats.hasOverallComment).toBe(true)
    expect(stats.hasOverallVoice).toBe(true)
  })
})

describe('sortAnnotationsByLine', () => {
  it('should sort by start line', () => {
    const annotations = [
      createTestAnnotation({ id: 'a1', startLine: 10 }),
      createTestAnnotation({ id: 'a2', startLine: 5 }),
      createTestAnnotation({ id: 'a3', startLine: 15 }),
    ]

    const sorted = sortAnnotationsByLine(annotations)

    expect(sorted[0].startLine).toBe(5)
    expect(sorted[1].startLine).toBe(10)
    expect(sorted[2].startLine).toBe(15)
  })

  it('should sort by end line when start lines equal', () => {
    const annotations = [
      createTestAnnotation({ id: 'a1', startLine: 5, endLine: 10 }),
      createTestAnnotation({ id: 'a2', startLine: 5, endLine: 7 }),
    ]

    const sorted = sortAnnotationsByLine(annotations)

    expect(sorted[0].endLine).toBe(7)
    expect(sorted[1].endLine).toBe(10)
  })
})

describe('findOverlappingAnnotations', () => {
  it('should find overlapping annotations', () => {
    const annotations = [
      createTestAnnotation({ id: 'a1', startLine: 1, endLine: 10 }),
      createTestAnnotation({ id: 'a2', startLine: 5, endLine: 15 }),
    ]

    const overlaps = findOverlappingAnnotations(annotations)

    expect(overlaps).toHaveLength(1)
    expect(overlaps[0].annotation1).toBe('a1')
    expect(overlaps[0].annotation2).toBe('a2')
    expect(overlaps[0].overlapLines).toEqual([5, 6, 7, 8, 9, 10])
  })

  it('should return empty for non-overlapping', () => {
    const annotations = [
      createTestAnnotation({ id: 'a1', startLine: 1, endLine: 5 }),
      createTestAnnotation({ id: 'a2', startLine: 10, endLine: 15 }),
    ]

    const overlaps = findOverlappingAnnotations(annotations)

    expect(overlaps).toHaveLength(0)
  })

  it('should find multiple overlaps', () => {
    const annotations = [
      createTestAnnotation({ id: 'a1', startLine: 1, endLine: 10 }),
      createTestAnnotation({ id: 'a2', startLine: 5, endLine: 15 }),
      createTestAnnotation({ id: 'a3', startLine: 8, endLine: 12 }),
    ]

    const overlaps = findOverlappingAnnotations(annotations)

    expect(overlaps.length).toBe(3) // a1-a2, a1-a3, a2-a3
  })
})

describe('getConsentText', () => {
  it('should return consent text with policy values', () => {
    const text = getConsentText()

    expect(text).toContain(String(VOICE_ANNOTATION_POLICY.MAX_DURATION_SECONDS))
    expect(text).toContain(String(VOICE_ANNOTATION_POLICY.MAX_ANNOTATIONS_PER_REVIEW))
    expect(text).toContain('consent')
    expect(text).toContain('voice')
  })
})

describe('createAnnotation', () => {
  it('should create annotation with required fields', () => {
    const annotation = createAnnotation('ann-1', 'review-1', 1, 10, 'user-1')

    expect(annotation.id).toBe('ann-1')
    expect(annotation.reviewId).toBe('review-1')
    expect(annotation.startLine).toBe(1)
    expect(annotation.endLine).toBe(10)
    expect(annotation.createdBy).toBe('user-1')
    expect(annotation.createdAt).toBeDefined()
  })

  it('should create annotation with optional fields', () => {
    const annotation = createAnnotation('ann-1', 'review-1', 1, 10, 'user-1', {
      textComment: 'Comment',
      voiceUrl: 'https://voice.webm',
      durationSec: 5,
    })

    expect(annotation.textComment).toBe('Comment')
    expect(annotation.voiceUrl).toBe('https://voice.webm')
    expect(annotation.durationSec).toBe(5)
  })
})

describe('VOICE_ANNOTATION_POLICY', () => {
  it('should have valid duration limit', () => {
    expect(VOICE_ANNOTATION_POLICY.MAX_DURATION_SECONDS).toBeGreaterThan(0)
    expect(VOICE_ANNOTATION_POLICY.MAX_DURATION_SECONDS).toBeLessThanOrEqual(60)
  })

  it('should have valid annotation limit', () => {
    expect(VOICE_ANNOTATION_POLICY.MAX_ANNOTATIONS_PER_REVIEW).toBeGreaterThan(0)
  })

  it('should have valid file size limit', () => {
    expect(VOICE_ANNOTATION_POLICY.MAX_FILE_SIZE_MB).toBeGreaterThan(0)
  })

  it('should have allowed formats', () => {
    expect(VOICE_ANNOTATION_POLICY.ALLOWED_FORMATS.length).toBeGreaterThan(0)
    expect(VOICE_ANNOTATION_POLICY.ALLOWED_FORMATS.every(f => f.startsWith('audio/'))).toBe(true)
  })
})

describe('EXTENDED_VOICE_POLICY', () => {
  it('should have valid text comment limits', () => {
    expect(EXTENDED_VOICE_POLICY.MIN_TEXT_COMMENT_LENGTH).toBeGreaterThan(0)
    expect(EXTENDED_VOICE_POLICY.MAX_TEXT_COMMENT_LENGTH).toBeGreaterThan(
      EXTENDED_VOICE_POLICY.MIN_TEXT_COMMENT_LENGTH
    )
  })

  it('should have valid rating range', () => {
    expect(EXTENDED_VOICE_POLICY.MIN_RATING).toBeGreaterThan(0)
    expect(EXTENDED_VOICE_POLICY.MAX_RATING).toBeGreaterThan(EXTENDED_VOICE_POLICY.MIN_RATING)
  })

  it('should have matching file size in bytes', () => {
    expect(EXTENDED_VOICE_POLICY.MAX_FILE_SIZE_BYTES).toBe(
      VOICE_ANNOTATION_POLICY.MAX_FILE_SIZE_MB * 1024 * 1024
    )
  })
})
