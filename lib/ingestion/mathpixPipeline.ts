/**
 * Phase 3: Mathpix Ingestion Pipeline
 *
 * Safe, auditable pipeline for processing PDF uploads via Mathpix OCR.
 *
 * INVARIANTS (data that must NEVER be modified):
 * - RawExtraction.rawLatex
 * - RawExtraction.rawText
 * - RawExtraction.mathpixJobId
 * - RawExtraction.sourceUri
 * - RawExtraction.sourcePageNumber
 * - RawExtraction.confidence
 * - RawExtraction.extractedAt
 * - RawExtraction.extractedBy
 */

import { prisma } from '@/lib/db'
import { ExtractionStatus, Prisma } from '@prisma/client'

// =============================================================================
// PIPELINE STAGES
// =============================================================================

/**
 * Pipeline stages (linear progression):
 *
 * Stage 1: UPLOAD
 *   - User uploads PDF
 *   - File stored in blob storage
 *   - Job record created
 *
 * Stage 2: OCR
 *   - PDF sent to Mathpix
 *   - Raw LaTeX/text received
 *   - Stored as immutable RawExtraction
 *
 * Stage 3: SEGMENTATION
 *   - Raw content parsed for question boundaries
 *   - Multiple questions extracted per page
 *   - Each segment linked to source page
 *
 * Stage 4: NORMALIZATION
 *   - LaTeX cleaned and standardized
 *   - Variables normalized
 *   - Images extracted and stored
 *
 * Stage 5: DRAFT_CREATION
 *   - Draft Question records created
 *   - Linked to RawExtraction
 *   - Ready for review
 *
 * Stage 6: REVIEW (manual)
 *   - Human reviews draft
 *   - Edits, approves, or rejects
 *   - NO auto-publish
 */

export enum PipelineStage {
  UPLOAD = 1,
  OCR = 2,
  SEGMENTATION = 3,
  NORMALIZATION = 4,
  DRAFT_CREATION = 5,
  REVIEW = 6,
}

export interface PipelineJob {
  id: string
  sourceUri: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  currentStage: PipelineStage
  createdAt: Date
  updatedAt: Date
  error?: string
}

export interface StageOutput {
  stage: PipelineStage
  startedAt: Date
  completedAt?: Date
  success: boolean
  output?: unknown
  error?: string
}

// =============================================================================
// STORAGE LAYOUT
// =============================================================================

/**
 * Storage structure:
 *
 * /uploads/
 *   /{jobId}/
 *     /source.pdf              <- Original PDF (immutable)
 *     /mathpix_response.json   <- Raw Mathpix output (immutable)
 *     /pages/
 *       /page_001.json         <- Per-page extraction
 *       /page_002.json
 *     /segments/
 *       /segment_001.json      <- Individual questions
 *       /segment_002.json
 *     /images/
 *       /img_001.png           <- Extracted figures
 *       /img_002.png
 *     /metadata.json           <- Job metadata
 */

export interface StorageLayout {
  basePath: string
  sourcePdf: string
  mathpixResponse: string
  pagesDir: string
  segmentsDir: string
  imagesDir: string
  metadata: string
}

export function getStorageLayout(jobId: string): StorageLayout {
  const basePath = `/uploads/${jobId}`
  return {
    basePath,
    sourcePdf: `${basePath}/source.pdf`,
    mathpixResponse: `${basePath}/mathpix_response.json`,
    pagesDir: `${basePath}/pages`,
    segmentsDir: `${basePath}/segments`,
    imagesDir: `${basePath}/images`,
    metadata: `${basePath}/metadata.json`,
  }
}

// =============================================================================
// EXTRACTION RECORD MANAGEMENT
// =============================================================================

export interface CreateExtractionParams {
  mathpixJobId: string
  sourceUri: string
  sourcePageNumber?: number
  rawLatex: string
  rawText?: string
  confidence: number
  extractedBy: string
  pipelineVersion: string
}

