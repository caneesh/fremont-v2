# Question Selection Algorithm

## Input

```typescript
interface SelectionRequest {
  userId: string;
  currentQuestionId: string;
  requestType: 'same_difficulty' | 'harder';
  currentPatternId: string;
  currentDifficulty: number; // 1-5
}
```

## Output

```typescript
interface SelectionResult {
  questionId: string;
  source: 'curated_edge' | 'pool_query' | 'ai_generated';
  isNewAiQuestion: boolean;
}
```

---

## Algorithm

```
FUNCTION selectNextQuestion(request: SelectionRequest) -> SelectionResult | null

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: Compute target difficulty
  // ═══════════════════════════════════════════════════════════════════════════

  IF request.requestType == 'same_difficulty' THEN
    targetDifficulty = request.currentDifficulty
    edgeType = 'same_difficulty'
  ELSE IF request.requestType == 'harder' THEN
    targetDifficulty = MIN(request.currentDifficulty + 1, 5)
    edgeType = 'harder'
  END IF

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: Get user's attempted question IDs (for exclusion)
  // ═══════════════════════════════════════════════════════════════════════════

  attemptedIds = QUERY:
    SELECT question_id
    FROM user_question_history
    WHERE user_id = request.userId

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: Try curated edges first
  // ═══════════════════════════════════════════════════════════════════════════

  curatedQuestion = QUERY:
    SELECT qe.to_question_id
    FROM question_edges qe
    JOIN questions q ON q.id = qe.to_question_id
    WHERE qe.from_question_id = (
      SELECT id FROM questions WHERE question_id = request.currentQuestionId
    )
    AND qe.edge_type = edgeType
    AND q.lifecycle_state = 'approved'
    AND q.question_id NOT IN attemptedIds
    ORDER BY qe.weight DESC, RANDOM()
    LIMIT 1

  IF curatedQuestion IS NOT NULL THEN
    RETURN {
      questionId: curatedQuestion.to_question_id,
      source: 'curated_edge',
      isNewAiQuestion: false
    }
  END IF

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: Try pool query (same pattern, target difficulty)
  // ═══════════════════════════════════════════════════════════════════════════

  poolQuestion = QUERY:
    SELECT q.question_id
    FROM questions q
    WHERE q.primary_pattern_id = request.currentPatternId
    AND q.difficulty = targetDifficulty
    AND q.lifecycle_state = 'approved'
    AND q.question_id != request.currentQuestionId
    AND q.question_id NOT IN attemptedIds
    ORDER BY
      -- Prefer human-authored over AI
      CASE WHEN q.provenance = 'ai_generated' THEN 1 ELSE 0 END,
      -- Then by recency
      q.created_at DESC
    LIMIT 1

  IF poolQuestion IS NOT NULL THEN
    RETURN {
      questionId: poolQuestion.question_id,
      source: 'pool_query',
      isNewAiQuestion: false
    }
  END IF

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5: Expand pool query (same pattern, difficulty range)
  // ═══════════════════════════════════════════════════════════════════════════

  IF request.requestType == 'harder' THEN
    -- Try any question harder than current
    expandedPoolQuestion = QUERY:
      SELECT q.question_id
      FROM questions q
      WHERE q.primary_pattern_id = request.currentPatternId
      AND q.difficulty > request.currentDifficulty
      AND q.lifecycle_state = 'approved'
      AND q.question_id != request.currentQuestionId
      AND q.question_id NOT IN attemptedIds
      ORDER BY
        q.difficulty ASC,
        CASE WHEN q.provenance = 'ai_generated' THEN 1 ELSE 0 END,
        q.created_at DESC
      LIMIT 1

    IF expandedPoolQuestion IS NOT NULL THEN
      RETURN {
        questionId: expandedPoolQuestion.question_id,
        source: 'pool_query',
        isNewAiQuestion: false
      }
    END IF
  END IF

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 6: Try related patterns (same difficulty)
  // ═══════════════════════════════════════════════════════════════════════════

  relatedPatternQuestion = QUERY:
    SELECT q.question_id
    FROM questions q
    JOIN question_tags qt ON qt.question_id = q.id
    WHERE qt.tag_type = 'pattern'
    AND qt.tag_value IN (
      SELECT tag_value
      FROM question_tags
      WHERE question_id = (
        SELECT id FROM questions WHERE question_id = request.currentQuestionId
      )
      AND tag_type = 'pattern'
    )
    AND q.difficulty = targetDifficulty
    AND q.lifecycle_state = 'approved'
    AND q.question_id != request.currentQuestionId
    AND q.question_id NOT IN attemptedIds
    ORDER BY
      CASE WHEN q.provenance = 'ai_generated' THEN 1 ELSE 0 END,
      RANDOM()
    LIMIT 1

  IF relatedPatternQuestion IS NOT NULL THEN
    RETURN {
      questionId: relatedPatternQuestion.question_id,
      source: 'pool_query',
      isNewAiQuestion: false
    }
  END IF

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 7: AI fallback gate checks
  // ═══════════════════════════════════════════════════════════════════════════

  today = DATE(NOW())

  -- Check global AI quota for user
  userAiCount = QUERY:
    SELECT COALESCE(SUM(used_count), 0) as total
    FROM user_ai_quota
    WHERE user_id = request.userId
    AND feature_type = 'question_generation'
    AND quota_date = today

  IF userAiCount >= 5 THEN
    RETURN null  -- Quota exhausted, no fallback
  END IF

  -- Check per-pattern AI quota for user
  patternAiCount = QUERY:
    SELECT COUNT(*)
    FROM questions q
    JOIN user_question_history uqh ON uqh.question_id = q.question_id
    WHERE uqh.user_id = request.userId
    AND q.provenance = 'ai_generated'
    AND q.primary_pattern_id = request.currentPatternId
    AND DATE(uqh.started_at) = today

  IF patternAiCount >= 2 THEN
    RETURN null  -- Per-pattern limit reached
  END IF

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 8: Check for reusable AI questions
  // ═══════════════════════════════════════════════════════════════════════════

  reusableAiQuestion = QUERY:
    SELECT q.question_id
    FROM questions q
    WHERE q.primary_pattern_id = request.currentPatternId
    AND q.difficulty = targetDifficulty
    AND q.provenance = 'ai_generated'
    AND q.lifecycle_state IN ('approved', 'draft')
    AND q.question_id != request.currentQuestionId
    AND q.question_id NOT IN attemptedIds
    ORDER BY
      CASE WHEN q.lifecycle_state = 'approved' THEN 0 ELSE 1 END,
      q.created_at DESC
    LIMIT 1

  IF reusableAiQuestion IS NOT NULL THEN
    -- Increment quota counter
    UPSERT user_ai_quota:
      user_id = request.userId,
      feature_type = 'question_generation',
      quota_date = today,
      used_count = used_count + 1,
      max_allowed = 5

    RETURN {
      questionId: reusableAiQuestion.question_id,
      source: 'ai_generated',
      isNewAiQuestion: false
    }
  END IF

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 9: Generate new AI question
  // ═══════════════════════════════════════════════════════════════════════════

  -- Load source question for context
  sourceQuestion = QUERY:
    SELECT payload, primary_pattern_id, difficulty
    FROM questions
    WHERE question_id = request.currentQuestionId

  -- Generate via AI service
  aiResult = CALL generateQuestion({
    patternId: request.currentPatternId,
    targetDifficulty: targetDifficulty,
    sourceQuestionPayload: sourceQuestion.payload,
    userId: request.userId
  })

  IF aiResult.success == false THEN
    RETURN null
  END IF

  -- Save AI question to database
  newQuestionId = generateQuestionId(request.currentPatternId, 'ai')

  INSERT INTO questions:
    question_id = newQuestionId,
    schema_version = 'question.v2',
    primary_pattern_id = request.currentPatternId,
    difficulty = targetDifficulty,
    topic_tags = sourceQuestion.topic_tags,
    lifecycle_state = 'draft',
    provenance = 'ai_generated',
    payload = aiResult.questionPayload,
    is_ai_generated = true,
    ai_model = aiResult.model,
    ai_generated_at = NOW(),
    ai_human_reviewed = false

  -- Insert tags
  FOR EACH tag IN aiResult.questionPayload.classification.patternTags:
    INSERT INTO question_tags:
      question_id = newQuestion.id,
      tag_type = 'pattern',
      tag_value = tag

  -- Log AI generation
  INSERT INTO ai_generation_log:
    user_id = request.userId,
    feature_type = 'question_generation',
    question_id = newQuestionId,
    model = aiResult.model,
    prompt_template_id = aiResult.promptTemplateId,
    prompt_template_version = aiResult.promptTemplateVersion,
    input_tokens = aiResult.inputTokens,
    output_tokens = aiResult.outputTokens,
    latency_ms = aiResult.latencyMs,
    estimated_cost_usd = aiResult.estimatedCost,
    success = true

  -- Increment quota counter
  UPSERT user_ai_quota:
    user_id = request.userId,
    feature_type = 'question_generation',
    quota_date = today,
    used_count = used_count + 1,
    max_allowed = 5,
    tokens_used = tokens_used + aiResult.inputTokens + aiResult.outputTokens,
    estimated_cost_usd = estimated_cost_usd + aiResult.estimatedCost,
    last_used_at = NOW()

  RETURN {
    questionId: newQuestionId,
    source: 'ai_generated',
    isNewAiQuestion: true
  }

END FUNCTION
```

