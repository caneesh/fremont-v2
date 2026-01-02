import { authService } from '../auth/authService'

export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const code = authService.getUserCode()

  if (!code) {
    throw new Error('Not authenticated')
  }

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${code}`,
    'Content-Type': 'application/json',
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

export interface QuotaExceededInfo {
  message: string
  quotaType?: string
  limit?: number
}

export async function parseQuotaExceeded(response: Response): Promise<QuotaExceededInfo | null> {
  if (response.status !== 429) return null

  try {
    const data = await response.json()
    return {
      message: data?.message || 'Daily limit reached.',
      quotaType: data?.quotaType,
      limit: data?.limit,
    }
  } catch {
    return { message: 'Daily limit reached.' }
  }
}
