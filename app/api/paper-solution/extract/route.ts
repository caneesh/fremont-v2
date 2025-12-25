import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { validateAuthHeader, unauthorizedResponse } from '@/lib/auth/apiAuth'
import { v4 as uuidv4 } from 'uuid'
import type { ExtractTextRequest, ExtractTextResponse } from '@/types/paperSolution'

const anthropic = new Anthropic()

// OCR extraction prompt - optimized for handwritten physics/math
const EXTRACTION_SYSTEM_PROMPT = `You are an expert OCR system specialized in extracting handwritten physics and mathematics solutions. Your task is to accurately transcribe handwritten content from student work.

GUIDELINES:
1. Preserve the exact structure and flow of the student's work
2. Use standard notation for mathematical symbols:
   - Subscripts: v₁, m₂, etc.
   - Greek letters: θ, ω, α, β, etc.
   - Common symbols: →, ≈, ≠, ≤, ≥, ∞, etc.
3. Indicate unclear parts with [?] or [unclear: best guess]
4. Preserve line breaks that seem intentional
5. Identify and format code-like blocks with \`\`\` markers
6. For equations, keep them on their own lines
7. Indicate diagrams with [DIAGRAM: brief description]

OUTPUT FORMAT:
Return a JSON object with:
{
  "rawText": "exact transcription with minimal formatting",
  "cleanedText": "normalized version with proper spacing and structure",
  "regions": [
    {
      "id": "region_1",
      "text": "content of this region",
      "type": "text|equation|code|diagram|list",
      "confidence": 0.95,
      "needsConfirmation": false,
      "alternatives": []
    }
  ],
  "overallConfidence": 0.87,
  "notes": "any observations about legibility or ambiguity"
}`

const EXTRACTION_USER_PROMPT = `Please extract all handwritten content from this image of a student's physics/math solution.

Focus on:
- Mathematical equations and expressions
- Variable definitions and values
- Step-by-step reasoning
- Any diagrams (describe them)
- Code or pseudocode if present

Be precise about what you can and cannot read clearly. For any unclear portions, provide your best interpretation with a confidence indicator.`

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authContext = validateAuthHeader(request)
    if (!authContext) {
      return unauthorizedResponse()
    }

    const body: ExtractTextRequest = await request.json()
    const { uploadId, imageIds, enhanceForMath = true } = body

    if (!uploadId) {
      return NextResponse.json(
        { error: 'Upload ID is required' },
        { status: 400 }
      )
    }

    // In a real implementation, we'd fetch images from storage
    // For MVP, expect the images to be passed in the request body
    // This is a workaround - in production, we'd look up by uploadId
    // Note: Use '|' as delimiter since data URLs contain commas
    const imageDataUrls = (request.headers.get('x-image-data') || '').split('|').filter(Boolean)

    if (imageDataUrls.length === 0) {
      return NextResponse.json(
        { error: 'No images found for this upload. Please include image data.' },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    // Process each image with Claude Vision
    const allRegions: any[] = []
    let combinedRawText = ''
    let combinedCleanedText = ''
    let totalConfidence = 0

    for (let i = 0; i < imageDataUrls.length; i++) {
      const imageData = imageDataUrls[i]

      // Extract media type and base64 from data URL
      const match = imageData.match(/^data:([^;]+);base64,(.+)$/)
      if (!match) {
        console.warn(`Image ${i + 1}: Invalid data URL format`)
        continue
      }

      const [, mediaType, base64Data] = match

      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                    data: base64Data,
                  },
                },
                {
                  type: 'text',
                  text: EXTRACTION_USER_PROMPT,
                },
              ],
            },
          ],
          system: EXTRACTION_SYSTEM_PROMPT,
        })

        // Parse the response
        const content = response.content[0]
        if (content.type !== 'text') {
          throw new Error('Unexpected response type')
        }

        // Try to parse as JSON
        let extractionResult
        try {
          // Find JSON in the response (it might be wrapped in markdown)
          const jsonMatch = content.text.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            extractionResult = JSON.parse(jsonMatch[0])
          } else {
            // If no JSON, treat the whole response as raw text
            extractionResult = {
              rawText: content.text,
              cleanedText: content.text,
              regions: [{
                id: `region_${i}_1`,
                text: content.text,
                type: 'text',
                confidence: 0.7,
                needsConfirmation: true,
                alternatives: [],
              }],
              overallConfidence: 0.7,
            }
          }
        } catch (parseError) {
          // If JSON parsing fails, use raw text
          extractionResult = {
            rawText: content.text,
            cleanedText: content.text,
            regions: [{
              id: `region_${i}_1`,
              text: content.text,
              type: 'text',
              confidence: 0.7,
              needsConfirmation: true,
              alternatives: [],
            }],
            overallConfidence: 0.7,
          }
        }

        // Add page number to regions
        const pageRegions = (extractionResult.regions || []).map((r: any, idx: number) => ({
          ...r,
          id: `page${i + 1}_${r.id || `region_${idx}`}`,
          pageNumber: i + 1,
          imageId: imageIds?.[i] || `image_${i}`,
        }))

        allRegions.push(...pageRegions)
        combinedRawText += (i > 0 ? '\n\n--- Page ' + (i + 1) + ' ---\n\n' : '') + extractionResult.rawText
        combinedCleanedText += (i > 0 ? '\n\n' : '') + extractionResult.cleanedText
        totalConfidence += extractionResult.overallConfidence || 0.7
      } catch (apiError) {
        console.error(`Error extracting from image ${i + 1}:`, apiError)
        allRegions.push({
          id: `page${i + 1}_error`,
          pageNumber: i + 1,
          text: '[Extraction failed for this page]',
          type: 'unknown',
          confidence: 0,
          needsConfirmation: true,
        })
      }
    }

    const processingTimeMs = Date.now() - startTime
    const overallConfidence = imageDataUrls.length > 0 ? totalConfidence / imageDataUrls.length : 0

    // Identify low-confidence regions that need user confirmation
    const lowConfidenceRegions = allRegions
      .filter(r => r.confidence < 0.75 || r.needsConfirmation)
      .map(r => ({
        regionId: r.id,
        text: r.text,
        confidence: r.confidence,
        alternatives: r.alternatives || [],
      }))

    const extractionId = uuidv4()

    const response: ExtractTextResponse = {
      extractionId,
      rawText: combinedRawText,
      cleanedText: combinedCleanedText,
      overallConfidence,
      lowConfidenceRegions,
      processingTimeMs,
    }

    console.log(`[${authContext.userId}] Text extracted: ${extractionId} (confidence: ${(overallConfidence * 100).toFixed(1)}%, ${processingTimeMs}ms)`)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error extracting text from images:', error)
    return NextResponse.json(
      {
        error: 'Failed to extract text from images',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
