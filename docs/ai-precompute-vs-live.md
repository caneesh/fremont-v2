# AI Precompute vs. Live Analysis

**Date:** 2026-01-07
**Author:** LLM Audit (Claude Opus 4.5)
**Scope:** PhysiScaffold v2 - AI Cost/Latency Optimization

---

## 1. Executive Summary

### Big Wins (Estimated Impact)

| Priority | Win | Cost Reduction | Latency Improvement | Reliability |
|----------|-----|----------------|---------------------|-------------|
| 🔥 **1** | **Pre-generate scaffolds for question bank** - 50+ questions × 3 phases = 150+ cached scaffolds | ~$50-100/month saved | -15s on first load | ✅ Works offline |
| 🔥 **2** | **Extend scaffold cache TTL** from 15min to 7 days with content-hash invalidation | ~30% API reduction | Near-instant repeat | ✅ Higher hit rate |
| 🔥 **3** | **Precompute hint levels 4-5** with scaffolds instead of on-demand | ~20% hint API savings | -3-5s per hint | ✅ Eliminates hint timeout |
| 💡 **4** | **Batch PDF extraction** as authoring pipeline, not runtime | ~$20/month saved | N/A (async) | ✅ QA before use |
| 💡 **5** | **Cache Feynman validation keywords** by topic (no API needed for first-pass rejection) | ~15% validation savings | -500ms avg | ✅ Already partial |
| 📊 **6** | **Precompute concept contrast distractors** for common concepts | ~10% API reduction | -2s avg | ✅ Better UX |
| 📊 **7** | **Add persistent KV cache** for step expansions (Redis/Vercel KV) | Variable | Session survival | ✅ Crash recovery |
| 📊 **8** | **Implement circuit breaker for AI calls** (already scaffolded but not enforced) | N/A | N/A | 🔺 Graceful degradation |
| 🛠️ **9** | **Smaller models for classification** - Use Haiku for Feynman quick-reject | ~40% on validation | +100ms latency OK | ✅ Equivalent accuracy |
| 🛠️ **10** | **Token budget alerts** - Log and alert on prompts >4K tokens | Audit visibility | N/A | ✅ Cost control |

**Estimated Total Monthly Savings:** $150-300 (assuming 10K DAU)
**Estimated Latency Improvement:** 40-60% on cache hits

---

## 2. Inventory of AI Features

### 2.1 Feature Table

