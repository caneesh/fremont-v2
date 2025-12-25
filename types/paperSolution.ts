/**
 * Paper Solution Upload + AI Feedback Types
 *
 * This module defines all types for the handwritten solution upload,
 * OCR extraction, and Socratic feedback features.
 */

// ============================================================================
// IMAGE UPLOAD TYPES
// ============================================================================

export interface ImageUpload {
  id: string                          // Unique ID (uuid)
  file: File | null                   // Original file (client-side only)
  url: string                         // Object URL (client) or storage URL (server)
  thumbnailUrl?: string               // Compressed thumbnail for gallery
  originalFilename: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/heic' | 'image/webp'
  sizeBytes: number
  dimensions: {
    width: number
    height: number
  }
  rotation: 0 | 90 | 180 | 270        // Applied rotation
  cropRegion?: CropRegion             // If cropped
  uploadedAt: string                  // ISO timestamp
  status: 'pending' | 'uploading' | 'uploaded' | 'failed'
  uploadProgress?: number             // 0-100
  errorMessage?: string
}

export interface CropRegion {
  x: number      // Top-left x (percentage 0-100)
  y: number      // Top-left y (percentage 0-100)
  width: number  // Width (percentage)
  height: number // Height (percentage)
}

export interface SolutionUpload {
  id: string                          // Unique submission ID
  problemId: string                   // Links to problem attempt
  stepId: number | null               // null = full problem upload
  images: ImageUpload[]               // 1-5 images
  createdAt: string
  updatedAt: string
  status: 'draft' | 'extracting' | 'extracted' | 'analyzing' | 'complete'
  analyzeRequested: boolean           // false = "just store" mode
}

// ============================================================================
// OCR EXTRACTION TYPES
// ============================================================================

export interface ExtractionResult {
  id: string
  uploadId: string                    // Links to SolutionUpload
  rawText: string                     // Unprocessed OCR output
  cleanedText: string                 // Normalized: whitespace, code blocks
  formattedText: string               // With markdown code blocks, etc.
  overallConfidence: number           // 0-1, weighted average
  regions: ExtractedRegion[]          // Per-region breakdown
  detectedLanguages: string[]         // e.g., ["en", "math"]
  processingTimeMs: number
  ocrProvider: 'claude-vision' | 'google-vision' | 'tesseract'
  extractedAt: string
}

export interface ExtractedRegion {
  id: string
  imageId: string                     // Which image this came from
  pageNumber: number                  // 1-indexed
  boundingBox: BoundingBox
  text: string
  confidence: number                  // 0-1
  type: RegionType
  needsConfirmation: boolean          // Show to user if confidence < threshold
  alternatives?: string[]             // Other possible interpretations
}

export interface BoundingBox {
  x: number       // Top-left x (pixels)
  y: number       // Top-left y (pixels)
  width: number   // Width (pixels)
  height: number  // Height (pixels)
}

export type RegionType =
  | 'text'           // Regular prose
  | 'equation'       // Mathematical equation
  | 'code'           // Code-like syntax
  | 'diagram'        // Detected diagram (not extractable)
  | 'table'          // Tabular data
  | 'list'           // Bulleted/numbered list
  | 'unknown'

// User edits to extracted text
export interface ExtractionEdit {
  id: string
  extractionId: string
  originalText: string
  editedText: string
  editedAt: string
  editType: 'correction' | 'addition' | 'deletion' | 'confirmation'
  regionId?: string                   // If editing a specific region
}

// ============================================================================
// ANALYSIS / FEEDBACK TYPES
// ============================================================================

export type AnalysisStatus = 'pass' | 'partial' | 'fail' | 'unclear'

export interface AnalysisResult {
  id: string
  uploadId: string
  extractionId: string
  stepId: number | null
  status: AnalysisStatus

  // Structured feedback
  summary: string                     // 1-2 sentence overall assessment
  correctElements: FeedbackPoint[]    // What they did right
  firstIssue: IssueDetail | null      // The ONE thing to focus on (null if pass)
  socraticNudge: string               // Guiding question
  suggestedAction: string             // Concrete next step

  // Confidence indicators
  analysisConfidence: number          // 0-1, how sure we are
  ocrUncertaintyImpact: boolean       // Did low OCR confidence affect analysis?
  clarificationNeeded?: ClarificationRequest[]

  // Metadata
  analyzedAt: string
  processingTimeMs: number
  modelUsed: string
  promptTokens: number
  completionTokens: number
}

export interface FeedbackPoint {
  text: string                        // The feedback message
  relatedRegionId?: string            // Link to image region (for highlighting)
  conceptId?: string                  // Related concept from scaffold
}