---

## Decision Flowchart

```
┌─────────────────────────────────────────┐
│         selectNextQuestion()            │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  1. Compute target difficulty           │
│     same_difficulty → keep current      │
│     harder → current + 1 (max 5)        │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  2. Load user's attempted question IDs  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  3. Query curated edges                 │
│     (question_edges WHERE edge_type)    │
└─────────────────┬───────────────────────┘
                  │
          ┌───────┴───────┐
          │ Found?        │
          └───────┬───────┘
         YES      │      NO
          │       │       │
          ▼       │       ▼
     ┌────────┐   │  ┌─────────────────────────────────────────┐
     │ RETURN │   │  │  4. Query pool (same pattern, target    │
     │ curated│   │  │     difficulty, exclude attempted)      │
     └────────┘   │  └─────────────────┬───────────────────────┘
                  │                    │
                  │            ┌───────┴───────┐
                  │            │ Found?        │
                  │            └───────┬───────┘
                  │           YES      │      NO
                  │            │       │       │
                  │            ▼       │       ▼
                  │       ┌────────┐   │  ┌─────────────────────────────────────────┐
                  │       │ RETURN │   │  │  5. Expand pool (harder: any difficulty │
                  │       │ pool   │   │  │     above current)                      │
                  │       └────────┘   │  └─────────────────┬───────────────────────┘
                  │                    │                    │
                  │                    │            ┌───────┴───────┐
                  │                    │            │ Found?        │
                  │                    │            └───────┬───────┘
                  │                    │           YES      │      NO
                  │                    │            │       │       │
                  │                    │            ▼       │       ▼
                  │                    │       ┌────────┐   │  ┌─────────────────────────────────────────┐
                  │                    │       │ RETURN │   │  │  6. Query related patterns             │
                  │                    │       │ pool   │   │  │     (same topic tags, target difficulty)│
                  │                    │       └────────┘   │  └─────────────────┬───────────────────────┘
                  │                    │                    │                    │
                  │                    │                    │            ┌───────┴───────┐
                  │                    │                    │            │ Found?        │
                  │                    │                    │            └───────┬───────┘
                  │                    │                    │           YES      │      NO
                  │                    │                    │            │       │       │
                  │                    │                    │            ▼       │       ▼
                  │                    │                    │       ┌────────┐   │  ┌─────────────────────────────────────────┐
                  │                    │                    │       │ RETURN │   │  │  7. Check AI quotas                    │
                  │                    │                    │       │ pool   │   │  │     - user daily: < 5?                 │
                  │                    │                    │       └────────┘   │  │     - pattern daily: < 2?              │
                  │                    │                    │                    │  └─────────────────┬───────────────────────┘
                  │                    │                    │                    │                    │
                  │                    │                    │                    │            ┌───────┴───────┐
                  │                    │                    │                    │            │ Quota OK?     │
                  │                    │                    │                    │            └───────┬───────┘
                  │                    │                    │                    │           YES      │      NO
                  │                    │                    │                    │            │       │       │
                  │                    │                    │                    │            ▼       │       ▼
                  │                    │                    │                    │  ┌──────────────┐  │  ┌────────┐
                  │                    │                    │                    │  │ 8. Check     │  │  │ RETURN │
                  │                    │                    │                    │  │ reusable AI  │  │  │ null   │
                  │                    │                    │                    │  └──────┬───────┘  │  └────────┘
                  │                    │                    │                    │         │          │
                  │                    │                    │                    │ ┌───────┴───────┐  │
                  │                    │                    │                    │ │ Found?        │  │
                  │                    │                    │                    │ └───────┬───────┘  │
                  │                    │                    │                    │YES      │      NO  │
                  │                    │                    │                    │ │       │       │  │
                  │                    │                    │                    │ ▼       │       ▼  │
                  │                    │                    │                    │┌────────┐│ ┌─────────────────┐
                  │                    │                    │                    ││ RETURN ││ │ 9. Generate new │
                  │                    │                    │                    ││ AI     ││ │    AI question  │
                  │                    │                    │                    ││(reused)││ │    Save to DB   │
                  │                    │                    │                    │└────────┘│ │    RETURN AI    │
                  │                    │                    │                    │          │ └─────────────────┘
```

