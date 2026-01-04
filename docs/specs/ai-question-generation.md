# AI Question Generation Specification

## Overview

AI-generated questions are a **fallback mechanism** when the curated question database is exhausted. This specification defines strict controls to ensure quality, prevent abuse, and maintain audit trails.

---

## 1. Generation Contract

### 1.1 Required Inputs

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | Requesting user's ID |
| `patternId` | string | Yes | Target pattern (must exist in pattern registry) |
| `difficulty` | integer (1-5) | Yes | Target difficulty level |
| `sourceQuestionId` | string | Yes | Reference question for context |
| `triggerReason` | enum | Yes | Why generation was triggered |

### 1.2 Trigger Reasons

```
TRIGGER_REASONS:
  - pool_exhausted        # No more DB questions for this pattern+difficulty
  - user_requested        # User explicitly requested a new question
  - remediation_needed    # System determined user needs more practice
```

### 1.3 Context Inputs (Extracted from Source Question)

| Field | Type | Description |
|-------|------|-------------|
| `scenarioType` | string | Physics scenario (inclined_plane, projectile, etc.) |
| `givenQuantities` | array | List of given quantities with types |
| `askedQuantities` | array | List of quantities to find |
| `constraints` | array | Physical constraints (frictionless, massless, etc.) |
| `topicTags` | array | Topic classification |
| `metaSkillTags` | array | Required meta-skills |

### 1.4 Generation Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `model` | claude-3-haiku | Cost-efficient model for generation |
| `temperature` | 0.7 | Moderate creativity |
| `maxTokens` | 4000 | Maximum response length |
| `promptTemplateId` | question-gen-v1 | Versioned prompt template |

---

## 2. Pre-Generation Validation Checklist

All checks must pass before generation proceeds.

### 2.1 Pattern Validation

```
CHECK: Pattern exists
  - Query: SELECT 1 FROM patterns WHERE pattern_id = $patternId AND is_active = true
  - Fail action: REJECT with "invalid_pattern"
```

### 2.2 Difficulty Validation

```
CHECK: Difficulty is valid
  - Condition: 1 <= difficulty <= 5
  - Fail action: REJECT with "invalid_difficulty"
```

### 2.3 Source Question Validation

```
CHECK: Source question exists and is approved
  - Query: SELECT 1 FROM questions
           WHERE question_id = $sourceQuestionId
           AND lifecycle_state = 'approved'
  - Fail action: REJECT with "invalid_source_question"
```

### 2.4 User Daily Quota Check

```
CHECK: User has not exceeded daily AI generation quota
  - Query: SELECT COALESCE(SUM(used_count), 0)
           FROM user_ai_quota
           WHERE user_id = $userId
           AND feature_type = 'question_generation'
           AND quota_date = CURRENT_DATE
  - Limit: 5 per user per day
  - Fail action: REJECT with "user_daily_quota_exceeded"
```

### 2.5 Pattern Daily Quota Check

```
CHECK: User has not exceeded per-pattern daily quota
  - Query: SELECT COUNT(*)
           FROM questions q
           JOIN user_question_history uqh ON uqh.question_id = q.question_id
           WHERE uqh.user_id = $userId
           AND q.provenance = 'ai_generated'
           AND q.primary_pattern_id = $patternId
           AND DATE(uqh.started_at) = CURRENT_DATE
  - Limit: 2 per pattern per user per day
  - Fail action: REJECT with "pattern_daily_quota_exceeded"
```

### 2.6 Pool Exhaustion Verification

```
CHECK: Database pool is actually exhausted
  - Query: SELECT COUNT(*)
           FROM questions q
           WHERE q.primary_pattern_id = $patternId
           AND q.difficulty = $difficulty
           AND q.lifecycle_state = 'approved'
           AND q.question_id NOT IN (
             SELECT question_id FROM user_question_history WHERE user_id = $userId
           )
  - Condition: count = 0
  - Fail action: REJECT with "pool_not_exhausted" (use DB questions instead)
```

### 2.7 Reusable AI Question Check