| Feature | Files | Trigger | Inputs | Outputs | Model | Classification | Reasoning |
|---------|-------|---------|--------|---------|-------|----------------|-----------|
| **Scaffold Outline** | `lib/phasedScaffold.ts:66-182`, `app/api/scaffold/outline/route.ts` | User submits problem | Problem text, density, diagram | Step list, concepts, patterns | claude-sonnet-4-5 | **HYBRID** | Same problem = same scaffold; cache by content hash |
| **Step Expansion** | `lib/phasedScaffold.ts:196-267`, `app/api/scaffold/step/route.ts` | User clicks step | scaffold_id, step_id, outline | micro_tasks, explanation, hints | claude-sonnet-4-5 | **HYBRID** | Cacheable per problem+step; on-demand OK |
| **Final Solve** | `lib/phasedScaffold.ts:280-340`, `app/api/solve/final/route.ts` | User requests solution | Problem, steps_completed | final_answer, key_equations | claude-sonnet-4-5 | **HYBRID** | Can precompute for question bank |
| **Socratic Tutor Chat** | `app/api/socratic-tutor/route.ts` | User sends message | Problem, step, history, answer | analysis, follow-up question | claude-sonnet-4 | **LIVE** | User-specific, conversational |
| **Socratic Rewind** | `app/api/socratic-rewind/route.ts`, `lib/socraticRewindService.ts` | Error detection | Previous step, error, principle | stop message, bridge question | claude-sonnet-4 | **LIVE** | Context-dependent recovery |
| **Feynman Validation** | `lib/feynmanValidator.ts`, `app/api/feynman-validate/route.ts` | Student explains concept | Explanation, topic, context | category, score, feedback | claude-sonnet-4-5 | **HYBRID** | Quick-reject is precomputed; LLM for nuance |
| **Hint Generation (L4-5)** | `app/api/generate-hint/route.ts` | User clicks hint | Problem, step, existing hints | hint content | claude-sonnet-4 | **HYBRID** | Can pregenerate with scaffold |
| **PDF Question Extraction** | `app/api/questions/extract/route.ts`, `lib/prompts/questionExtraction.ts` | Admin uploads PDF | PDF file, source type | Structured questions | claude-sonnet-4 | **PRECOMPUTE** | Authoring-time, not user-facing |
| **Concept Contrast** | `app/api/concept-contrast/route.ts` | Student selects concept | Selected concept, problem | Distractors, challenge prompt | claude-sonnet-4 | **HYBRID** | Distractor sets cacheable by concept pair |
| **Paper Solution Analysis** | `app/api/paper-solution/analyze/route.ts` | User uploads handwriting | OCR text, step rubric | feedback, score, nudge | claude-sonnet-4 | **LIVE** | User-specific submission |
| **Spot Mistake Generate** | `app/api/spot-mistake/generate/route.ts` | User starts game | Problem text, domain | Flawed solution with hidden error | claude-sonnet-4 | **LIVE** | Needs unique errors each time |
| **Error Analysis** | `app/api/analyze-error/route.ts` | Error recorded | Error context, problem | Analysis, remediation | claude-sonnet-4 | **LIVE** | User-specific error pattern |
| **Debug Concept** | `app/api/debug-concept/route.ts` | User stuck | Concept, context | Explanation, analogies | claude-sonnet-4 | **LIVE** | Interactive debugging |
| **Explain to Friend** | `app/api/explain-to-friend/route.ts` | User requests | Concept | Simplified explanation | claude-sonnet-4 | **HYBRID** | Cacheable by concept |
| **Problem Variations** | `app/api/variations/route.ts` | User completes problem | Problem, domain | Similar problems | claude-sonnet-4 | **PRECOMPUTE** | Can batch-generate variations |
| **Grade Solution** | `app/api/grade-solution/route.ts` | User submits answer | Solution, rubric | Score, feedback | claude-sonnet-4 | **LIVE** | User-specific evaluation |
| **Verify Reasoning** | `app/api/verify-reasoning/route.ts` | User explains step | Reasoning, expected | Validation, gaps | claude-sonnet-4 | **LIVE** | User-specific reasoning |

### 2.2 Caching Architecture (Current State)

**In-Memory Cache** (`lib/scaffoldCache.ts`):
- TTL: 15 minutes
- Keys: scaffold_id (SHA256 of problem + options)
- Caches: Outline, Step Expansions, Final Solve
- Limitation: **Does not survive serverless cold starts**

**Redis/KV Cache** (`lib/question-engine/kv-store.ts`):
- Used for: Question storage, rate limiting, quota tracking
- Not currently used for scaffold caching

**AI Feature Quotas** (`lib/ai/controlledAi.ts`):
- Daily per-user limits defined
- Hint generation: 20/day
- Explanation generation: 30/day
- Socratic dialogue: 50/day
- Step feedback: 100/day

---

## 3. Precompute Candidates (Deep Dive)

### 3.1 Scaffold Generation for Question Bank

**When to compute:** On question approval (lifecycle: draft → approved)

**Evidence:**
- Questions are static in `data/questions.json` (50+ questions)
- Study plan patterns in `data/studyPlanV2/patterns.json`
- Current cache generates on first user request

**Storage:**
```
Table: precomputed_scaffolds
- question_id: VARCHAR (FK to questions)
- density: INT (1-5)
- scaffold_outline: JSONB
- step_expansions: JSONB (keyed by step_id)
- final_solve: JSONB
- created_at: TIMESTAMP
- model_version: VARCHAR
- prompt_version: VARCHAR (for invalidation)
```

**Idempotency:** Hash of (question_text + density + prompt_version + model_version)

**Runtime Path:**
1. User selects question from bank → Check `precomputed_scaffolds` by question_id
2. Hit: Return instantly (0 API calls)
3. Miss: Fall back to live generation, then cache

**Cost Estimate:**
- Initial generation: 50 questions × 3 densities × ~$0.02 = **$3 one-time**
- Eliminates: ~80% of scaffold API calls for question bank problems

### 3.2 Hint Levels 4-5 Pre-generation

**When to compute:** With step expansion (Phase B)

