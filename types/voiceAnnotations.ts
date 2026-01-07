/**
 * Voice-Annotated Code Reviews Types (PhaseC_01)
 *
 * Allow reviewers to attach short voice notes to code ranges.
 */

/**
 * Extended peer review annotation with voice support
 */
export interface VoiceAnnotation {
  readonly id: string
  readonly reviewId: string
  readonly startLine: number
  readonly endLine: number
  readonly textComment?: string
  readonly voiceUrl?: string
  readonly durationSec?: number
  readonly createdAt: string
  readonly createdBy: string
}

/**
 * Voice annotation validation result
 */
export interface VoiceAnnotationValidation {
  readonly valid: boolean
  readonly errors: readonly string[]
}

/**
 * Peer review with voice annotations
 */
export interface PeerReviewWithVoice {
  readonly id: string
  readonly submissionId: string
  readonly reviewerId: string
  readonly annotations: readonly VoiceAnnotation[]
  readonly overallComment?: string
  readonly overallVoiceUrl?: string
  readonly rating: number
  readonly status: 'draft' | 'submitted' | 'acknowledged'
  readonly createdAt: string
  readonly submittedAt?: string
}

/**
 * Voice upload request
 */
export interface VoiceUploadRequest {
  readonly reviewId: string
  readonly annotationId?: string
  readonly blob: Blob
  readonly durationSec: number
}

/**
 * Voice upload result
 */
export interface VoiceUploadResult {
  readonly success: boolean
  readonly voiceUrl?: string
  readonly error?: string
}

// Policy constants
export const VOICE_ANNOTATION_POLICY = {
  MAX_DURATION_SECONDS: 15,
  MAX_ANNOTATIONS_PER_REVIEW: 10,
  MIN_LINE_NUMBER: 1,
  MAX_FILE_SIZE_MB: 2,
  ALLOWED_FORMATS: ['audio/webm', 'audio/mp4', 'audio/ogg'],
} as const

// Event types
export type VoiceAnnotationEventType =
  | 'voice_recording_started'
  | 'voice_recording_completed'
  | 'voice_annotation_added'
  | 'voice_annotation_played'
  | 'voice_review_submitted'
