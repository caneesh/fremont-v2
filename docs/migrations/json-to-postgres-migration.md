# Migration Plan: JSON Files → Neon Postgres

## Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  JSON Files     │────▶│  Migration      │────▶│  Neon Postgres  │
│  (question.v1)  │     │  Pipeline       │     │  (question.v2)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Phase 1: Pre-Migration

### 1.1 Inventory Source Files

```bash
# Count and catalog all question JSON files
find ./data/questions -name "*.json" -type f | wc -l

# Generate inventory
find ./data/questions -name "*.json" -type f -exec basename {} \; > migration_inventory.txt
```

### 1.2 Validate Source Files

```
FOR EACH file IN ./data/questions/*.json:
  1. Parse JSON (fail if invalid)
  2. Validate against question.v1 schema
  3. Record validation result to migration_log
  4. Count: valid, invalid, skipped
```

### 1.3 Create Migration Tables

```sql
-- Migration tracking table
CREATE TABLE migration_log (
  id              SERIAL PRIMARY KEY,
  source_file     TEXT NOT NULL,
  question_id     TEXT,
  status          TEXT NOT NULL,  -- 'pending', 'migrated', 'failed', 'skipped'
  error_message   TEXT,
  migrated_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_migration_log_status ON migration_log(status);
CREATE INDEX idx_migration_log_question ON migration_log(question_id);

-- Backup table for rollback
CREATE TABLE questions_backup (
  id              TEXT PRIMARY KEY,
  question_id     TEXT NOT NULL,
  original_json   JSONB NOT NULL,
  backed_up_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Phase 2: Field Mapping

### 2.1 Direct Field Mapping (v1 → DB Columns)

| v1 JSON Path | DB Column | Type | Transformation |
|--------------|-----------|------|----------------|
| `questionId` | `question_id` | TEXT | Direct copy |
| `schemaVersion` | `schema_version` | TEXT | Default to "question.v2" |
| `metadata.difficulty` | `difficulty` | SMALLINT | Direct copy |
| `classification.topicTags` | `topic_tags` | TEXT[] | Direct copy |
| `metadata.createdAt` | `created_at` | TIMESTAMPTZ | Parse ISO string |
| `metadata.updatedAt` | `updated_at` | TIMESTAMPTZ | Parse ISO string |
| (entire document) | `payload` | JSONB | Store complete v2 payload |

### 2.2 Derived Field Mapping

| DB Column | Derivation Logic |
|-----------|------------------|
| `primary_pattern_id` | See §2.3 |
| `lifecycle_state` | See §2.4 |
| `provenance` | See §2.5 |
| `is_ai_generated` | See §2.6 |

### 2.3 Derive `primary_pattern_id`

```
PRIORITY ORDER:
  1. IF payload.primaryPatternId EXISTS AND NOT EMPTY:
       RETURN payload.primaryPatternId

  2. ELSE IF payload.classification.patternTags[0] EXISTS:
       RETURN payload.classification.patternTags[0]

  3. ELSE IF payload.authoring.canonicalPatterns[0] EXISTS:
       RETURN payload.authoring.canonicalPatterns[0]

  4. ELSE IF payload.steps[0].pattern EXISTS:
       RETURN payload.steps[0].pattern

  5. ELSE:
       RETURN NULL (will require manual review)
```

### 2.4 Derive `lifecycle_state`

```
IF payload.authoring.reviewStatus EXISTS:
  SWITCH payload.authoring.reviewStatus:
    'draft'    → 'draft'
    'review'   → 'review'
    'approved' → 'approved'
    DEFAULT    → 'draft'

ELSE IF payload.metadata.source.kind = 'original':
  RETURN 'approved'  -- Original content assumed approved

ELSE:
  RETURN 'draft'  -- Conservative default
```

### 2.5 Derive `provenance`

```
IF payload.provenance.origin EXISTS:
  RETURN payload.provenance.origin  -- Already v2 format

ELSE IF payload.metadata.source.kind EXISTS:
  SWITCH payload.metadata.source.kind:
    'original' → 'manual'
    'jee'      → 'imported'
    'neet'     → 'imported'
    'cbse'     → 'imported'
    'ncert'    → 'imported'
    'book'     → 'imported'
    'other'    → 'imported'
    DEFAULT    → 'manual'

ELSE:
  RETURN 'manual'
```

### 2.6 Derive `is_ai_generated`

```
IF payload.aiMetadata EXISTS:
  RETURN true

ELSE IF payload.provenance.origin = 'ai_generated':
  RETURN true

ELSE IF payload.metadata.source.reference CONTAINS 'AI':
  RETURN true