**Evidence:**
- `app/api/generate-hint/route.ts:30-31` filters for levels 4-5 only
- Current flow: Outline → [user clicks step] → Step Expansion → [user clicks L4-5] → Hint API
- Hints are deterministic for same problem+step

**Storage:** Extend step_expansions JSON to include all 5 levels

**Prompt Modification:**
```typescript
// lib/prompts/step.ts - Add to output format
"hints": [
  {"level": 1, "content": "..."},
  {"level": 2, "content": "..."},
  {"level": 3, "content": "..."},
  {"level": 4, "content": "Structural equation..."}, // NEW
  {"level": 5, "content": "Full solution..."}        // NEW
]
```

**Trade-off:** Step expansion takes ~20% longer but eliminates 100% of L4-5 hint API calls

### 3.3 Problem Variations Batch Generation

**When to compute:** Nightly job for approved questions

**Evidence:**
- `app/api/variations/route.ts` generates variations on-demand
- Same problem always has similar variation themes
- Currently no caching

**Storage:**
```
Table: question_variations
- source_question_id: VARCHAR
- variation_type: ENUM('easier', 'harder', 'related')
- variation_data: JSONB
- generated_at: TIMESTAMP
```

**Generation Script:**
```bash
# scripts/generate-variations.ts
for each approved_question:
  generate 3 variations (easier, harder, related)
  store in question_variations table
```

### 3.4 PDF Question Extraction Pipeline

**When to compute:** At content authoring time (not runtime)

**Evidence:**
- `app/api/questions/extract/route.ts` is user-facing but should be admin-only
- 5-minute timeout (`maxDuration = 300`) indicates heavy operation
- Extracted questions need review anyway (`authoring.reviewStatus: 'draft'`)

**Recommended Flow:**
```
PDF Upload → Background Job → AI Extraction → Draft Questions → Human Review → Approved
```

**Implementation:**
- Move to `/app/api/admin/extract-questions/route.ts`
- Add job queue (e.g., Inngest, Vercel Cron)
- Remove from user-facing routes

---

## 4. Live AI Requirements (Deep Dive)

### 4.1 Socratic Tutor Chat

**Why live is required:**
- Conversational context (`chatHistory` grows per exchange)
- User-specific answers require evaluation
- Follow-up questions depend on previous response

**Evidence:** `app/api/socratic-tutor/route.ts:124-128`
```typescript
const historyText = chatHistory.length > 0
  ? chatHistory.map(m => `${m.role}: ${m.content}`).join('\n')
  : ''
```

**Cost Minimization:**
- ✅ Already uses temperature 0.3-0.4 (less random, more cacheable)
- ✅ Max tokens limited to 500-1000
- 🔺 Could use Haiku for quick comprehension checks
- 🔺 Consider streaming for perceived latency

**Guardrails:**
- Rate limit: 50/day per user (in `lib/ai/controlledAi.ts`)
- Timeout: 30s default (should add explicit)
- Fallback: `FALLBACK_RESPONSES.socratic_dialogue` defined

### 4.2 Paper Solution Analysis

**Why live is required:**
- User uploads unique handwritten work
- OCR text varies per submission
- Socratic feedback must address specific errors

**Evidence:** `app/api/paper-solution/analyze/route.ts:70-112`
```typescript
const userPrompt = buildAnalysisPrompt(body) // User-specific input
```

**Cost Minimization:**
- 🔺 **Quick reject via keyword analysis first** (check for blank/too short)
- 🔺 **Smaller model for OCR quality assessment** (is text parseable?)
- ✅ Max tokens: 2048 (appropriate)

**Guardrails:**
- Quota: 30/day (shares with reflections)
- OCR confidence threshold: Could add minimum length check

### 4.3 Spot Mistake Generation

**Why live is required:**
- Each game session needs a **unique** flawed solution
- Mistake must be non-obvious but detectable
- Server stores answer location (security)

**Evidence:** `app/api/spot-mistake/generate/route.ts:152-153`
```typescript
storeMistakeLocation(solutionId, studentSolution.mistakeLocation)
// Server-side storage prevents client cheating
```

**Cost Minimization:**
- 🔺 **Maintain pool of pre-generated mistakes** per problem (3-5 each)
- 🔺 Rotate through pool instead of generating fresh each time
- Current: Always generates fresh

