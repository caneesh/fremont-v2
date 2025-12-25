'use client'

import { useState } from 'react'
import type { ImageUpload } from '@/types/paperSolution'

interface ImagePreviewGalleryProps {
  images: ImageUpload[]
  maxImages: number
  onRemove: (imageId: string) => void
  onRotate: (imageId: string) => void
  onAddMore: () => void
  onContinue: () => void
  isProcessing: boolean
}

export default function ImagePreviewGallery({
  images,
  maxImages,
  onRemove,
  onRotate,
  onAddMore,
  onContinue,
  isProcessing,
}: ImagePreviewGalleryProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  const canAddMore = images.length < maxImages

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
          Uploaded Images ({images.length} of {maxImages})
        </h4>
        {canAddMore && (
          <button
            onClick={onAddMore}
            className="text-sm text-accent hover:text-accent-strong flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add More
          </button>
        )}
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="relative aspect-[3/4] bg-gray-100 dark:bg-dark-card-soft rounded-lg overflow-hidden border border-gray-200 dark:border-dark-border group"
          >
            {/* Page number badge */}
            <div className="absolute top-1 left-1 z-10 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
              {index + 1}
            </div>

            {/* Image */}
            <img
              src={image.url}
              alt={`Page ${index + 1}`}
              className="w-full h-full object-cover cursor-pointer transition-transform"
              style={{ transform: `rotate(${image.rotation}deg)` }}
              onClick={() => setExpandedImage(image.id)}
            />

            {/* Controls overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => onRotate(image.id)}
                  className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                  title="Rotate"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  onClick={() => onRemove(image.id)}
                  className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-colors"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Continue button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onContinue}
          disabled={isProcessing || images.length === 0}
          className="px-5 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-strong disabled:bg-gray-300 dark:disabled:bg-dark-card-soft disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Processing...
            </>
          ) : (
            <>
              Extract Text from Images
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          )}
        </button>
      </div>

      {/* Expanded image modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={images.find(i => i.id === expandedImage)?.url}
              alt="Expanded view"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              style={{
                transform: `rotate(${images.find(i => i.id === expandedImage)?.rotation || 0}deg)`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
