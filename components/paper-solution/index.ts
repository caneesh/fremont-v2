/**
 * Paper Solution Upload Components
 *
 * This module provides components for uploading, extracting,
 * and analyzing handwritten physics solutions.
 */

export { default as PaperSolutionUploader } from './PaperSolutionUploader'
export { default as ImagePreviewGallery } from './ImagePreviewGallery'
export { default as ExtractedTextEditor } from './ExtractedTextEditor'
export { default as HandwritingFeedbackPanel } from './HandwritingFeedbackPanel'

// Re-export types for convenience
export type {
  PaperUploadState,
  PaperUploadStep,
  ImageUpload,
  ExtractionResult,
  AnalysisResult,
  AnalyzeSolutionResponse,
  StepRubric,
} from '@/types/paperSolution'