**Guardrails:**
- Quota: Uses problems quota
- Max tokens: 4096 (high, could reduce to 2048)

---

## 5. Hybrid Patterns

### 5.1 Feynman Validation (Warm Cache + LLM)

**Current Implementation:**
1. Keyword analysis (no API) - `lib/feynmanValidator.ts:75-127`
2. Quick reject for obvious failures - `lib/feynmanValidator.ts:132-174`
3. LLM validation only if needed - `lib/feynmanValidator.ts:217-290`

**Evidence:**
```typescript
// Quick reject saves API calls
if (keywordAnalysis.hasForbiddenKeywords && !keywordAnalysis.hasRequiredKeywords) {
  return quickReject(keywordAnalysis, topic) // No API call
}
```

**Enhancement:**
- Precompute `TopicKeywords` for all topics (currently 30+ topics in `lib/feynmanKeywords.ts`)
- Cache LLM responses by (topic + explanation_hash) for repeated explanations
- Use Haiku for quick-reject confirmation (cheaper than Sonnet)

### 5.2 Scaffold Generation (Content Hash Cache)

**Current Implementation:**
- Hash: SHA256 of `problem + density + options`
- TTL: 15 minutes
- Storage: In-memory Map (lost on cold start)

**Enhanced Pattern:**
```typescript
// Proposed: Two-tier caching
const scaffoldId = generateScaffoldId(problem, options)

// Tier 1: In-memory (hot path)
const memCached = outlineCache.get(scaffoldId)
if (memCached && isValid(memCached)) return memCached

// Tier 2: Persistent (Redis/KV)
const kvCached = await kv.get(`scaffold:${scaffoldId}`)
if (kvCached) {
  outlineCache.set(scaffoldId, kvCached) // Warm memory cache
  return kvCached
}

// Tier 3: Generate fresh
const fresh = await generateFromAPI(problem, options)
await kv.set(`scaffold:${scaffoldId}`, fresh, { ex: 7 * 24 * 60 * 60 }) // 7 days
outlineCache.set(scaffoldId, fresh)
return fresh
```

**Staleness Handling:**
- Content hash ensures same content = same cache
- Add `prompt_version` to hash when prompts change
- Add `model_version` for model upgrades

### 5.3 Concept Contrast (Precomputed Distractors)

**Current:** Generates distractors on-demand per request

**Hybrid Pattern:**
1. **Precompute common distractor sets:**
   ```json
   {
     "conservation-of-momentum": {
       "distractors": ["conservation-of-energy", "newton-second-law", "impulse-momentum"],
       "reasons": {...}
     }
   }
   ```

2. **Live: Select and contextualize** based on problem specifics

3. **Storage:** `data/concept-distractors.json` (static) + runtime filtering

---

## 6. Architectural Recommendations

### 6.1 Standard LLM Gateway Pattern

**Proposed Module:** `lib/llm/gateway.ts`

```typescript
interface LLMRequest {
  feature: AIFeatureType
  prompt: string
  maxTokens: number
  cacheKey?: string
  cacheTTL?: number
  fallback?: () => unknown
}

interface LLMResponse<T> {
  data: T
  cached: boolean
  tokens: { input: number; output: number }
  latencyMs: number
  cost: number
}

async function callLLM<T>(request: LLMRequest): Promise<LLMResponse<T>> {
  // 1. Check quota
  const quota = await checkQuota(userId, request.feature)
  if (!quota.allowed) throw new QuotaExceededError()

  // 2. Check cache
  if (request.cacheKey) {
    const cached = await getCachedResponse(request.cacheKey)
    if (cached) return { data: cached, cached: true, ... }
  }

  // 3. Call API with circuit breaker
  const result = await withCircuitBreaker(() =>
    anthropicClient.messages.create({...})
  )

  // 4. Record metrics
  await recordAiGeneration({
    feature: request.feature,
    inputTokens: result.usage.input_tokens,
    outputTokens: result.usage.output_tokens,
    latencyMs: Date.now() - startTime,
  })

  // 5. Cache result
  if (request.cacheKey) {
    await cacheResponse(request.cacheKey, result, request.cacheTTL)
  }

  return { data: result, cached: false, ... }
}
```