---

## SQL Queries (Prisma-ready)

### Query 1: Get Attempted Question IDs

```sql
-- Prisma: prisma.userQuestionHistory.findMany({ where: { userId }, select: { questionId: true } })

SELECT question_id
FROM user_question_history
WHERE user_id = $1;
```

### Query 2: Curated Edge Lookup

```sql
-- Prisma: raw query recommended for performance

SELECT q.question_id
FROM question_edges qe
INNER JOIN questions q ON q.id = qe.to_question_id
WHERE qe.from_question_id = $1  -- current question internal ID
  AND qe.edge_type = $2         -- 'same_difficulty' or 'harder'
  AND q.lifecycle_state = 'approved'
  AND q.question_id NOT IN (
    SELECT question_id FROM user_question_history WHERE user_id = $3
  )
ORDER BY qe.weight DESC, RANDOM()
LIMIT 1;
```

### Query 3: Pool Query (Same Pattern, Target Difficulty)

```sql
SELECT q.question_id
FROM questions q
WHERE q.primary_pattern_id = $1
  AND q.difficulty = $2
  AND q.lifecycle_state = 'approved'
  AND q.question_id != $3
  AND q.question_id NOT IN (
    SELECT question_id FROM user_question_history WHERE user_id = $4
  )
ORDER BY
  CASE WHEN q.provenance = 'ai_generated' THEN 1 ELSE 0 END,
  q.created_at DESC
LIMIT 1;
```

