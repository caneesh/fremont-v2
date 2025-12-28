/**
 * Storage Module - Public API
 *
 * Export all storage-related functionality from a single entry point.
 */

// Types
export * from './types'

// Provider interface and base class
export { BaseStorageProvider } from './StorageProvider'
export type { StorageProvider } from './StorageProvider'

// LocalStorage implementation
export { LocalStorageProvider, localStorageProvider } from './LocalStorageProvider'

// Event logger
export { eventLogger } from './eventLogger'

// Validators
export * from './validators'