ELSE:
  RETURN false
```

---

## Phase 3: Backfill Strategy

### 3.1 Missing Required Fields

| Field | Backfill Value | Condition |
|-------|----------------|-----------|
| `schema_version` | "question.v2" | Always |
| `difficulty` | 3 | If missing |
| `created_at` | File modification time | If missing |
| `updated_at` | NOW() | If missing |
| `lifecycle_state` | 'draft' | If cannot derive |
| `provenance` | 'manual' | If cannot derive |

### 3.2 Upgrade v1 Payload to v2

```
FUNCTION upgradePayload(v1Payload) -> v2Payload:
  v2Payload = COPY(v1Payload)

  -- Add schemaVersion
  v2Payload.schemaVersion = "question.v2"

  -- Add secondaryPatternIds if missing
  IF v2Payload.secondaryPatternIds IS NULL:
    v2Payload.secondaryPatternIds = []
    IF v2Payload.classification.patternTags.length > 1:
      v2Payload.secondaryPatternIds = v2Payload.classification.patternTags.slice(1)

  -- Add provenance if missing
  IF v2Payload.provenance IS NULL:
    v2Payload.provenance = {
      origin: deriveProvenance(v1Payload),
      ingestedAt: NOW(),
      ingestedBy: "migration:v1-to-v2"
    }

  -- Add lifecycle if missing
  IF v2Payload.lifecycle IS NULL:
    v2Payload.lifecycle = {
      state: deriveLifecycleState(v1Payload),
      stateChangedAt: NOW()
    }

  -- Add cognitiveStage to steps if missing
  FOR EACH step IN v2Payload.steps:
    IF step.cognitiveStage IS NULL:
      step.cognitiveStage = deriveCognitiveStage(step)

  RETURN v2Payload
```

### 3.3 Derive Cognitive Stage for Steps

```
FUNCTION deriveCognitiveStage(step) -> CognitiveStage:
  SWITCH step.type:
    'INFO'        → 'recall'
    'MCQ_SINGLE'  → IF step.metaSkill = 'problem-classification' THEN 'understand' ELSE 'apply'
    'MCQ_MULTI'   → 'apply'
    'FILL_BLANK'  → 'recall'
    'NUMERIC'     → 'apply'
    'SHORT_TEXT'  → 'understand'
    'DERIVATION'  → 'analyze'
    'DIAGRAM_FBD' → 'apply'
    'CHECKPOINT'  → 'evaluate'
    DEFAULT       → 'apply'
```

---

## Phase 4: Migration Execution

### 4.1 Migration Script Pseudocode

```
FUNCTION migrateQuestions():
  files = listJsonFiles("./data/questions/")
  batchSize = 50
  batches = splitIntoBatches(files, batchSize)

  FOR EACH batch IN batches:
    transaction = BEGIN TRANSACTION

    TRY:
      FOR EACH file IN batch:
        -- Read and parse
        content = readFile(file)
        v1Payload = parseJSON(content)

        -- Validate
        IF NOT validateV1Schema(v1Payload):
          logMigration(file, 'skipped', 'Invalid v1 schema')
          CONTINUE

        -- Check duplicate
        IF questionExists(v1Payload.questionId):
          logMigration(file, 'skipped', 'Duplicate questionId')
          CONTINUE

        -- Transform
        v2Payload = upgradePayload(v1Payload)
        columns = extractColumns(v2Payload)

        -- Insert question
        INSERT INTO questions (
          question_id,
          schema_version,
          primary_pattern_id,
          difficulty,
          topic_tags,
          lifecycle_state,
          provenance,
          payload,
          is_ai_generated,
          ai_model,
          ai_generated_at,
          ai_human_reviewed,
          created_at,
          updated_at
        ) VALUES (
          columns.questionId,
          'question.v2',
          columns.primaryPatternId,
          columns.difficulty,
          columns.topicTags,
          columns.lifecycleState,
          columns.provenance,
          v2Payload,
          columns.isAiGenerated,
          columns.aiModel,
          columns.aiGeneratedAt,
          columns.aiHumanReviewed,
          columns.createdAt,
          NOW()
        )
        RETURNING id INTO questionInternalId

        -- Insert tags
        FOR EACH tag IN v2Payload.classification.patternTags:
          INSERT INTO question_tags (question_id, tag_type, tag_value)
          VALUES (questionInternalId, 'pattern', tag)

        FOR EACH tag IN v2Payload.classification.topicTags:
          INSERT INTO question_tags (question_id, tag_type, tag_value)
          VALUES (questionInternalId, 'topic', tag)

        -- Insert edges from relatedQuestions
        IF v2Payload.relatedQuestions EXISTS:
          FOR EACH id IN v2Payload.relatedQuestions.sameDifficulty:
            INSERT INTO question_edges (from_question_id, to_question_id, edge_type)
            VALUES (questionInternalId, lookupQuestionId(id), 'same_difficulty')
            ON CONFLICT DO NOTHING

          FOR EACH id IN v2Payload.relatedQuestions.harder:
            INSERT INTO question_edges (from_question_id, to_question_id, edge_type)
            VALUES (questionInternalId, lookupQuestionId(id), 'harder')
            ON CONFLICT DO NOTHING

          FOR EACH id IN v2Payload.relatedQuestions.easier:
            INSERT INTO question_edges (from_question_id, to_question_id, edge_type)
            VALUES (questionInternalId, lookupQuestionId(id), 'easier')
            ON CONFLICT DO NOTHING

        -- Log success
        logMigration(file, 'migrated', NULL, v1Payload.questionId)

      COMMIT TRANSACTION

    CATCH error:
      ROLLBACK TRANSACTION
      FOR EACH file IN batch:
        logMigration(file, 'failed', error.message)

  -- Generate report
  generateMigrationReport()