### Query 4: Expanded Pool (Any Harder Difficulty)

```sql
SELECT q.question_id
FROM questions q
WHERE q.primary_pattern_id = $1
  AND q.difficulty > $2
  AND q.lifecycle_state = 'approved'
  AND q.question_id != $3
  AND q.question_id NOT IN (
    SELECT question_id FROM user_question_history WHERE user_id = $4
  )
ORDER BY
  q.difficulty ASC,
  CASE WHEN q.provenance = 'ai_generated' THEN 1 ELSE 0 END,
  q.created_at DESC
LIMIT 1;
```

### Query 5: Related Patterns

```sql
SELECT q.question_id
FROM questions q
INNER JOIN question_tags qt ON qt.question_id = q.id
WHERE qt.tag_type = 'pattern'
  AND qt.tag_value IN (
    SELECT qt2.tag_value
    FROM question_tags qt2
    INNER JOIN questions q2 ON q2.id = qt2.question_id
    WHERE q2.question_id = $1
      AND qt2.tag_type = 'pattern'
  )
  AND q.difficulty = $2
  AND q.lifecycle_state = 'approved'
  AND q.question_id != $1
  AND q.question_id NOT IN (
    SELECT question_id FROM user_question_history WHERE user_id = $3
  )
ORDER BY
  CASE WHEN q.provenance = 'ai_generated' THEN 1 ELSE 0 END,
  RANDOM()
LIMIT 1;
```