### 6.2 Observability Requirements

**Current State:**
- ✅ Token tracking in `lib/ai/controlledAi.ts`
- ✅ Cost estimation per model
- ❌ No centralized logging
- ❌ No latency percentile tracking
- ❌ No prompt size alerting

**Recommended Implementation:**

```typescript
// lib/llm/telemetry.ts
const AI_METRICS = {
  requests: new Counter('ai_requests_total', { feature: string }),
  latency: new Histogram('ai_latency_seconds', { feature: string, cached: boolean }),
  tokens: new Counter('ai_tokens_total', { type: 'input' | 'output', feature: string }),
  cost: new Counter('ai_cost_usd', { feature: string }),
  errors: new Counter('ai_errors_total', { feature: string, error_type: string }),
}

// Log to Vercel Analytics or custom endpoint
async function logAICall(params: AICallParams) {
  // Structured log for querying
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'ai_call',
    feature: params.feature,
    cached: params.cached,
    latency_ms: params.latencyMs,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    cost_usd: params.cost,
    prompt_length: params.promptLength,
  }))

  // Alert on large prompts
  if (params.inputTokens > 4000) {
    console.warn(`[AI Alert] Large prompt: ${params.feature} used ${params.inputTokens} tokens`)
  }
}
```

### 6.3 Degraded Mode Configuration

**Feature Flag Pattern:**

```typescript
// lib/featureFlags.ts - Add AI degradation flags
export const AI_DEGRADATION_FLAGS = {
  // Full disable (uses fallbacks)
  DISABLE_AI_SCAFFOLD: false,
  DISABLE_AI_SOCRATIC: false,
  DISABLE_AI_FEYNMAN: false,

  // Downgrade to cached-only
  SCAFFOLD_CACHED_ONLY: false,

  // Downgrade to smaller model
  USE_HAIKU_FOR_VALIDATION: false,
}

// Usage in routes
if (AI_DEGRADATION_FLAGS.DISABLE_AI_SCAFFOLD) {
  return NextResponse.json(FALLBACK_RESPONSES.scaffold)
}
```

**Fallback Responses** (already exists in `lib/ai/controlledAi.ts:272-293`):
- Hint: "Try reviewing the concept inventory"
- Explanation: Show static solution
- Socratic: "Continue with next step"
- Feedback: "Your answer has been recorded"

### 6.4 Testing Approach

**Golden Prompt Tests:**
```typescript
// tests/prompts/scaffold-outline.test.ts
describe('Scaffold Outline Prompt', () => {
  it('produces consistent output for known problem', async () => {
    const problem = GOLDEN_PROBLEMS.BEAD_ON_HOOP
    const result = await generateOutlineScaffold(problem, { density: 3 })

    expect(result.steps.length).toBeGreaterThanOrEqual(3)
    expect(result.steps.length).toBeLessThanOrEqual(6)
    expect(result.tags.domain).toBe('mechanics')
  })
})
```

**Snapshot Tests:**
```typescript
// tests/prompts/__snapshots__/scaffold-outline.snap
exports['Bead on Hoop - Density 3'] = {
  steps: [
    { step_id: 's1', title: 'Choose Reference Frame', ... },
    ...
  ]
}
```

**Contract Tests:**
```typescript
// Ensure response matches TypeScript types
import { OutlineScaffoldResponseSchema } from '@/types/phasedScaffold'

it('response matches schema', () => {
  const result = parseResponse(rawResponse)
  expect(() => OutlineScaffoldResponseSchema.parse(result)).not.toThrow()
})
```

---

## 7. Concrete Task List

### Quick Wins (1-2 days each)

| ID | Task | Owner | Impact | Effort |
|----|------|-------|--------|--------|
| QW-1 | Extend scaffold cache TTL from 15min to 7 days | TBD | High | 2h |
| QW-2 | Add Redis/KV persistence for scaffold cache | TBD | High | 4h |
| QW-3 | Include L4-5 hints in step expansion prompt | TBD | Medium | 3h |
| QW-4 | Add prompt size logging (alert >4K tokens) | TBD | Medium | 2h |
| QW-5 | Use Haiku for Feynman quick-reject confirmation | TBD | Medium | 3h |
| QW-6 | Add explicit timeout (30s) to all AI routes | TBD | Low | 2h |
| QW-7 | Move PDF extraction to admin-only route | TBD | Low | 2h |

