// In-memory storage for mistake locations (in production, use a database)
const mistakeStorage = new Map<string, {
  stepIndex: number
  mistakeType: string
  correctApproach: string
}>()

export function storeMistakeLocation(solutionId: string, location: {
  stepIndex: number
  mistakeType: string
  correctApproach: string
}) {
  mistakeStorage.set(solutionId, location)
}

export function getMistakeLocation(solutionId: string) {
  return mistakeStorage.get(solutionId)
}

export function cleanupOldEntries(maxSize: number = 1000) {
  if (mistakeStorage.size > maxSize) {
    const entries = Array.from(mistakeStorage.entries())
    entries.slice(0, maxSize / 2).forEach(([key]) => mistakeStorage.delete(key))
  }
}
