# PhysiScaffold — Architecture Lock-In Document

**Status**: LOCKED
**Version**: 1.0
**Date**: 2026-01-06

This document defines the immutable architectural decisions for the PhysiScaffold adaptive learning platform. Future developers MUST NOT violate these invariants.

---

## 1. Domain Model

### Entities

| Entity | Description | Key Fields |
|--------|-------------|------------|
| `Question` | Single physics problem node | id, questionId, difficulty, track, lifecycleState, payload |
| `QuestionEdge` | Directed relationship between questions | fromQuestionId, toQuestionId, edgeType, weight, isCurated |
| `QuestionTag` | Normalized tags for filtering | questionId, tagType, tagValue |
| `Pattern` | Physics problem pattern | patternId, label, parentPatternId, level |
| `Topic` | Physics topic hierarchy | topicId, label, parentTopicId, level |
| `UserQuestionHistory` | User's attempt on a question | userId, questionId, outcome, score, stepsCompleted |
| `RawExtraction` | Immutable Mathpix output | mathpixJobId, rawLatex, rawText, confidence |
| `UserAiQuota` | Daily AI usage limits | userId, featureType, quotaDate, usedCount, maxAllowed |

### Relationships

```
Question 1──* QuestionEdge (outgoing)
Question 1──* QuestionEdge (incoming)
Question 1──* QuestionTag
Question 1──* UserQuestionHistory
RawExtraction *──1 Question (optional link)
Pattern 1──* Question (via primaryPatternId)
```

---

## 2. Question Lifecycle

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌─────────┐
│  draft  │────▶│ review  │────▶│ approved │────▶│ retired │
└─────────┘     └─────────┘     └──────────┘     └─────────┘
     │               │                │
     │               │                │
     ▼               ▼                │
 [rejected]     [rejected]            │
                                      │
                               [can reactivate]
