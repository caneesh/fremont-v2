/**
 * Voice Annotation Policy
 *
 * Deterministic validation and management for voice-annotated code reviews.
 * Reviewers can attach short voice notes (<=15s) to code ranges.
 */

import type {
  VoiceAnnotation,
  VoiceAnnotationValidation,
  PeerReviewWithVoice,
  VoiceUploadRequest,
  VoiceUploadResult,
} from '@/types/voiceAnnotations'
import { VOICE_ANNOTATION_POLICY } from '@/types/voiceAnnotations'

// Re-export policy constants
export { VOICE_ANNOTATION_POLICY }

/**
 * Extended policy constants
 */
export const EXTENDED_VOICE_POLICY = {
  // Text comment requirements
  MIN_TEXT_COMMENT_LENGTH: 10,
  MAX_TEXT_COMMENT_LENGTH: 500,
  // Review requirements
  MIN_ANNOTATIONS_FOR_COMPLETE: 1,
  MIN_RATING: 1,
  MAX_RATING: 5,
  // Voice quality
  MIN_DURATION_SECONDS: 1,
  // File size in bytes
  MAX_FILE_SIZE_BYTES: VOICE_ANNOTATION_POLICY.MAX_FILE_SIZE_MB * 1024 * 1024,
} as const

/**
 * Validate line range - DETERMINISTIC
 */
export function validateLineRange(
  startLine: number,
  endLine: number,
  maxLines?: number
): { valid: boolean; error?: string } {
  if (!Number.isInteger(startLine) || !Number.isInteger(endLine)) {
    return { valid: false, error: 'Line numbers must be integers' }
  }

  if (startLine < VOICE_ANNOTATION_POLICY.MIN_LINE_NUMBER) {
    return { valid: false, error: `Start line must be at least ${VOICE_ANNOTATION_POLICY.MIN_LINE_NUMBER}` }
  }

  if (endLine < startLine) {
    return { valid: false, error: 'End line must be >= start line' }
  }

  if (maxLines && endLine > maxLines) {
    return { valid: false, error: `End line exceeds file length (${maxLines} lines)` }
  }

  return { valid: true }
}

/**
 * Validate voice duration - DETERMINISTIC
 */
export function validateVoiceDuration(durationSec: number): { valid: boolean; error?: string } {
  if (typeof durationSec !== 'number' || isNaN(durationSec)) {
    return { valid: false, error: 'Duration must be a number' }
  }

  if (durationSec < EXTENDED_VOICE_POLICY.MIN_DURATION_SECONDS) {
    return { valid: false, error: `Recording must be at least ${EXTENDED_VOICE_POLICY.MIN_DURATION_SECONDS} second` }
  }

  if (durationSec > VOICE_ANNOTATION_POLICY.MAX_DURATION_SECONDS) {
    return { valid: false, error: `Recording exceeds ${VOICE_ANNOTATION_POLICY.MAX_DURATION_SECONDS} second limit` }
  }

  return { valid: true }
}

/**
 * Validate text comment - DETERMINISTIC
 */
export function validateTextComment(comment: string | undefined): { valid: boolean; error?: string } {
  if (comment === undefined || comment === '') {
    return { valid: true } // Text is optional
  }

  if (comment.length < EXTENDED_VOICE_POLICY.MIN_TEXT_COMMENT_LENGTH) {
    return { valid: false, error: `Comment must be at least ${EXTENDED_VOICE_POLICY.MIN_TEXT_COMMENT_LENGTH} characters` }
  }

  if (comment.length > EXTENDED_VOICE_POLICY.MAX_TEXT_COMMENT_LENGTH) {
    return { valid: false, error: `Comment exceeds ${EXTENDED_VOICE_POLICY.MAX_TEXT_COMMENT_LENGTH} character limit` }
  }

  return { valid: true }
}

/**
 * Validate annotation has content - DETERMINISTIC
 */
export function validateAnnotationContent(
  textComment: string | undefined,
  voiceUrl: string | undefined
): { valid: boolean; error?: string } {
  const hasText = textComment && textComment.trim().length > 0
  const hasVoice = voiceUrl && voiceUrl.length > 0

  if (!hasText && !hasVoice) {
    return { valid: false, error: 'Annotation must have either text or voice content' }
  }

  return { valid: true }
}