/**
 * Create an immutable extraction record
 *
 * IMPORTANT: Once created, rawLatex, rawText, and source fields
 * MUST NEVER be modified.
 */
export async function createExtraction(
  params: CreateExtractionParams
): Promise<string> {
  const extraction = await prisma.rawExtraction.create({
    data: {
      mathpixJobId: params.mathpixJobId,
      sourceUri: params.sourceUri,
      sourcePageNumber: params.sourcePageNumber,
      rawLatex: params.rawLatex,
      rawText: params.rawText,
      confidence: params.confidence,
      extractedAt: new Date(),
      extractedBy: params.extractedBy,
      pipelineVersion: params.pipelineVersion,
      status: ExtractionStatus.processing,
      currentStage: PipelineStage.OCR,
    },
  })
  return extraction.id
}

/**
 * Update extraction status (safe - does not modify immutable fields)
 */
export async function updateExtractionStatus(
  extractionId: string,
  status: ExtractionStatus,
  stage: PipelineStage,
  stageOutput?: unknown
): Promise<void> {
  // Get current stage outputs
  const extraction = await prisma.rawExtraction.findUnique({
    where: { id: extractionId },
    select: { stageOutputs: true },
  })

  const currentOutputs = (extraction?.stageOutputs as unknown as StageOutput[]) || []
  const newOutput: StageOutput = {
    stage,
    startedAt: new Date(),
    completedAt: new Date(),
    success: status !== ExtractionStatus.failed,
    output: stageOutput,
  }

  await prisma.rawExtraction.update({
    where: { id: extractionId },
    data: {
      status,
      currentStage: stage,
      stageOutputs: [...currentOutputs, newOutput] as unknown as Prisma.InputJsonValue,
    },
  })
}

/**
 * Mark extraction as rejected (does not delete)
 */
export async function rejectExtraction(
  extractionId: string,
  reason: string
): Promise<void> {
  await prisma.rawExtraction.update({
    where: { id: extractionId },
    data: {
      status: ExtractionStatus.rejected,
      rejectionReason: reason,
    },
  })
}

/**
 * Link extraction to a created question
 */
export async function linkExtractionToQuestion(
  extractionId: string,
  questionId: string
): Promise<void> {
  await prisma.rawExtraction.update({
    where: { id: extractionId },
    data: {
      questionId,
      status: ExtractionStatus.completed,
    },
  })
}

// =============================================================================
// FAILURE HANDLING
// =============================================================================

export interface FailureRecord {
  extractionId: string
  stage: PipelineStage
  error: string
  timestamp: Date
  retryCount: number
  lastRetryAt?: Date
}

/**
 * Handle stage failure with retry logic
 */
export async function handleStageFailure(
  extractionId: string,
  stage: PipelineStage,
  error: string
): Promise<{ shouldRetry: boolean; nextRetryDelay: number }> {
  const extraction = await prisma.rawExtraction.findUnique({
    where: { id: extractionId },
    select: { stageOutputs: true },
  })

  const outputs = (extraction?.stageOutputs as unknown as StageOutput[]) || []
  const stageFailures = outputs.filter(
    o => o.stage === stage && !o.success
  ).length

  // Max 3 retries per stage
  const maxRetries = 3
  const shouldRetry = stageFailures < maxRetries

  // Exponential backoff: 1min, 5min, 15min
  const delays = [60000, 300000, 900000]
  const nextRetryDelay = delays[Math.min(stageFailures, delays.length - 1)]

  // Record failure
  await updateExtractionStatus(
    extractionId,
    shouldRetry ? ExtractionStatus.processing : ExtractionStatus.failed,
    stage,
    { error, retryCount: stageFailures + 1 }
  )

  return { shouldRetry, nextRetryDelay }
}

/**
 * Get all failed extractions for manual review
 */