```
CHECK: No existing AI question can be reused
  - Query: SELECT question_id
           FROM questions
           WHERE primary_pattern_id = $patternId
           AND difficulty = $difficulty
           AND provenance = 'ai_generated'
           AND lifecycle_state IN ('approved', 'draft')
           AND question_id NOT IN (
             SELECT question_id FROM user_question_history WHERE user_id = $userId
           )
           LIMIT 1
  - If found: REUSE existing question instead of generating
  - If not found: PROCEED with generation
```

---

## 3. Generation Rules

### 3.1 Originality Requirements

| Rule | Description |
|------|-------------|
| **Unique scenario** | Must use different real-world context than source |
| **Different values** | Numerical values must differ by ≥20% from source |
| **Original wording** | Question text must be written from scratch |
| **No paraphrasing** | Cannot reword source question text |

### 3.2 Structural Requirements

| Rule | Description |
|------|-------------|
| **Same pattern** | Must follow the exact same solution pattern |
| **Same difficulty** | Must match requested difficulty level |
| **Same physics** | Must test identical physics concepts |
| **Valid schema** | Must conform to question.v2 schema |

### 3.3 Content Requirements

| Field | Requirement |
|-------|-------------|
| `steps` | Minimum 3 steps, maximum 8 steps |
| `explanations` | Each step must have micro + conceptual explanations |
| `mistakeMapping` | At least 2 mistake mappings for key steps |
| `solutions.synthesis` | At least 3 synthesis points |
| `solutions.limitingCases` | At least 1 limiting case |

### 3.4 Prohibited Content

| Prohibition | Reason |
|-------------|--------|
| Copyrighted problem text | Legal compliance |
| Real exam questions (JEE, NEET, etc.) | Copyright and fairness |
| Unrealistic scenarios | Pedagogical quality |
| Ambiguous problem statements | Student confusion |
| Multiple valid interpretations | Grading issues |

---

## 4. Post-Generation Validation

### 4.1 Schema Validation

```
VALIDATE: Output conforms to question.v2 schema
  - Tool: JSON Schema validator (ajv)
  - Fail action: REJECT with "schema_validation_failed"
```

### 4.2 Physics Validation

```
VALIDATE: Numerical answers are correct
  - Method: Independent computation using given values
  - Tolerance: ±1% for calculated answers
  - Fail action: REJECT with "answer_validation_failed"
```

### 4.3 Completeness Validation

```
VALIDATE: All required fields are populated
  - Required: title, prompt.text, steps[].prompt, solutions.finalAnswer
  - Fail action: REJECT with "incomplete_question"
```

### 4.4 Originality Validation

```
VALIDATE: Question is sufficiently original
  - Method: Embedding similarity against source question
  - Threshold: similarity < 0.4
  - Fail action: REJECT with "insufficient_originality"
```

---

## 5. Storage Rules

### 5.1 Question Record

```
INSERT INTO questions:
  question_id         = generate_question_id(patternId, 'ai')
  schema_version      = 'question.v2'
  primary_pattern_id  = $patternId
  difficulty          = $difficulty
  topic_tags          = [extracted from source]
  lifecycle_state     = 'draft'           # Always starts as draft
  provenance          = 'ai_generated'    # Required marker
  payload             = [generated question JSON]
  is_ai_generated     = true
  ai_model            = $model
  ai_generated_at     = NOW()
  ai_human_reviewed   = false
```

### 5.2 Provenance Metadata (in payload)

```json
{
  "provenance": {
    "origin": "ai_generated",
    "ingestedAt": "2026-01-03T10:30:00Z",
    "ingestedBy": "system:question-generator",
    "processingNotes": "Generated via question-gen-v1 prompt template"
  },
  "aiMetadata": {
    "model": "claude-3-haiku",
    "modelVersion": "20240307",
    "promptTemplateId": "question-gen-v1",
    "promptTemplateVersion": 1,
    "generatedAt": "2026-01-03T10:30:00Z",
    "generationParams": {
      "temperature": 0.7,
      "maxTokens": 4000
    },
    "confidenceScore": 0.85,
    "humanReviewed": false,
    "aiGeneratedFields": [
      "prompt.text",
      "prompt.context",
      "steps[*].prompt",
      "steps[*].explanations",
      "steps[*].mistakeMapping",
      "solutions.synthesis",
      "solutions.fullDerivation"
    ]
  }
}
```