export interface IssueDetail {
  title: string                       // Short label (e.g., "Wrong collision type")
  description: string                 // What's wrong
  whyItMatters: string               // Conceptual importance
  relatedRegionId?: string            // Where in the image
  misconceptionType?: MisconceptionType
}

export type MisconceptionType =
  | 'formula_misapplication'
  | 'sign_error'
  | 'unit_error'
  | 'assumption_error'
  | 'incomplete_reasoning'
  | 'wrong_principle'
  | 'calculation_error'
  | 'notation_confusion'
  | 'boundary_condition'
  | 'other'

export interface ClarificationRequest {
  regionId: string
  question: string                    // "Did you mean X or Y?"
  options?: string[]                  // Multiple choice
  freeformAllowed: boolean
}

// ============================================================================
// STEP RUBRIC TYPES (for analysis context)
// ============================================================================

export interface StepRubric {
  stepId: number
  stepTitle: string
  objective: string                   // What this step should accomplish
  requiredElements: string[]          // Concepts/equations that must appear
  commonMistakes: string[]            // Known pitfalls to check for
  acceptanceCriteria: string          // What constitutes "complete"
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

// POST /api/paper-solution/upload
export interface UploadImagesRequest {
  problemId: string
  stepId: number | null
  images: {
    base64Data: string                // Base64-encoded image
    filename: string
    mimeType: string
  }[]
}

export interface UploadImagesResponse {
  uploadId: string
  images: {
    id: string
    url: string
    thumbnailUrl: string
  }[]
  _quota?: {
    paperUploadsRemaining: number
    dailyLimit: number
  }
}

// POST /api/paper-solution/extract
export interface ExtractTextRequest {
  uploadId: string
  imageIds?: string[]                 // Subset of images (optional)
  enhanceForMath?: boolean            // Extra processing for equations
  preferredLanguage?: string          // Hint for OCR
}

export interface ExtractTextResponse {
  extractionId: string
  rawText: string
  cleanedText: string
  overallConfidence: number
  lowConfidenceRegions: {
    regionId: string
    text: string
    confidence: number
    alternatives: string[]
  }[]
  processingTimeMs: number
}

// POST /api/paper-solution/analyze
export interface AnalyzeSolutionRequest {
  extractionId: string
  finalText: string                   // User-confirmed/edited text
  stepId: number | null
  stepRubric: StepRubric
  problemContext: {
    problemText: string
    domain: string
    subdomain: string
    relevantConcepts: string[]
  }
  previousFeedback?: string           // For revision attempts
}

export interface AnalyzeSolutionResponse {
  analysisId: string
  status: AnalysisStatus
  summary: string
  correctElements: string[]
  firstIssue: {
    title: string
    description: string
    whyItMatters: string
  } | null
  socraticNudge: string
  suggestedAction: string
  analysisConfidence: number
  clarificationNeeded: boolean
  clarifications?: {
    question: string
    options: string[]
  }[]
}

// GET /api/paper-solution/:id
export interface GetPaperSolutionResponse {
  upload: SolutionUpload
  extraction: ExtractionResult | null
  analysis: AnalysisResult | null
  editHistory: ExtractionEdit[]
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export type PaperUploadStep =
  | 'idle'
  | 'capturing'
  | 'uploading'
  | 'preview'
  | 'extracting'
  | 'editing'
  | 'confirming'      // Confirming low-confidence regions
  | 'analyzing'
  | 'feedback'
  | 'revising'

export interface PaperUploadState {
  step: PaperUploadStep
  uploadId: string | null
  images: ImageUpload[]
  extractionResult: ExtractionResult | null
  editedText: string
  analysisResult: AnalyzeSolutionResponse | null
  analyzeMode: boolean                // true = analyze, false = just store
  error: string | null
  isProcessing: boolean
}

// ============================================================================
// STORAGE SCHEMA EXTENSION
// ============================================================================

// Extension to existing StepProgress type
export interface StepProgressWithPaper {
  stepId: number
  isCompleted: boolean
  userAnswer?: string                 // Typed answer (existing)
  paperSolutionId?: string            // Link to paper submission (new)
  submissionMethod: 'typed' | 'paper' | 'both'
}

// Extension to existing ProblemProgress type
export interface ProblemProgressWithPaper {
  problemText: string
  stepProgress: StepProgressWithPaper[]
  sanityCheckAnswer?: string
  currentStep: number
  reflectionAnswers?: import('./history').ReflectionAnswer[]
  paperSolutions?: {                  // New: all paper submissions
    [key: string]: string             // stepId (or 'full') -> uploadId
  }
}