/**
 * Validate complete annotation - DETERMINISTIC
 */
export function validateAnnotation(
  annotation: Partial<VoiceAnnotation>,
  maxLines?: number
): VoiceAnnotationValidation {
  const errors: string[] = []

  // Validate line range
  if (annotation.startLine !== undefined && annotation.endLine !== undefined) {
    const lineResult = validateLineRange(annotation.startLine, annotation.endLine, maxLines)
    if (!lineResult.valid && lineResult.error) {
      errors.push(lineResult.error)
    }
  } else {
    errors.push('Start and end lines are required')
  }

  // Validate voice duration if present
  if (annotation.durationSec !== undefined) {
    const durationResult = validateVoiceDuration(annotation.durationSec)
    if (!durationResult.valid && durationResult.error) {
      errors.push(durationResult.error)
    }
  }

  // Validate text comment if present
  if (annotation.textComment !== undefined) {
    const textResult = validateTextComment(annotation.textComment)
    if (!textResult.valid && textResult.error) {
      errors.push(textResult.error)
    }
  }

  // Validate content exists
  const contentResult = validateAnnotationContent(annotation.textComment, annotation.voiceUrl)
  if (!contentResult.valid && contentResult.error) {
    errors.push(contentResult.error)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Check if can add annotation to review - DETERMINISTIC
 */
export function canAddAnnotation(
  review: PeerReviewWithVoice
): { canAdd: boolean; reason?: string } {
  if (review.status === 'submitted' || review.status === 'acknowledged') {
    return { canAdd: false, reason: 'Cannot modify submitted review' }
  }

  if (review.annotations.length >= VOICE_ANNOTATION_POLICY.MAX_ANNOTATIONS_PER_REVIEW) {
    return {
      canAdd: false,
      reason: `Maximum ${VOICE_ANNOTATION_POLICY.MAX_ANNOTATIONS_PER_REVIEW} annotations allowed`,
    }
  }

  return { canAdd: true }
}

/**
 * Add annotation to review - DETERMINISTIC
 */
export function addAnnotation(
  review: PeerReviewWithVoice,
  annotation: VoiceAnnotation
): PeerReviewWithVoice {
  return {
    ...review,
    annotations: [...review.annotations, annotation],
  }
}

/**
 * Remove annotation from review - DETERMINISTIC
 */
export function removeAnnotation(
  review: PeerReviewWithVoice,
  annotationId: string
): PeerReviewWithVoice {
  return {
    ...review,
    annotations: review.annotations.filter(a => a.id !== annotationId),
  }
}

/**
 * Update annotation in review - DETERMINISTIC
 */
export function updateAnnotation(
  review: PeerReviewWithVoice,
  annotationId: string,
  updates: Partial<Pick<VoiceAnnotation, 'textComment' | 'voiceUrl' | 'durationSec'>>
): PeerReviewWithVoice {
  return {
    ...review,
    annotations: review.annotations.map(a =>
      a.id === annotationId ? { ...a, ...updates } : a
    ),
  }
}

/**
 * Validate voice upload request - DETERMINISTIC
 */
export function validateVoiceUpload(
  request: Omit<VoiceUploadRequest, 'blob'> & { fileSize: number; mimeType: string }
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check duration
  const durationResult = validateVoiceDuration(request.durationSec)
  if (!durationResult.valid && durationResult.error) {
    errors.push(durationResult.error)
  }

  // Check file size
  if (request.fileSize > EXTENDED_VOICE_POLICY.MAX_FILE_SIZE_BYTES) {
    errors.push(`File size exceeds ${VOICE_ANNOTATION_POLICY.MAX_FILE_SIZE_MB}MB limit`)
  }

  // Check format
  if (!VOICE_ANNOTATION_POLICY.ALLOWED_FORMATS.includes(request.mimeType as typeof VOICE_ANNOTATION_POLICY.ALLOWED_FORMATS[number])) {
    errors.push(`Format ${request.mimeType} not allowed. Use: ${VOICE_ANNOTATION_POLICY.ALLOWED_FORMATS.join(', ')}`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Create new review - DETERMINISTIC
 */
export function createPeerReview(
  reviewId: string,
  submissionId: string,
  reviewerId: string
): PeerReviewWithVoice {
  return {
    id: reviewId,
    submissionId,
    reviewerId,
    annotations: [],
    rating: 0,
    status: 'draft',
    createdAt: new Date().toISOString(),
  }
}

/**
 * Check if review can be submitted - DETERMINISTIC
 */
export function canSubmitReview(
  review: PeerReviewWithVoice
): { canSubmit: boolean; blockers: string[] } {
  const blockers: string[] = []

  if (review.status !== 'draft') {
    blockers.push('Review already submitted')
  }

  if (review.annotations.length < EXTENDED_VOICE_POLICY.MIN_ANNOTATIONS_FOR_COMPLETE) {
    blockers.push(`Add at least ${EXTENDED_VOICE_POLICY.MIN_ANNOTATIONS_FOR_COMPLETE} annotation`)
  }

  if (review.rating < EXTENDED_VOICE_POLICY.MIN_RATING || review.rating > EXTENDED_VOICE_POLICY.MAX_RATING) {
    blockers.push(`Rating must be between ${EXTENDED_VOICE_POLICY.MIN_RATING} and ${EXTENDED_VOICE_POLICY.MAX_RATING}`)
  }

  // Validate all annotations
  for (const annotation of review.annotations) {
    const validation = validateAnnotation(annotation)
    if (!validation.valid) {
      blockers.push(`Annotation on lines ${annotation.startLine}-${annotation.endLine}: ${validation.errors.join(', ')}`)
    }
  }

  return {
    canSubmit: blockers.length === 0,
    blockers,
  }
}

/**
 * Submit review - DETERMINISTIC
 */
export function submitReview(review: PeerReviewWithVoice): PeerReviewWithVoice {
  return {
    ...review,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
  }
}

/**
 * Acknowledge review - DETERMINISTIC
 */
export function acknowledgeReview(review: PeerReviewWithVoice): PeerReviewWithVoice {
  return {
    ...review,
    status: 'acknowledged',
  }
}

/**
 * Set review rating - DETERMINISTIC
 */
export function setRating(
  review: PeerReviewWithVoice,
  rating: number
): { review: PeerReviewWithVoice; error?: string } {
  if (rating < EXTENDED_VOICE_POLICY.MIN_RATING || rating > EXTENDED_VOICE_POLICY.MAX_RATING) {
    return {
      review,
      error: `Rating must be between ${EXTENDED_VOICE_POLICY.MIN_RATING} and ${EXTENDED_VOICE_POLICY.MAX_RATING}`,
    }
  }

  return {
    review: { ...review, rating },
  }
}

/**
 * Set overall comment - DETERMINISTIC
 */
export function setOverallComment(
  review: PeerReviewWithVoice,
  comment: string
): PeerReviewWithVoice {
  return {
    ...review,
    overallComment: comment,
  }
}

/**
 * Set overall voice URL - DETERMINISTIC
 */
export function setOverallVoice(
  review: PeerReviewWithVoice,
  voiceUrl: string
): PeerReviewWithVoice {
  return {
    ...review,
    overallVoiceUrl: voiceUrl,
  }
}

/**
 * Get annotation by ID - DETERMINISTIC
 */
export function getAnnotationById(
  review: PeerReviewWithVoice,
  annotationId: string
): VoiceAnnotation | undefined {
  return review.annotations.find(a => a.id === annotationId)
}

/**
 * Get annotations for line range - DETERMINISTIC
 */
export function getAnnotationsForRange(
  review: PeerReviewWithVoice,
  startLine: number,
  endLine: number
): VoiceAnnotation[] {
  return review.annotations.filter(a =>
    // Annotation overlaps with the range
    a.startLine <= endLine && a.endLine >= startLine
  )
}

/**
 * Get annotations with voice - DETERMINISTIC
 */
export function getVoiceAnnotations(review: PeerReviewWithVoice): VoiceAnnotation[] {
  return review.annotations.filter(a => a.voiceUrl !== undefined)
}

/**
 * Get annotations with text only - DETERMINISTIC
 */
export function getTextOnlyAnnotations(review: PeerReviewWithVoice): VoiceAnnotation[] {
  return review.annotations.filter(a => a.voiceUrl === undefined && a.textComment !== undefined)
}

/**
 * Calculate total voice duration - DETERMINISTIC
 */
export function calculateTotalVoiceDuration(review: PeerReviewWithVoice): number {
  return review.annotations.reduce((total, a) => total + (a.durationSec || 0), 0)
}

/**
 * Get review statistics - DETERMINISTIC
 */
export function getReviewStats(review: PeerReviewWithVoice): {
  totalAnnotations: number
  voiceAnnotations: number
  textOnlyAnnotations: number
  totalVoiceDuration: number
  linesAnnotated: number
  hasOverallComment: boolean
  hasOverallVoice: boolean
} {
  const voiceAnnotations = getVoiceAnnotations(review).length
  const textOnlyAnnotations = getTextOnlyAnnotations(review).length

  // Calculate unique lines annotated
  const annotatedLines = new Set<number>()
  for (const annotation of review.annotations) {
    for (let line = annotation.startLine; line <= annotation.endLine; line++) {
      annotatedLines.add(line)
    }
  }

  return {
    totalAnnotations: review.annotations.length,
    voiceAnnotations,
    textOnlyAnnotations,
    totalVoiceDuration: calculateTotalVoiceDuration(review),
    linesAnnotated: annotatedLines.size,
    hasOverallComment: review.overallComment !== undefined && review.overallComment.length > 0,
    hasOverallVoice: review.overallVoiceUrl !== undefined,
  }
}

/**
 * Sort annotations by line number - DETERMINISTIC
 */
export function sortAnnotationsByLine(annotations: readonly VoiceAnnotation[]): VoiceAnnotation[] {
  return [...annotations].sort((a, b) => {
    if (a.startLine !== b.startLine) {
      return a.startLine - b.startLine
    }
    return a.endLine - b.endLine
  })
}

/**
 * Check for overlapping annotations - DETERMINISTIC
 */
export function findOverlappingAnnotations(
  annotations: readonly VoiceAnnotation[]
): Array<{ annotation1: string; annotation2: string; overlapLines: number[] }> {
  const overlaps: Array<{ annotation1: string; annotation2: string; overlapLines: number[] }> = []

  for (let i = 0; i < annotations.length; i++) {
    for (let j = i + 1; j < annotations.length; j++) {
      const a1 = annotations[i]
      const a2 = annotations[j]

      // Check for overlap
      if (a1.startLine <= a2.endLine && a1.endLine >= a2.startLine) {
        const overlapStart = Math.max(a1.startLine, a2.startLine)
        const overlapEnd = Math.min(a1.endLine, a2.endLine)
        const overlapLines: number[] = []

        for (let line = overlapStart; line <= overlapEnd; line++) {
          overlapLines.push(line)
        }

        overlaps.push({
          annotation1: a1.id,
          annotation2: a2.id,
          overlapLines,
        })
      }
    }
  }

  return overlaps
}

/**
 * Generate consent text - DETERMINISTIC
 */
export function getConsentText(): string {
  return `By recording voice annotations, you consent to:
1. Your voice being stored and associated with this code review
2. The recipient of this review hearing your voice recording
3. Voice data being retained according to the platform's privacy policy

Voice recordings are limited to ${VOICE_ANNOTATION_POLICY.MAX_DURATION_SECONDS} seconds per annotation.
Maximum ${VOICE_ANNOTATION_POLICY.MAX_ANNOTATIONS_PER_REVIEW} voice annotations per review.`
}

/**
 * Create annotation from input - DETERMINISTIC
 */
export function createAnnotation(
  id: string,
  reviewId: string,
  startLine: number,
  endLine: number,
  createdBy: string,
  options?: {
    textComment?: string
    voiceUrl?: string
    durationSec?: number
  }
): VoiceAnnotation {
  return {
    id,
    reviewId,
    startLine,
    endLine,
    textComment: options?.textComment,
    voiceUrl: options?.voiceUrl,
    durationSec: options?.durationSec,
    createdAt: new Date().toISOString(),
    createdBy,
  }
}