### 5.3 Tag Records

```
INSERT INTO question_tags (for each pattern tag):
  question_id = $newQuestionId
  tag_type    = 'pattern'
  tag_value   = $patternId

INSERT INTO question_tags (for each topic tag):
  question_id = $newQuestionId
  tag_type    = 'topic'
  tag_value   = $topicTag
```

### 5.4 Quota Update

```
UPSERT INTO user_ai_quota:
  user_id        = $userId
  feature_type   = 'question_generation'
  quota_date     = CURRENT_DATE
  used_count     = used_count + 1
  max_allowed    = 5
  tokens_used    = tokens_used + $inputTokens + $outputTokens
  estimated_cost = estimated_cost + $costUsd
  last_used_at   = NOW()
```

### 5.5 Audit Log

```
INSERT INTO ai_generation_log:
  user_id              = $userId
  feature_type         = 'question_generation'
  question_id          = $newQuestionId
  model                = $model
  prompt_template_id   = 'question-gen-v1'
  prompt_template_ver  = 1
  input_tokens         = $inputTokens
  output_tokens        = $outputTokens
  latency_ms           = $latencyMs
  estimated_cost_usd   = $costUsd
  success              = true
```

---

## 6. Reuse Strategy

### 6.1 Reuse Priority Order

```
1. Approved AI questions for same pattern+difficulty (highest priority)
2. Draft AI questions for same pattern+difficulty
3. Approved AI questions for same pattern, adjacent difficulty (±1)
4. Generate new question (lowest priority)
```

### 6.2 Reuse Query

```sql
SELECT q.question_id, q.lifecycle_state, q.difficulty
FROM questions q
WHERE q.primary_pattern_id = $patternId
  AND q.provenance = 'ai_generated'
  AND q.lifecycle_state IN ('approved', 'draft')
  AND q.question_id NOT IN (
    SELECT question_id FROM user_question_history WHERE user_id = $userId
  )
ORDER BY
  CASE
    WHEN q.difficulty = $targetDifficulty AND q.lifecycle_state = 'approved' THEN 1
    WHEN q.difficulty = $targetDifficulty AND q.lifecycle_state = 'draft' THEN 2
    WHEN ABS(q.difficulty - $targetDifficulty) = 1 AND q.lifecycle_state = 'approved' THEN 3
    ELSE 4
  END,
  q.created_at DESC
LIMIT 1;
```

### 6.3 Reuse Benefits

| Benefit | Description |
|---------|-------------|
| **Cost reduction** | No API call needed for reused questions |
| **Quality improvement** | Approved questions have been human-reviewed |
| **Quota preservation** | Reuse counts toward quota but doesn't trigger generation |
| **Database growth** | AI questions accumulate for future reuse |

---

## 7. Rejection Conditions

### 7.1 Pre-Generation Rejections

| Code | Condition | User Message |
|------|-----------|--------------|
| `invalid_pattern` | Pattern not found or inactive | "This practice pattern is not available." |
| `invalid_difficulty` | Difficulty out of range | "Invalid difficulty level." |
| `invalid_source_question` | Source question not approved | "Reference question is not available." |
| `user_daily_quota_exceeded` | User hit 5/day limit | "You've reached your daily practice limit. Try again tomorrow." |
| `pattern_daily_quota_exceeded` | User hit 2/pattern/day limit | "You've practiced this pattern enough today. Try a different topic." |
| `pool_not_exhausted` | DB questions still available | N/A (internal, use DB question instead) |

### 7.2 Post-Generation Rejections

