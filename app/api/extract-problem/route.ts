/**
 * Extract Problem Text from Image
 * Uses Claude Vision to OCR a physics problem from an uploaded image
 */

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { validateAuthHeader, unauthorizedResponse } from '@/lib/auth/apiAuth'

const client = new Anthropic()

const EXTRACTION_PROMPT = `You are an expert at extracting physics and mathematics problems from images.

Your task is to extract the complete problem text from this image. The image contains a physics or math problem that a student wants to solve.

Instructions:
1. Extract ALL text from the problem, including:
   - The main question/problem statement
   - Any given values, constants, or parameters
   - Any constraints or conditions mentioned
   - Diagrams descriptions if relevant (describe what the diagram shows)

2. Format the extracted text clearly:
   - Use proper mathematical notation where possible
   - Preserve the structure of the problem (numbered parts, sub-questions)
   - Include units with numerical values

3. If there's a diagram:
   - Describe it briefly in brackets, e.g., [Diagram shows a block on an inclined plane at angle θ]
   - Extract any labels or annotations from the diagram

4. Output ONLY the extracted problem text - no commentary, no "Here is the extracted text:", just the problem itself.

5. If text is unclear or partially visible, make your best interpretation and include it.

Extract the problem text now:`

export async function POST(request: NextRequest) {
  // Validate authentication
  const authContext = validateAuthHeader(request)
  if (!authContext) {
    return unauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { image } = body

    if (!image) {
      return Response.json(
        { error: 'No image provided' },
        { status: 400 }
      )
    }

    // Parse the base64 image
    let imageData: string
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

    if (image.startsWith('data:')) {
      // Extract media type and base64 data from data URL
      const matches = image.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!matches) {
        return Response.json(
          { error: 'Invalid image format. Expected base64 data URL.' },
          { status: 400 }
        )
      }
      mediaType = matches[1] as typeof mediaType
      imageData = matches[2]
    } else {
      // Assume raw base64, default to jpeg
      imageData = image
      mediaType = 'image/jpeg'
    }

    // Validate media type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(mediaType)) {
      return Response.json(
        { error: `Unsupported image type: ${mediaType}. Supported: JPEG, PNG, GIF, WebP` },
        { status: 400 }
      )
    }

    // Call Claude Vision API
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageData,
              },
            },
            {
              type: 'text',
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    })

    // Extract text from response
    const extractedText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n')
      .trim()

    if (!extractedText) {
      return Response.json(
        { error: 'Could not extract text from image. Please try a clearer image.' },
        { status: 422 }
      )
    }

    return Response.json({
      extractedText,
      confidence: 'high', // Could be enhanced with confidence scoring
    })

  } catch (error) {
    console.error('Extract problem error:', error)

    if (error instanceof SyntaxError) {
      return Response.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    return Response.json(
      { error: 'Failed to extract problem from image' },
      { status: 500 }
    )
  }
}