### Larger Refactors (1-2 weeks each)

| ID | Task | Owner | Impact | Effort |
|----|------|-------|--------|--------|
| LR-1 | Implement LLM Gateway module with unified caching | TBD | High | 1 week |
| LR-2 | Create precompute pipeline for question bank scaffolds | TBD | High | 1 week |
| LR-3 | Build spot-mistake pool (pregenerate 5 per problem) | TBD | Medium | 3 days |
| LR-4 | Add observability dashboard (Vercel Analytics integration) | TBD | Medium | 1 week |
| LR-5 | Implement circuit breaker enforcement for AI calls | TBD | Medium | 3 days |
| LR-6 | Create concept-distractors.json for top 50 concepts | TBD | Low | 3 days |
| LR-7 | Add golden prompt test suite | TBD | Low | 4 days |

### Migration Tasks

| ID | Task | Owner | Impact | Effort |
|----|------|-------|--------|--------|
| MT-1 | Migrate in-memory cache to Redis | TBD | High | 2 days |
| MT-2 | Add prompt_version to cache keys for invalidation | TBD | Medium | 1 day |
| MT-3 | Backfill precomputed_scaffolds for existing questions | TBD | Medium | 1 day |

---

## Appendix A: File Reference

### Core AI Wrapper
- `lib/anthropic.ts` - Main Anthropic client with scaffold generation functions

### Prompt Templates
- `lib/prompts/outline.ts` - Scaffold outline prompt (Phase A)
- `lib/prompts/step.ts` - Step expansion prompt (Phase B)
- `lib/prompts/final.ts` - Final solve prompt (Phase C)
- `lib/prompts/questionExtraction.ts` - PDF extraction prompt

### Caching
- `lib/scaffoldCache.ts` - In-memory scaffold cache (15min TTL)
- `lib/question-engine/kv-store.ts` - Redis/KV operations for questions

### AI Control
- `lib/ai/controlledAi.ts` - Quota system, caching config, fallbacks

### API Routes (AI-powered)
- `app/api/scaffold/outline/route.ts`
- `app/api/scaffold/step/route.ts`
- `app/api/solve/final/route.ts`
- `app/api/socratic-tutor/route.ts`
- `app/api/socratic-rewind/route.ts`
- `app/api/feynman-validate/route.ts`
- `app/api/generate-hint/route.ts`
- `app/api/paper-solution/analyze/route.ts`
- `app/api/spot-mistake/generate/route.ts`
- `app/api/concept-contrast/route.ts`
- `app/api/questions/extract/route.ts`

### Static Data (No AI needed)
- `data/questions.json` - Question bank
- `data/scaffolds.json` - Pre-built scaffolds
- `lib/drillBank.ts` - Remedial drill content
- `data/studyPlanV2/*.json` - Pattern tracks, skills

---

## Appendix B: Cost Estimation Model

**Current Anthropic Pricing (Claude Sonnet 4):**
- Input: $3 / 1M tokens
- Output: $15 / 1M tokens

**Average Token Usage by Feature:**

| Feature | Input Tokens | Output Tokens | Cost/Call |
|---------|--------------|---------------|-----------|
| Scaffold Outline | 2,500 | 1,500 | $0.030 |
| Step Expansion | 1,500 | 2,000 | $0.035 |
| Final Solve | 1,000 | 800 | $0.015 |
| Socratic Chat | 1,200 | 600 | $0.013 |
| Feynman Validation | 1,000 | 500 | $0.011 |
| Hint Generation | 800 | 400 | $0.008 |
| PDF Extraction | 5,000 | 4,000 | $0.075 |

**Monthly Projection (10K DAU, current state):**
- ~30K scaffold generations × $0.08 = $2,400
- ~50K step expansions × $0.035 = $1,750
- ~80K socratic exchanges × $0.013 = $1,040
- **Total: ~$5,200/month**

**After Optimization:**
- Scaffold cache hits: 80% → $480
- Precomputed hints: -$350
- Feynman quick-reject: -$200
- **Total: ~$4,200/month (20% reduction)**

---

*Document generated as part of LLM cost/latency audit. Last updated: 2026-01-07*