```

### 4.2 Batch Processing Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Batch size | 50 | Balance between atomicity and performance |
| Transaction timeout | 60s | Allow for slow operations |
| Retry attempts | 3 | Handle transient failures |
| Retry delay | 5s | Exponential backoff |

### 4.3 Edge Resolution (Deferred)

```
-- Edges reference question_ids that may not exist yet
-- Run edge resolution after all questions are migrated

FUNCTION resolveEdges():
  -- Find edges with unresolved targets
  unresolvedEdges = SELECT * FROM question_edges
                    WHERE to_question_id NOT IN (SELECT id FROM questions)

  FOR EACH edge IN unresolvedEdges:
    -- Lookup by question_id string
    targetId = SELECT id FROM questions WHERE question_id = edge.to_question_id_string

    IF targetId EXISTS:
      UPDATE question_edges SET to_question_id = targetId WHERE id = edge.id
    ELSE:
      DELETE FROM question_edges WHERE id = edge.id
      LOG "Removed orphan edge: {edge.id}"
```

---

## Phase 5: Validation

### 5.1 Row Count Validation

```sql
-- Compare source and target counts
SELECT
  (SELECT COUNT(*) FROM migration_log WHERE status = 'migrated') as migrated,
  (SELECT COUNT(*) FROM migration_log WHERE status = 'skipped') as skipped,
  (SELECT COUNT(*) FROM migration_log WHERE status = 'failed') as failed,
  (SELECT COUNT(*) FROM questions) as in_database;
```

### 5.2 Data Integrity Checks

```sql
-- Check 1: All questions have valid lifecycle_state
SELECT COUNT(*) FROM questions WHERE lifecycle_state IS NULL;
-- Expected: 0

-- Check 2: All questions have difficulty in range
SELECT COUNT(*) FROM questions WHERE difficulty < 1 OR difficulty > 5;
-- Expected: 0

-- Check 3: All questions have at least one tag
SELECT q.question_id
FROM questions q
LEFT JOIN question_tags qt ON qt.question_id = q.id
GROUP BY q.id, q.question_id
HAVING COUNT(qt.id) = 0;
-- Expected: empty result

-- Check 4: Payload schema version matches
SELECT COUNT(*) FROM questions
WHERE payload->>'schemaVersion' != 'question.v2';
-- Expected: 0

-- Check 5: No orphan edges
SELECT COUNT(*) FROM question_edges qe
WHERE NOT EXISTS (SELECT 1 FROM questions q WHERE q.id = qe.to_question_id);
-- Expected: 0
```

### 5.3 Sample Spot Checks

```sql
-- Randomly sample 10 questions and verify payload structure
SELECT question_id, payload
FROM questions
ORDER BY RANDOM()
LIMIT 10;