```

| State | Description | Allowed Transitions |
|-------|-------------|---------------------|
| `draft` | Initial state; not visible to users | → review, → rejected |
| `review` | Under editorial review | → approved, → draft, → rejected |
| `approved` | Live in production | → retired |
| `retired` | Removed from active pool | → approved (reactivate) |

### Lifecycle Invariants

- Only `approved` questions are served to users
- Questions CANNOT skip states (draft → approved is INVALID)
- Retired questions retain all history and edges
- AI-generated questions MUST go through `review` before `approved`

---

## 3. Track Definitions

| Track | Cognitive Ability | Difficulty Range | Target Audience |
|-------|-------------------|------------------|-----------------|
| `foundation1` | Intuition, representation, cause-effect | 1-2 | Beginners, remediation |
| `foundation2` | Vector sense, constraints, multi-step | 2-4 | Pre-competitive readiness |
| `intermediate` | Algebraic fluency, equation setup | 4-6 | Class 11-12 regular |
| `competitive` | Deep problem-solving, pattern recognition | 6-10 | JEE/NEET aspirants |

### Track Characteristics

#### Foundation 1
- Skills: Intuition, representation, qualitative reasoning
- Format: Conceptual MCQs, diagram interpretation
- Math: Minimal (arithmetic only)
- Connects: → Foundation 2

#### Foundation 2
- Skills: Vector sense, constraint identification, 2-3 step reasoning
- Format: Qualitative + simple quantitative
- Math: Basic algebra, trigonometry
- Connects: → Intermediate, → Competitive (with gates)

#### Intermediate
- Skills: Equation setup, unit analysis, standard procedures
- Format: Numerical problems, derivations
- Math: Full Class 11-12 curriculum
- Connects: → Competitive

#### Competitive
- Skills: Pattern recognition, trap avoidance, time optimization
- Format: JEE/NEET style problems
- Math: Advanced techniques, shortcuts
- Connects: ← All tracks (as remediation destination)

---

## 4. Edge Types

| Edge Type | Direction Meaning | Pedagogical Use |
|-----------|-------------------|-----------------|
| `same_difficulty` | A ↔ B are equally hard | "Another" button selection |
| `harder` | A → B means B is harder than A | "Harder" button selection |
| `easier` | A → B means B is easier than A | Remediation paths |
| `same_pattern` | A ↔ B share the same physics pattern | Pattern drilling |
| `prerequisite` | A → B means A must be done before B | Gating logic |
| `variation` | A ↔ B are variations of same core problem | Spaced practice |

### Edge Creation Rules

| Edge Type | Auto-Generated | Curated Override | Stability |
|-----------|----------------|------------------|-----------|
| `same_difficulty` | Yes (correlation engine) | Yes | Can be updated |
| `harder` | Yes | Yes | Can be updated |
| `easier` | Yes | Yes | Can be updated |
| `same_pattern` | Yes | Yes | Can be updated |
| `prerequisite` | No | Yes (only curated) | Locked once set |
| `variation` | Yes | Yes | Can be updated |

### Edge Weight

- Range: 0.0 to 1.0
- Higher weight = stronger recommendation
- Curated edges have weight = 1.0 by default
- Auto-generated edges have weight = similarity score

---

## 5. Invariants (NON-NEGOTIABLE)

### Data Integrity

1. **Raw extractions are immutable**
   - `RawExtraction.rawLatex` and `RawExtraction.rawText` MUST NEVER be modified after creation
   - Any transformation creates a NEW record linked via `questionId`

2. **Question IDs are stable**
   - `Question.questionId` is the canonical identifier
   - MUST NOT be reused after deletion

3. **Edge direction is semantic**
   - `harder` edge from A→B means B is harder than A
   - NEVER invert meaning

### User Safety

4. **Only approved questions reach users**
   - All selection algorithms MUST filter by `lifecycleState = 'approved'`
   - Draft/review questions are editorial-only

5. **Original questions only in production**
   - Never serve raw Mathpix output
   - Always serve transformed, human-reviewed content

6. **AI is optional at runtime**
   - Core learning MUST work with AI disabled
   - AI enhances but never gates progression

### Progression Logic

7. **Completion is explicit**
   - A question is "completed" only when all scaffold steps are done + sanity check passed
   - Partial progress is "in_progress", not "completed"

8. **Prerequisites are absolute**
   - If edge type is `prerequisite`, the source question MUST be completed before destination is served
   - No overrides for prerequisite gating

9. **Track boundaries are soft**
   - Users can attempt questions from any track
   - System recommends track-appropriate questions
   - Struggling triggers remediation edges, not hard locks

### Correlation Engine

10. **Curated edges are never auto-replaced**
    - If `createdBy` is set (curated), correlation engine CANNOT modify or delete
    - Auto-generated edges can be updated

11. **No full recomputation**
    - New questions link incrementally
    - Batch jobs update edges for changed questions only
    - Historical edges remain stable unless explicitly re-correlated

### AI Controls

12. **AI quotas are per-user-per-day**
    - No unlimited AI usage
    - Quotas reset at midnight UTC

13. **AI provenance is tracked**
    - Every AI-generated question has `isAiGenerated = true`
    - Model and generation timestamp are recorded

14. **AI never publishes directly**
    - AI-generated content goes to `draft`
    - Human review required for `approved` state

---

## 6. Selection Algorithm (Deterministic)

```
getNextQuestion(userId, mode):
  1. Get user's completed question IDs
  2. Get current question's outgoing edges filtered by mode:
     - mode = "same": same_difficulty, same_pattern, variation
     - mode = "harder": harder
     - mode = "easier": easier
  3. Filter edges: target must be approved AND not completed by user
  4. Sort by: weight DESC, then createdAt ASC
  5. Return first match
  6. If no edges: fallback to pool query:
     - Same pattern, same difficulty range, not completed
     - Random selection from top 5
  7. If no pool: return null (no question available)
```

---

## 7. API Contracts

### getNextQuestion

```typescript
// Request
POST /api/question/next
{
  userId: string
  currentQuestionId?: string
  mode: "same" | "harder" | "easier"
}

// Response
{
  success: boolean
  question?: Question
  selectionMethod: "edge" | "pool" | "none"
  edgeId?: string
}
```

### recordCompletion

```typescript
// Request
POST /api/question/complete
{
  userId: string
  questionId: string
  outcome: "completed" | "abandoned" | "revealed" | "skipped"
  score?: number
  stepsCompleted: number
  stepsTotal: number
  hintsUsed: number
  durationSec: number
}

// Response
{
  success: boolean
  historyId: string
  unlockedQuestionIds: string[]
}
```

---

## Document Approval

This architecture is LOCKED. Changes require:
1. Written justification
2. Impact analysis on all 14 invariants
3. Approval from system architect

**Approved by**: System Architect
**Date**: 2026-01-06
