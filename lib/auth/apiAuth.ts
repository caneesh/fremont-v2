import { NextRequest } from 'next/server'
import { PILOT_CODES } from './authService'

export interface AuthContext {
  userId: string
  code: string
}

export function validateAuthHeader(request: NextRequest): AuthContext | null {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const code = authHeader.substring(7).trim().toUpperCase()
  const user = PILOT_CODES[code]

  if (!user || !user.isActive) {
    return null
  }

  return {
    userId: user.userId,
    code: user.code,
  }
}

export function unauthorizedResponse() {
  return Response.json(
    { error: 'Unauthorized. Please provide a valid access code.' },
    { status: 401 }
  )
}

export function quotaExceededResponse(quotaType: string, limit: number) {
  return Response.json(
    {
      error: 'Daily quota exceeded',
      message: `You have reached your daily limit for ${quotaType}. Limit: ${limit} per day.`,
      quotaType,
      limit,
    },
    { status: 429 }
  )
}
