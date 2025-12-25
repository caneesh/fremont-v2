import { NextRequest, NextResponse } from 'next/server'
import { validateAuthHeader, unauthorizedResponse, quotaExceededResponse } from '@/lib/auth/apiAuth'
import { serverQuotaService } from '@/lib/auth/serverQuotaService'
import { v4 as uuidv4 } from 'uuid'
import type { UploadImagesRequest, UploadImagesResponse, ImageUpload } from '@/types/paperSolution'

// Maximum image size: 10MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024
// Maximum images per upload: 5
const MAX_IMAGES = 5
// Allowed MIME types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp']
// Daily paper upload limit
const DAILY_PAPER_UPLOAD_LIMIT = 20

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authContext = validateAuthHeader(request)
    if (!authContext) {
      return unauthorizedResponse()
    }

    // Check quota for paper uploads
    if (!serverQuotaService.checkQuota(authContext.userId, 'paperUploads')) {
      return quotaExceededResponse('paper solution uploads', DAILY_PAPER_UPLOAD_LIMIT)
    }

    const body: UploadImagesRequest = await request.json()
    const { problemId, stepId, images } = body

    // Validation
    if (!problemId || typeof problemId !== 'string') {
      return NextResponse.json(
        { error: 'Problem ID is required' },
        { status: 400 }
      )
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'At least one image is required' },
        { status: 400 }
      )
    }

    if (images.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_IMAGES} images allowed per upload` },
        { status: 400 }
      )
    }

    // Process and validate each image
    const processedImages: {
      id: string
      url: string
      thumbnailUrl: string
      dimensions: { width: number; height: number }
      sizeBytes: number
    }[] = []

    for (let i = 0; i < images.length; i++) {
      const img = images[i]

      // Validate MIME type
      if (!ALLOWED_TYPES.includes(img.mimeType)) {
        return NextResponse.json(
          { error: `Image ${i + 1}: Invalid file type. Allowed: JPEG, PNG, HEIC, WebP` },
          { status: 400 }
        )
      }

      // Validate base64 data
      if (!img.base64Data || typeof img.base64Data !== 'string') {
        return NextResponse.json(
          { error: `Image ${i + 1}: Invalid image data` },
          { status: 400 }
        )
      }

      // Check size (rough estimate from base64 length)
      const estimatedSize = (img.base64Data.length * 3) / 4
      if (estimatedSize > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: `Image ${i + 1}: File too large. Maximum size is 10MB` },
          { status: 400 }
        )
      }

      // Generate unique ID for this image
      const imageId = uuidv4()

      // In production, this would:
      // 1. Upload to cloud storage (S3, GCS, Cloudflare R2)
      // 2. Generate a thumbnail
      // 3. Extract dimensions
      // 4. Return signed URLs
      //
      // For MVP, we'll store base64 in memory/session and return data URLs
      // This is NOT suitable for production but works for the demo

      const dataUrl = `data:${img.mimeType};base64,${img.base64Data}`

      // Extract dimensions from base64 (simplified - in production use sharp or similar)
      // For now, we'll return placeholder dimensions
      const dimensions = await getImageDimensions(img.base64Data, img.mimeType)

      processedImages.push({
        id: imageId,
        url: dataUrl,
        thumbnailUrl: dataUrl, // In production, this would be a compressed version
        dimensions,
        sizeBytes: estimatedSize,
      })
    }

    // Generate upload ID
    const uploadId = uuidv4()

    // In production, we'd store this in a database
    // For MVP, the client will manage state

    // Increment quota
    serverQuotaService.incrementQuota(authContext.userId, 'paperUploads')
    const remaining = serverQuotaService.getRemainingQuota(authContext.userId)

    const response: UploadImagesResponse = {
      uploadId,
      images: processedImages.map(img => ({
        id: img.id,
        url: img.url,
        thumbnailUrl: img.thumbnailUrl,
      })),
      _quota: {
        paperUploadsRemaining: remaining.paperUploads ?? DAILY_PAPER_UPLOAD_LIMIT,
        dailyLimit: DAILY_PAPER_UPLOAD_LIMIT,
      },
    }

    console.log(`[${authContext.userId}] Paper solution uploaded: ${uploadId} (${processedImages.length} images)`)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error uploading paper solution:', error)
    return NextResponse.json(
      {
        error: 'Failed to upload images',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Extract image dimensions from base64 data
 * In production, use a proper image processing library like Sharp
 */
async function getImageDimensions(
  base64Data: string,
  mimeType: string
): Promise<{ width: number; height: number }> {
  // This is a simplified implementation
  // In production, we'd use Sharp or similar to get actual dimensions

  // For now, return default dimensions
  // The client can update these after loading the image
  return { width: 0, height: 0 }
}
