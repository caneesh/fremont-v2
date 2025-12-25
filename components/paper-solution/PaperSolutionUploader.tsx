'use client'

import { useState, useRef, useCallback } from 'react'
import { authenticatedFetch } from '@/lib/api/apiClient'
import ImagePreviewGallery from './ImagePreviewGallery'
import ExtractedTextEditor from './ExtractedTextEditor'
import HandwritingFeedbackPanel from './HandwritingFeedbackPanel'
import type {
  PaperUploadState,
  PaperUploadStep,
  ImageUpload,
  ExtractTextResponse,
  AnalyzeSolutionResponse,
  StepRubric,
} from '@/types/paperSolution'
import { v4 as uuidv4 } from 'uuid'

interface PaperSolutionUploaderProps {
  stepId: number
  stepTitle: string
  stepObjective: string
  requiredElements: string[]
  commonMistakes: string[]
  problemText: string
  domain: string
  subdomain: string
  relevantConcepts: string[]
  onExtractedTextChange?: (text: string) => void
  onAnalysisComplete?: (feedback: AnalyzeSolutionResponse) => void
  className?: string
}

const MAX_IMAGES = 5
const MAX_SIZE_MB = 10
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp']

export default function PaperSolutionUploader({
  stepId,
  stepTitle,
  stepObjective,
  requiredElements,
  commonMistakes,
  problemText,
  domain,
  subdomain,
  relevantConcepts,
  onExtractedTextChange,
  onAnalysisComplete,
  className = '',
}: PaperSolutionUploaderProps) {
  const [state, setState] = useState<PaperUploadState>({
    step: 'idle',
    uploadId: null,
    images: [],
    extractionResult: null,
    editedText: '',
    analysisResult: null,
    analyzeMode: true,
    error: null,
    isProcessing: false,
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList) => {
    const newImages: ImageUpload[] = []

    for (let i = 0; i < Math.min(files.length, MAX_IMAGES - state.images.length); i++) {
      const file = files[i]

      // Validate type
      if (!ALLOWED_TYPES.includes(file.type)) {
        setState(prev => ({ ...prev, error: `Invalid file type: ${file.name}` }))
        continue
      }

      // Validate size
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setState(prev => ({ ...prev, error: `File too large: ${file.name} (max ${MAX_SIZE_MB}MB)` }))
        continue
      }

      // Create image upload object
      const imageId = uuidv4()
      const objectUrl = URL.createObjectURL(file)

      newImages.push({
        id: imageId,
        file,
        url: objectUrl,
        thumbnailUrl: objectUrl,
        originalFilename: file.name,
        mimeType: file.type as ImageUpload['mimeType'],
        sizeBytes: file.size,
        dimensions: { width: 0, height: 0 }, // Will be set after load
        rotation: 0,
        uploadedAt: new Date().toISOString(),
        status: 'pending',
      })
    }

    if (newImages.length > 0) {
      setState(prev => ({
        ...prev,
        step: 'preview',
        images: [...prev.images, ...newImages],
        error: null,
      }))
    }
  }, [state.images.length])

  // Open file picker
  const handleChooseFiles = () => {
    fileInputRef.current?.click()
  }

  // Open camera
  const handleTakePhoto = () => {
    cameraInputRef.current?.click()
  }

  // Remove image
  const handleRemoveImage = (imageId: string) => {
    setState(prev => {
      const newImages = prev.images.filter(img => img.id !== imageId)
      return {
        ...prev,
        images: newImages,
        step: newImages.length === 0 ? 'idle' : 'preview',
      }
    })
  }

  // Rotate image
  const handleRotateImage = (imageId: string) => {
    setState(prev => ({
      ...prev,
      images: prev.images.map(img =>
        img.id === imageId
          ? { ...img, rotation: ((img.rotation + 90) % 360) as ImageUpload['rotation'] }
          : img
      ),
    }))
  }

  // Convert file to base64 (without prefix, for upload API)
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Convert file to full data URL (with prefix, for extract API)
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve(reader.result as string)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Extract text from images
  const handleExtractText = async () => {
    if (state.images.length === 0) return

    setState(prev => ({ ...prev, step: 'extracting', isProcessing: true, error: null }))

    try {
      // First, upload images
      const uploadData = await Promise.all(
        state.images.map(async img => ({
          base64Data: img.file ? await fileToBase64(img.file) : '',
          filename: img.originalFilename,
          mimeType: img.mimeType,
        }))
      )

      // Upload to get uploadId
      const uploadResponse = await authenticatedFetch('/api/paper-solution/upload', {
        method: 'POST',
        body: JSON.stringify({
          problemId: `problem_${stepId}`,
          stepId,
          images: uploadData,
        }),
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload images')
      }

      const uploadResult = await uploadResponse.json()
      setState(prev => ({ ...prev, uploadId: uploadResult.uploadId }))

      // Now extract text
      // Convert files to proper data URLs (blob: URLs don't work server-side)
      const dataUrls = await Promise.all(
        state.images.map(img => img.file ? fileToDataUrl(img.file) : Promise.resolve(''))
      )
      // Use '|' as delimiter since data URLs contain commas
      const dataUrlsHeader = dataUrls.filter(Boolean).join('|')

      const extractResponse = await authenticatedFetch('/api/paper-solution/extract', {
        method: 'POST',
        headers: {
          'x-image-data': dataUrlsHeader,
        },
        body: JSON.stringify({
          uploadId: uploadResult.uploadId,
          imageIds: uploadResult.images.map((i: { id: string }) => i.id),
          enhanceForMath: true,
        }),
      })

      if (!extractResponse.ok) {
        throw new Error('Failed to extract text')
      }

      const extractResult: ExtractTextResponse = await extractResponse.json()

      setState(prev => ({
        ...prev,
        step: 'editing',
        extractionResult: {
          id: extractResult.extractionId,
          uploadId: uploadResult.uploadId,
          rawText: extractResult.rawText,
          cleanedText: extractResult.cleanedText,
          formattedText: extractResult.cleanedText,
          overallConfidence: extractResult.overallConfidence,
          regions: [],
          detectedLanguages: ['en'],
          processingTimeMs: extractResult.processingTimeMs,
          ocrProvider: 'claude-vision',
          extractedAt: new Date().toISOString(),
        },
        editedText: extractResult.cleanedText,
        isProcessing: false,
      }))

      onExtractedTextChange?.(extractResult.cleanedText)
    } catch (error) {
      setState(prev => ({
        ...prev,
        step: 'preview',
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Extraction failed',
      }))
    }
  }

  // Analyze the solution
  const handleAnalyze = async () => {
    if (!state.extractionResult || !state.editedText) return

    setState(prev => ({ ...prev, step: 'analyzing', isProcessing: true, error: null }))

    try {
      const rubric: StepRubric = {
        stepId,
        stepTitle,
        objective: stepObjective,
        requiredElements,
        commonMistakes,
        acceptanceCriteria: `Complete all of: ${requiredElements.join(', ')}`,
      }

      const analyzeResponse = await authenticatedFetch('/api/paper-solution/analyze', {
        method: 'POST',
        body: JSON.stringify({
          extractionId: state.extractionResult.id,
          finalText: state.editedText,
          stepId,
          stepRubric: rubric,
          problemContext: {
            problemText,
            domain,
            subdomain,
            relevantConcepts,
          },
        }),
      })

      if (!analyzeResponse.ok) {
        throw new Error('Failed to analyze solution')
      }

      const analysisResult: AnalyzeSolutionResponse = await analyzeResponse.json()

      setState(prev => ({
        ...prev,
        step: 'feedback',
        analysisResult,
        isProcessing: false,
      }))

      onAnalysisComplete?.(analysisResult)
    } catch (error) {
      setState(prev => ({
        ...prev,
        step: 'editing',
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      }))
    }
  }

  // Handle text edit
  const handleTextChange = (newText: string) => {
    setState(prev => ({ ...prev, editedText: newText }))
    onExtractedTextChange?.(newText)
  }

  // Toggle analyze mode
  const handleToggleAnalyzeMode = () => {
    setState(prev => ({ ...prev, analyzeMode: !prev.analyzeMode }))
  }

  // Reset to start
  const handleReset = () => {
    // Revoke object URLs
    state.images.forEach(img => {
      if (img.url.startsWith('blob:')) {
        URL.revokeObjectURL(img.url)
      }
    })

    setState({
      step: 'idle',
      uploadId: null,
      images: [],
      extractionResult: null,
      editedText: '',
      analysisResult: null,
      analyzeMode: true,
      error: null,
      isProcessing: false,
    })
  }

  // Revise solution (upload new image)
  const handleRevise = () => {
    setState(prev => ({
      ...prev,
      step: 'idle',
      images: [],
      analysisResult: null,
    }))
  }

  return (
    <div className={`paper-solution-uploader ${className}`}>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/webp"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
      />

      {/* Error display */}
      {state.error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {state.error}
          <button
            onClick={() => setState(prev => ({ ...prev, error: null }))}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* IDLE STATE - Show upload options */}
      {state.step === 'idle' && (
        <div className="border-2 border-dashed border-gray-300 dark:border-dark-border rounded-lg p-6 text-center">
          <div className="mb-4">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 dark:text-dark-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-dark-text-secondary mb-4">
            Solved on paper? Upload your work
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleTakePhoto}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-strong flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Take Photo
            </button>
            <button
              onClick={handleChooseFiles}
              className="px-4 py-2 bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card-soft flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Choose Files
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-3">
            Supports: JPG, PNG, HEIC, WebP • Max {MAX_IMAGES} images • {MAX_SIZE_MB}MB each
          </p>
        </div>
      )}

      {/* PREVIEW STATE - Show image gallery */}
      {state.step === 'preview' && (
        <ImagePreviewGallery
          images={state.images}
          maxImages={MAX_IMAGES}
          onRemove={handleRemoveImage}
          onRotate={handleRotateImage}
          onAddMore={handleChooseFiles}
          onContinue={handleExtractText}
          isProcessing={state.isProcessing}
        />
      )}

      {/* EXTRACTING STATE - Show progress */}
      {state.step === 'extracting' && (
        <div className="p-6 bg-blue-50 dark:bg-accent/10 border border-blue-200 dark:border-accent/30 rounded-lg text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-blue-800 dark:text-accent font-medium">
            Extracting text from your handwriting...
          </p>
          <p className="text-sm text-blue-600 dark:text-dark-text-secondary mt-2">
            This may take a few seconds
          </p>
        </div>
      )}

      {/* EDITING STATE - Show extracted text with editor */}
      {state.step === 'editing' && state.extractionResult && (
        <ExtractedTextEditor
          extractionResult={state.extractionResult}
          editedText={state.editedText}
          onTextChange={handleTextChange}
          analyzeMode={state.analyzeMode}
          onToggleAnalyzeMode={handleToggleAnalyzeMode}
          onAnalyze={handleAnalyze}
          onBack={handleReset}
          isProcessing={state.isProcessing}
        />
      )}

      {/* ANALYZING STATE - Show progress */}
      {state.step === 'analyzing' && (
        <div className="p-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-500/30 rounded-lg text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 dark:border-purple-400 mx-auto mb-4"></div>
          <p className="text-purple-800 dark:text-purple-400 font-medium">
            Analyzing your solution...
          </p>
          <p className="text-sm text-purple-600 dark:text-dark-text-secondary mt-2">
            Checking your work against the step objectives
          </p>
        </div>
      )}

      {/* FEEDBACK STATE - Show analysis results */}
      {state.step === 'feedback' && state.analysisResult && (
        <HandwritingFeedbackPanel
          stepTitle={stepTitle}
          feedback={state.analysisResult}
          onRevise={handleRevise}
          onEditText={() => setState(prev => ({ ...prev, step: 'editing' }))}
          onContinue={handleReset}
        />
      )}
    </div>
  )
}
