/**
 * Question Scaffolding Engine v1 - Main Export
 *
 * Central export point for all question engine modules.
 */

// Schemas and types
export * from './schemas'

// Templates
export {
  TEMPLATE_INCLINE_FRICTIONLESS,
  TEMPLATE_INCLINE_WITH_FRICTION,
  TEMPLATE_NEWTON_2D_BLOCK,
  TEMPLATE_REGISTRY,
  getTemplate,
  findBestTemplate,
  getAllTemplateIds,
} from './templates'

// Fingerprinting (LLM-free)
export {
  computeHash,
  normalizeStatement,
  extractFingerprint,
  computeSimilarity,
} from './fingerprint'

// KV Store
export {
  hasQuestion,
  getQuestionBlobUrl,
  saveQuestionIndex,
  getTopicHashes,
  getSubtopicHashes,
  getQuestionSummaries,
  checkRateLimit,
  checkQuota,
  getQuotaRemaining,
  updateStatus,
  getStatus,
  isKVAvailable,
  getKVStatus,
  type QuestionSummary,
  type RateLimitResult,
  type QuotaResult,
} from './kv-store'

// Blob Store
export {
  saveQuestionToBlob,
  fetchQuestionFromBlob,
  blobExists,
  deleteBlob,
  isBlobAvailable,
  getBlobStatus,
} from './blob-store'

// Anthropic Adapter
export {
  generateQuestion,
  adaptQuestion,
  isAnthropicAvailable,
  getAnthropicStatus,
} from './anthropic-adapter'
