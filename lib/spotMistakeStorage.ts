import fs from 'fs'
import path from 'path'

// File-based storage for mistake locations (persists across API route reloads)
// Use /tmp in production (Vercel, etc.) since filesystem is read-only
const STORAGE_DIR = process.env.NODE_ENV === 'production'
  ? path.join('/tmp', 'spot-mistake')
  : path.join(process.cwd(), '.next', 'cache', 'spot-mistake')

const STORAGE_FILE = path.join(STORAGE_DIR, 'mistakes.json')

// Ensure storage directory exists - do this lazily, not at module load
function ensureStorageDir() {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true })
      console.log(`[Storage] Created storage directory: ${STORAGE_DIR}`)
    }
  } catch (error) {
    console.error('[Storage] Error creating storage directory:', error)
    throw error
  }
}

type MistakeLocation = {
  stepIndex: number
  mistakeType: string
  correctApproach: string
  timestamp: number
}

// Load existing storage
function loadStorage(): Map<string, MistakeLocation> {
  try {
    ensureStorageDir()
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf-8')
      const entries = JSON.parse(data)
      return new Map(entries)
    }
  } catch (error) {
    console.error('[Storage] Error loading mistake storage:', error)
  }
  return new Map()
}

// Save storage to disk
function saveStorage(storage: Map<string, MistakeLocation>) {
  try {
    ensureStorageDir()
    const entries = Array.from(storage.entries())
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(entries), 'utf-8')
  } catch (error) {
    console.error('[Storage] Error saving mistake storage:', error)
  }
}

export function storeMistakeLocation(solutionId: string, location: {
  stepIndex: number
  mistakeType: string
  correctApproach: string
}) {
  const storage = loadStorage()
  storage.set(solutionId, {
    ...location,
    timestamp: Date.now()
  })
  saveStorage(storage)
  console.log(`[Storage] Stored mistake for solution ${solutionId}, total entries: ${storage.size}`)
}

export function getMistakeLocation(solutionId: string) {
  const storage = loadStorage()
  const location = storage.get(solutionId)
  console.log(`[Storage] Retrieved mistake for solution ${solutionId}:`, location ? 'found' : 'not found')
  console.log(`[Storage] Total entries in storage: ${storage.size}`)

  if (location) {
    // Check if it's expired (24 hours)
    const age = Date.now() - location.timestamp
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours

    if (age > maxAge) {
      console.log(`[Storage] Solution ${solutionId} expired (age: ${Math.floor(age / 1000 / 60)} minutes)`)
      return undefined
    }
  }

  return location
}

export function cleanupOldEntries(maxSize: number = 1000) {
  const storage = loadStorage()

  if (storage.size > maxSize) {
    // Remove oldest entries
    const entries = Array.from(storage.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)

    const toKeep = entries.slice(-maxSize / 2)
    const newStorage = new Map(toKeep)
    saveStorage(newStorage)

    console.log(`[Storage] Cleaned up old entries: ${storage.size} -> ${newStorage.size}`)
  }

  // Also remove expired entries
  const now = Date.now()
  const maxAge = 24 * 60 * 60 * 1000 // 24 hours
  let removed = 0

  storage.forEach((value, key) => {
    if (now - value.timestamp > maxAge) {
      storage.delete(key)
      removed++
    }
  })

  if (removed > 0) {
    saveStorage(storage)
    console.log(`[Storage] Removed ${removed} expired entries`)
  }
}