-- For each: manually verify key fields match expected structure
```

---

## Phase 6: Rollback Strategy

### 6.1 Pre-Migration Backup

```sql
-- Create full backup before migration
CREATE TABLE questions_pre_migration AS SELECT * FROM questions;
CREATE TABLE question_tags_pre_migration AS SELECT * FROM question_tags;
CREATE TABLE question_edges_pre_migration AS SELECT * FROM question_edges;
```

### 6.2 Rollback Procedure

```
FUNCTION rollback():
  -- Step 1: Identify migrated records
  migratedIds = SELECT question_id FROM migration_log WHERE status = 'migrated'

  -- Step 2: Delete edges for migrated questions
  DELETE FROM question_edges
  WHERE from_question_id IN (
    SELECT id FROM questions WHERE question_id IN migratedIds
  )
  OR to_question_id IN (
    SELECT id FROM questions WHERE question_id IN migratedIds
  )

  -- Step 3: Delete tags for migrated questions
  DELETE FROM question_tags
  WHERE question_id IN (
    SELECT id FROM questions WHERE question_id IN migratedIds
  )

  -- Step 4: Delete migrated questions
  DELETE FROM questions WHERE question_id IN migratedIds

  -- Step 5: Update migration log
  UPDATE migration_log SET status = 'rolled_back' WHERE status = 'migrated'

  -- Step 6: Verify rollback
  SELECT COUNT(*) FROM questions WHERE question_id IN migratedIds
  -- Expected: 0
```

### 6.3 Point-in-Time Recovery

```
-- Neon supports point-in-time recovery
-- If catastrophic failure, restore to timestamp before migration:

-- In Neon console:
-- 1. Navigate to Branches
-- 2. Create branch from timestamp: [pre-migration timestamp]
-- 3. Point application to new branch
-- 4. Investigate and fix issues
-- 5. Re-run migration
```

---

## Phase 7: Post-Migration

### 7.1 Update Application Configuration

```typescript
// Before migration
const questionSource = 'filesystem';
const questionPath = './data/questions/';

// After migration
const questionSource = 'database';
const databaseUrl = process.env.DATABASE_URL;
```

### 7.2 Archive Source Files

```bash
# Create dated archive
tar -czvf questions_backup_$(date +%Y%m%d).tar.gz ./data/questions/

# Move to archive location
mv questions_backup_*.tar.gz ./archives/

# Keep source files read-only for 30 days
chmod -R 444 ./data/questions/

# After 30 days with no issues, remove source files
# rm -rf ./data/questions/
```

### 7.3 Drop Migration Tables

```sql
-- After successful migration and verification period (30 days)
DROP TABLE IF EXISTS migration_log;
DROP TABLE IF EXISTS questions_backup;
DROP TABLE IF EXISTS questions_pre_migration;
DROP TABLE IF EXISTS question_tags_pre_migration;
DROP TABLE IF EXISTS question_edges_pre_migration;
```

### 7.4 Update Pattern Registry

```sql
-- Populate patterns table from migrated questions
INSERT INTO patterns (pattern_id, label, question_count, is_active, created_at, updated_at)
SELECT DISTINCT
  primary_pattern_id,
  INITCAP(REPLACE(primary_pattern_id, '-', ' ')),
  COUNT(*),
  true,
  NOW(),
  NOW()
FROM questions
WHERE primary_pattern_id IS NOT NULL
GROUP BY primary_pattern_id
ON CONFLICT (pattern_id) DO UPDATE SET
  question_count = EXCLUDED.question_count,
  updated_at = NOW();
```

### 7.5 Update Topic Registry

```sql
-- Populate topics table from migrated questions
INSERT INTO topics (topic_id, label, question_count, is_active, created_at, updated_at)
SELECT DISTINCT
  UNNEST(topic_tags) as topic_id,
  INITCAP(REPLACE(UNNEST(topic_tags), '-', ' ')),
  1,
  true,
  NOW(),
  NOW()
FROM questions
ON CONFLICT (topic_id) DO UPDATE SET
  question_count = topics.question_count + 1,
  updated_at = NOW();
```

---

## Execution Checklist

### Pre-Migration

- [ ] Backup existing database
- [ ] Create migration tracking tables
- [ ] Validate all source JSON files
- [ ] Generate inventory report
- [ ] Review and approve field mappings
- [ ] Test migration script on sample (10 files)

### Migration

- [ ] Run migration in batches
- [ ] Monitor for errors
- [ ] Pause if error rate > 5%
- [ ] Complete all batches

### Validation

- [ ] Verify row counts match
- [ ] Run data integrity checks
- [ ] Perform spot checks on 10 random questions
- [ ] Test API endpoints with migrated data

### Post-Migration

- [ ] Update application configuration
- [ ] Archive source files
- [ ] Populate pattern registry
- [ ] Populate topic registry
- [ ] Monitor for 30 days
- [ ] Drop migration tables

---

## Migration Metrics

| Metric | Target |
|--------|--------|
| Total questions migrated | 100% of valid v1 files |
| Migration success rate | >99% |
| Validation pass rate | 100% |
| Rollback time (if needed) | <5 minutes |
| Total migration duration | <1 hour for 5000 questions |