### Query 6: User Daily AI Quota Check

```sql
SELECT COALESCE(SUM(used_count), 0) as total
FROM user_ai_quota
WHERE user_id = $1
  AND feature_type = 'question_generation'
  AND quota_date = CURRENT_DATE;
```

### Query 7: Per-Pattern AI Count Check

```sql
SELECT COUNT(*)
FROM questions q
INNER JOIN user_question_history uqh ON uqh.question_id = q.question_id
WHERE uqh.user_id = $1
  AND q.provenance = 'ai_generated'
  AND q.primary_pattern_id = $2
  AND DATE(uqh.started_at) = CURRENT_DATE;
```

### Query 8: Reusable AI Question

```sql
SELECT q.question_id
FROM questions q
WHERE q.primary_pattern_id = $1
  AND q.difficulty = $2
  AND q.provenance = 'ai_generated'
  AND q.lifecycle_state IN ('approved', 'draft')
  AND q.question_id != $3
  AND q.question_id NOT IN (
    SELECT question_id FROM user_question_history WHERE user_id = $4
  )
ORDER BY
  CASE WHEN q.lifecycle_state = 'approved' THEN 0 ELSE 1 END,
  q.created_at DESC
LIMIT 1;
```

### Query 9: Upsert AI Quota

```sql
INSERT INTO user_ai_quota (
  id, user_id, feature_type, quota_date,
  used_count, max_allowed, tokens_used,
  estimated_cost_usd, last_used_at, created_at, updated_at
)
VALUES (
  gen_random_uuid(), $1, 'question_generation', CURRENT_DATE,
  1, 5, $2, $3, NOW(), NOW(), NOW()
)
ON CONFLICT (user_id, feature_type, quota_date)
DO UPDATE SET
  used_count = user_ai_quota.used_count + 1,
  tokens_used = user_ai_quota.tokens_used + $2,
  estimated_cost_usd = user_ai_quota.estimated_cost_usd + $3,
  last_used_at = NOW(),
  updated_at = NOW();
```

---

## Constants

```typescript
const SELECTION_CONSTANTS = {
  MAX_AI_QUESTIONS_PER_USER_PER_DAY: 5,
  MAX_AI_QUESTIONS_PER_PATTERN_PER_DAY: 2,
  MAX_DIFFICULTY: 5,
  MIN_DIFFICULTY: 1,
  DIFFICULTY_INCREMENT: 1,
} as const;
```

---

## Error States

| Condition | Return Value | Client Message |
|-----------|--------------|----------------|
| No curated edges, no pool questions, quota exhausted | `null` | "No more questions available for this pattern. Try a different topic." |
| AI generation failed | `null` | "Unable to generate a new question. Please try again." |
| Database error | throw | "Something went wrong. Please try again." |
