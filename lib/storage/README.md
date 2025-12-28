# Storage Abstraction Layer

This module provides a unified storage interface for PhysiScaffold, enabling:
- Type-safe storage operations
- Event logging for learning analytics
- Easy migration path from localStorage to server-side storage

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  (SolutionScaffold, MicroTaskStepAccordion, etc.)           │
├─────────────────────────────────────────────────────────────┤
│                    Event Logger                              │
│  eventLogger.problemStarted(), .stepCompleted(), etc.       │
├─────────────────────────────────────────────────────────────┤
│                  StorageProvider Interface                   │
│  getAttempt(), saveAttempt(), logEvent(), getPreferences()  │
├─────────────────────────────────────────────────────────────┤
│                 LocalStorageProvider                         │
│  Wraps browser localStorage with proper error handling       │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Event Logging

```typescript
import { eventLogger } from '@/lib/storage'

// Log problem lifecycle events
eventLogger.problemStarted('problem_123', 'Newton Laws Problem')
eventLogger.draftSaved('problem_123')
eventLogger.problemSolved('problem_123', 12000) // with duration in ms

// Log step events
eventLogger.stepActivated('problem_123', 1)
eventLogger.stepCompleted('problem_123', 1)
eventLogger.stepFailed('problem_123', 1, 2) // attempt number

// Log hint events
eventLogger.hintUnlocked('problem_123', 1, 2) // step, level
eventLogger.hintViewed('problem_123', 1, 2)

// Log micro-task events
eventLogger.taskAttempted('problem_123', 1, 2, 'MULTIPLE_CHOICE', 1)
eventLogger.taskCorrect('problem_123', 1, 2, 'MULTIPLE_CHOICE', 1)
eventLogger.taskIncorrect('problem_123', 1, 2, 'FILL_BLANK', 2)
eventLogger.readingModeActivated('problem_123', 1)

// Query events
const recent = eventLogger.getRecentEvents(50)
const problemEvents = eventLogger.getProblemEvents('problem_123')
const stats = eventLogger.getProblemStats('problem_123')
```

### Storage Provider

```typescript
import { localStorageProvider } from '@/lib/storage'

// Initialize (done automatically on import)
await localStorageProvider.initialize({
  maxEventsToStore: 1000,
  eventRetentionDays: 30,
  debugMode: true
})

// Problem attempts
const attempt = localStorageProvider.getAttempt('problem_123')
localStorageProvider.saveDraft('problem_123', 'Title', progress)
localStorageProvider.markSolved('problem_123', 'Title', progress)

// User preferences
const prefs = localStorageProvider.getPreferences()
localStorageProvider.updatePreferences({ theme: 'dark' })

// Generic storage
localStorageProvider.setRaw('my_key', { foo: 'bar' })
const data = localStorageProvider.getRaw<MyType>('my_key')

// Export/Import
const backup = localStorageProvider.exportAll()
localStorageProvider.importAll(backup.data)
```

### Validators

```typescript
import { validateScaffoldData, validateProblemProgress } from '@/lib/storage'

// Validate data before saving
const result = validateScaffoldData(unknownData)
if (result.valid) {
  // result.data is typed as ScaffoldData
  saveData(result.data)
} else {
  console.error('Validation failed:', result.errors)
}
```

## Event Types

| Event Type | Description | Metadata |
|------------|-------------|----------|
| `problem_started` | User begins a new problem | problemId, problemTitle |
| `problem_saved_draft` | Draft auto-saved | problemId |
| `problem_marked_solved` | Problem completed | problemId, duration |
| `problem_deleted` | Problem removed | problemId |
| `step_activated` | User opens a step | problemId, stepId |
| `step_completed` | Step marked complete | problemId, stepId, duration |
| `step_failed` | Wrong answer submitted | problemId, stepId, attemptNumber |
| `hint_unlocked` | Hint revealed | problemId, stepId, level |
| `hint_viewed` | Hint expanded | problemId, stepId, level |
| `task_attempted` | Quiz answer submitted | problemId, stepId, level, taskType, attemptNumber |
| `task_correct` | Correct answer | (same as attempted) |
| `task_incorrect` | Wrong answer | (same as attempted) |
| `reading_mode_activated` | Switched to passive mode | problemId, stepId |
| `sanity_check_completed` | Sanity check done | problemId, isCorrect |
| `reflection_started` | Reflection begun | problemId |
| `reflection_completed` | Reflection finished | problemId |
| `preference_changed` | Settings updated | preferenceKey, preferenceValue |
| `error_occurred` | Error logged | errorMessage, (context) |

## Storage Keys

All PhysiScaffold data is stored with the `physiscaffold_` prefix:

| Key | Description |
|-----|-------------|
| `physiscaffold_problem_attempts` | Problem history and progress |
| `physiscaffold_events` | Event log |
| `physiscaffold_user_preferences` | User settings |
| `physiscaffold_user` | User ID |
| `physiscaffold_session` | Session ID (sessionStorage) |
| `physiscaffold_error_patterns` | Error pattern analysis |
| `physiscaffold_concept_mastery` | Concept mastery tracking |
| `physiscaffold_study_progress` | Study path progress |

## Debug Panel

In development mode, visit `/dev/events` to:
- View all logged events
- Filter by event type or problem ID
- See event statistics
- Export/import data
- Clear or prune old events

## Extending for Server-Side Storage

To add server-side storage, implement the `StorageProvider` interface:

```typescript
import { BaseStorageProvider } from '@/lib/storage'

export class ApiStorageProvider extends BaseStorageProvider {
  async initialize(config) {
    // Set up API connection
  }

  isAvailable() {
    return navigator.onLine
  }

  async getAttempt(problemId) {
    const response = await fetch(`/api/attempts/${problemId}`)
    // ...
  }

  // Implement remaining methods...
}
```

## Best Practices

1. **Always use eventLogger** for analytics events - it handles initialization and queuing
2. **Use validators** when loading data from storage to ensure type safety
3. **Check `isAvailable()`** before storage operations in SSR contexts
4. **Prune events regularly** to prevent localStorage quota issues
5. **Export data periodically** for backup purposes

## Files

```
lib/storage/
├── types.ts              # Type definitions
├── StorageProvider.ts    # Interface + base class
├── LocalStorageProvider.ts # Browser localStorage implementation
├── eventLogger.ts        # High-level event logging API
├── validators.ts         # Data validation utilities
├── index.ts             # Public API exports
└── README.md            # This file
```