export async function getFailedExtractions(): Promise<{
  id: string
  mathpixJobId: string
  sourceUri: string
  currentStage: number
  error?: string
}[]> {
  const failed = await prisma.rawExtraction.findMany({
    where: { status: ExtractionStatus.failed },
    select: {
      id: true,
      mathpixJobId: true,
      sourceUri: true,
      currentStage: true,
      stageOutputs: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return failed.map(f => {
    const outputs = (f.stageOutputs as unknown as StageOutput[]) || []
    const lastFailure = outputs.filter(o => !o.success).pop()
    return {
      id: f.id,
      mathpixJobId: f.mathpixJobId,
      sourceUri: f.sourceUri,
      currentStage: f.currentStage,
      error: lastFailure?.error as string | undefined,
    }
  })
}

// =============================================================================
// REVIEW WORKFLOW
// =============================================================================

export interface ReviewTask {
  extractionId: string
  mathpixJobId: string
  sourceUri: string
  pageNumber?: number
  rawLatex: string
  rawText?: string
  confidence: number
  status: ExtractionStatus
  linkedQuestionId?: string
}

/**
 * Get extractions pending review
 */
export async function getReviewQueue(): Promise<ReviewTask[]> {
  const pending = await prisma.rawExtraction.findMany({
    where: {
      status: ExtractionStatus.needs_review,
    },
    select: {
      id: true,
      mathpixJobId: true,
      sourceUri: true,
      sourcePageNumber: true,
      rawLatex: true,
      rawText: true,
      confidence: true,
      status: true,
      questionId: true,
    },
    orderBy: { createdAt: 'asc' },
    take: 50,
  })

  return pending.map(p => ({
    extractionId: p.id,
    mathpixJobId: p.mathpixJobId,
    sourceUri: p.sourceUri,
    pageNumber: p.sourcePageNumber || undefined,
    rawLatex: p.rawLatex,
    rawText: p.rawText || undefined,
    confidence: p.confidence,
    status: p.status,
    linkedQuestionId: p.questionId || undefined,
  }))
}

/**
 * Approve an extraction and create draft question
 *
 * NOTE: This creates a DRAFT question, not an approved one.
 * Human must explicitly promote to approved state.
 */
export async function approveExtraction(
  extractionId: string,
  questionPayload: unknown,
  reviewerId: string
): Promise<string> {
  // Create draft question
  const question = await prisma.question.create({
    data: {
      questionId: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      difficulty: 5, // Default, to be adjusted in review
      payload: questionPayload as any,
      lifecycleState: 'draft', // NEVER auto-publish
      provenance: 'mathpix',
    },
  })

  // Link extraction to question
  await prisma.rawExtraction.update({
    where: { id: extractionId },
    data: {
      questionId: question.id,
      status: ExtractionStatus.accepted,
    },
  })

  return question.id
}

// =============================================================================
// IMMUTABLE DATA GUARANTEES
// =============================================================================

/**
 * Fields that MUST NEVER be modified after creation:
 *
 * RawExtraction:
 * - mathpixJobId: Unique identifier from Mathpix
 * - sourceUri: Original file location
 * - sourcePageNumber: Page in source document
 * - rawLatex: Raw OCR output (LaTeX)
 * - rawText: Raw OCR output (plain text)
 * - confidence: OCR confidence score
 * - extractedAt: Timestamp of extraction
 * - extractedBy: User/system that initiated extraction
 *
 * These fields are the audit trail. Any transformation must
 * create new records, never modify these.
 */

export const IMMUTABLE_FIELDS = [
  'mathpixJobId',
  'sourceUri',
  'sourcePageNumber',
  'rawLatex',
  'rawText',
  'confidence',
  'extractedAt',
  'extractedBy',
] as const

/**
 * Validate that an update does not modify immutable fields
 */
export function validateUpdate(
  updateData: Record<string, unknown>
): { valid: boolean; violatedFields: string[] } {
  const violatedFields = IMMUTABLE_FIELDS.filter(
    field => field in updateData
  )
  return {
    valid: violatedFields.length === 0,
    violatedFields,
  }
}