| Code | Condition | Action |
|------|-----------|--------|
| `schema_validation_failed` | Invalid JSON structure | Log error, retry once, then fail |
| `answer_validation_failed` | Incorrect computed answers | Log error, retry once, then fail |
| `incomplete_question` | Missing required fields | Log error, retry once, then fail |
| `insufficient_originality` | Too similar to source | Log error, retry with different seed |

### 7.3 System Rejections

| Code | Condition | Action |
|------|-----------|--------|
| `model_unavailable` | AI service down | Return error, do not charge quota |
| `rate_limited` | AI API rate limit | Return error, do not charge quota |
| `timeout` | Generation took >30s | Return error, do not charge quota |
| `budget_exceeded` | Monthly AI budget hit | Disable AI generation globally |

---

## 8. Quota Configuration

### 8.1 Default Limits

| Limit | Value | Rationale |
|-------|-------|-----------|
| User daily total | 5 | Prevent abuse, encourage curated content |
| User per-pattern daily | 2 | Ensure topic diversity |
| Global monthly budget | $500 | Cost control |
| Single generation timeout | 30s | User experience |

### 8.2 Quota Reset

```
Quotas reset at: 00:00 UTC daily
Monthly budget resets at: 00:00 UTC on 1st of month
```

### 8.3 Quota Monitoring

```sql
-- Daily usage dashboard query
SELECT
  DATE(created_at) as date,
  COUNT(*) as generations,
  SUM(input_tokens + output_tokens) as total_tokens,
  SUM(estimated_cost_usd) as total_cost,
  COUNT(DISTINCT user_id) as unique_users
FROM ai_generation_log
WHERE feature_type = 'question_generation'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 9. Lifecycle Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AI Question Lifecycle                            │
└─────────────────────────────────────────────────────────────────────────┘

User Request
     │
     ▼
┌─────────────────┐     ┌─────────────────┐
│ Pre-Validation  │────▶│    REJECTED     │
│   (7 checks)    │ fail│                 │
└────────┬────────┘     └─────────────────┘
         │ pass
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Check Reusable  │────▶│  REUSE (done)   │
│   AI Questions  │found│                 │
└────────┬────────┘     └─────────────────┘
         │ not found
         ▼
┌─────────────────┐     ┌─────────────────┐
│   AI Generate   │────▶│  RETRY (once)   │
│                 │ fail│                 │
└────────┬────────┘     └────────┬────────┘
         │ success               │ fail
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ Post-Validation │     │    REJECTED     │
│   (4 checks)    │     │   + log error   │
└────────┬────────┘     └─────────────────┘
         │ pass
         ▼
┌─────────────────┐
│  Save to DB     │
│  state='draft'  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Update Quota   │
│  + Audit Log    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Serve to User  │────▶│  Human Review   │────▶│    APPROVED     │
│                 │     │   (async)       │     │  (reusable)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 10. Metrics & Monitoring

### 10.1 Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Generation success rate | >95% | <90% |
| Average latency | <10s | >20s |
| Daily cost | <$20 | >$30 |
| Reuse rate | >30% | <20% |
| Human approval rate | >80% | <60% |

### 10.2 Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| High failure rate | >10% in 1 hour | Page on-call |
| Budget warning | >80% monthly budget | Notify team |
| Budget exceeded | 100% monthly budget | Disable generation |
| Model degradation | Approval rate <60% | Review prompt template |

---

## 11. Prompt Template Versioning

### 11.1 Template Registry

| Field | Description |
|-------|-------------|
| `templateId` | Unique identifier (e.g., "question-gen-v1") |
| `version` | Integer version number |
| `status` | active, deprecated, testing |
| `createdAt` | When this version was created |
| `systemPrompt` | The system prompt text |
| `userPromptTemplate` | User prompt with placeholders |

### 11.2 Version Control

```
- Only ONE template version can be 'active' at a time
- Old versions are marked 'deprecated' but retained for audit
- New versions start as 'testing' before promotion
- All generations log the exact templateId + version used
```

### 11.3 A/B Testing

```
- 'testing' templates can be deployed to 10% of traffic
- Compare approval rates between versions
- Promote winning version after statistical significance
```
