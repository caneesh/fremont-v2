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

export async function handleQuotaExceeded(response: Response): Promise<boolean> {
  if (response.status === 429) {
    const data = await response.json()
    alert(
      `Daily Limit Reached\n\n${data.message}\n\nYour limits will reset tomorrow at midnight.`
    )
    return true
  }
  return false
}
