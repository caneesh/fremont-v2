# MathPix Safe Authoring Pipeline

## Overview

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Stage 1   │───▶│   Stage 2   │───▶│   Stage 3   │───▶│   Stage 4   │───▶│   Stage 5   │───▶│   Stage 6   │
│ Raw Intake  │    │  Structural │    │   Pattern   │    │  Original   │    │    Step     │    │ Provenance  │
│             │    │  Analysis   │    │    Match    │    │  Authoring  │    │ Scaffolding │    │  Tagging    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

---

## Stage 1: Raw Extraction Intake

### Input

```typescript
interface Stage1Input {
  mathpixJobId: string;
  sourceUri: string;           // PDF path or URL
  sourcePageNumber: number;
  rawLatex: string;            // MathPix raw output
  rawText: string;             // Plain text extraction
  confidence: number;          // MathPix confidence score
  extractedAt: string;         // ISO datetime
  extractedBy: string;         // User or system ID
}
```

### Process

```
1. VALIDATE mathpixJobId is unique (not already processed)
2. VALIDATE rawLatex is non-empty
3. VALIDATE confidence >= 0.7 (reject low-confidence extractions)
4. STORE raw extraction to audit table (never modify after storage)
5. GENERATE extractionId for pipeline tracking
```

### Output

```typescript
interface Stage1Output {
  extractionId: string;        // Generated UUID
  mathpixJobId: string;
  sourceUri: string;
  sourcePageNumber: number;
  rawLatex: string;
  rawText: string;
  confidence: number;
  status: 'accepted' | 'rejected';
  rejectionReason?: string;
}
```

### Failure Conditions

| Condition | Action |
|-----------|--------|
| `confidence < 0.7` | Reject with `low_confidence` |
| `rawLatex` empty | Reject with `empty_extraction` |
| Duplicate `mathpixJobId` | Reject with `duplicate_job` |

### SQL: Store Raw Extraction

```sql
INSERT INTO raw_extractions (
  id, mathpix_job_id, source_uri, source_page_number,
  raw_latex, raw_text, confidence, extracted_at, extracted_by,
  status, rejection_reason, created_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
);
```

---

## Stage 2: Structural Analysis

### Input

```typescript
interface Stage2Input {
  extractionId: string;
  rawLatex: string;
  rawText: string;
}
```

### Process

```
1. PARSE rawLatex to identify:
   - Given quantities (mass, angle, velocity, etc.)
   - Asked quantities (find acceleration, force, etc.)
   - Scenario description (inclined plane, projectile, etc.)
   - Diagram references (if any)
   - Constraints (frictionless, massless rope, etc.)

2. EXTRACT numerical values with units
   - Pattern: (\d+\.?\d*)\s*(kg|m|s|N|m/s|m/s²|°|rad|...)

3. IDENTIFY question type:
   - Single numeric answer
   - Multiple parts (a, b, c)
   - MCQ
   - Derivation

4. DO NOT store original wording
   - Only store structural metadata
```

### Output

```typescript
interface Stage2Output {
  extractionId: string;
  structure: {
    given: Array<{
      quantity: string;       // e.g., "mass"
      symbol: string;         // e.g., "m"
      value: number | null;   // e.g., 5
      unit: string;           // e.g., "kg"
    }>;
    asked: Array<{
      quantity: string;       // e.g., "acceleration"
      symbol: string;         // e.g., "a"
      expectedUnit: string;   // e.g., "m/s²"
    }>;
    scenario: {
      type: string;           // e.g., "inclined_plane"
      objects: string[];      // e.g., ["block", "surface"]
      constraints: string[];  // e.g., ["frictionless", "massless_rope"]
    };
    questionType: 'numeric' | 'multi_part' | 'mcq' | 'derivation';
    partCount: number;
    hasDiagram: boolean;
  };
  status: 'analyzed' | 'failed';
  failureReason?: string;
}
```

### Example

```json
{
  "extractionId": "ext_abc123",
  "structure": {
    "given": [
      { "quantity": "mass", "symbol": "m", "value": 5, "unit": "kg" },
      { "quantity": "angle", "symbol": "θ", "value": 30, "unit": "°" },
      { "quantity": "gravity", "symbol": "g", "value": 10, "unit": "m/s²" }
    ],
    "asked": [
      { "quantity": "acceleration", "symbol": "a", "expectedUnit": "m/s²" },
      { "quantity": "normal_force", "symbol": "N", "expectedUnit": "N" }
    ],
    "scenario": {
      "type": "inclined_plane",
      "objects": ["block", "incline"],
      "constraints": ["frictionless"]
    },
    "questionType": "multi_part",
    "partCount": 2,
    "hasDiagram": true
  },
  "status": "analyzed"
}
```

### Failure Conditions

| Condition | Action |
|-----------|--------|
| Cannot identify any `given` | Fail with `no_given_quantities` |
| Cannot identify any `asked` | Fail with `no_asked_quantities` |
| Cannot determine scenario type | Fail with `unknown_scenario` |

---

## Stage 3: Pattern Identification

### Input

```typescript
interface Stage3Input {
  extractionId: string;
  structure: Stage2Output['structure'];
}
```

### Process

```
1. MATCH scenario.type + constraints to pattern registry

   Pattern matching rules:
   - inclined_plane + frictionless → "inclined-plane-frictionless"
   - inclined_plane + friction → "inclined-plane-friction"
   - projectile + no_air_resistance → "projectile-basic"
   - circular_motion + vertical → "vertical-circular-motion"

2. COMPUTE templateFingerprint:
   fingerprint = "given:" + sort(given.quantity).join(",") +
                 "|asked:" + sort(asked.quantity).join(",") +
                 "|scenario:" + scenario.type

3. SEARCH for similar questions by fingerprint
   - If exact match exists: flag for review (potential duplicate)
   - If similar match (>80%): suggest as variation

4. DETERMINE primary and secondary patterns
```

### Output

```typescript
interface Stage3Output {
  extractionId: string;
  patternMatch: {
    primaryPatternId: string;
    secondaryPatternIds: string[];
    confidence: number;        // 0-1
    matchMethod: 'exact_rule' | 'similarity' | 'manual_override';
  };
  fingerprint: string;
  duplicateCheck: {
    hasPotentialDuplicate: boolean;
    similarQuestionIds: string[];
    highestSimilarity: number;
  };
  status: 'matched' | 'needs_manual_review' | 'no_match';
}
```

### Pattern Matching Rules

```typescript
const PATTERN_RULES: PatternRule[] = [
  {
    conditions: {
      scenarioType: 'inclined_plane',
      constraints: { includes: [], excludes: ['friction'] }
    },
    patternId: 'inclined-plane-frictionless'
  },
  {
    conditions: {
      scenarioType: 'inclined_plane',
      constraints: { includes: ['friction'], excludes: [] }
    },
    patternId: 'inclined-plane-friction'
  },
  {
    conditions: {
      scenarioType: 'projectile',
      constraints: { includes: [], excludes: ['air_resistance'] }
    },
    patternId: 'projectile-basic'
  },
  {
    conditions: {
      scenarioType: 'projectile',
      constraints: { includes: ['air_resistance'], excludes: [] }
    },
    patternId: 'projectile-drag'
  },
  {
    conditions: {
      scenarioType: 'circular_motion',
      askedIncludes: ['tension', 'velocity']
    },
    patternId: 'vertical-circular-motion'
  },
  // ... more rules
];
```

### Failure Conditions

| Condition | Action |
|-----------|--------|
| No pattern match and confidence < 0.5 | `no_match` - requires manual review |
| Multiple patterns with equal confidence | `needs_manual_review` |
| Exact duplicate detected | `needs_manual_review` with flag |

---

## Stage 4: Original Question Authoring

### Input

```typescript
interface Stage4Input {
  extractionId: string;
  structure: Stage2Output['structure'];
  patternMatch: Stage3Output['patternMatch'];
}
```

### Process

```
CRITICAL: This stage generates ORIGINAL content.
DO NOT use any text from the source document.

1. SELECT scenario template based on patternId
2. GENERATE original scenario with:
   - Different context (e.g., "playground slide" instead of "inclined plane")
   - Same physics structure
   - Original wording

3. ASSIGN new numerical values:
   - Preserve relative difficulty
   - Use "nice" numbers for calculation
   - Vary from source values by at least 20%

4. COMPOSE original question text
   - Must be written from scratch
   - Cannot contain any phrases from source

5. HUMAN REVIEW REQUIRED before approval
```

### Scenario Templates

```typescript
const SCENARIO_TEMPLATES: Record<string, ScenarioTemplate[]> = {
  'inclined-plane-frictionless': [
    {
      context: 'playground',
      objects: ['child', 'slide'],
      template: 'A {mass} kg child sits at the top of a smooth playground slide that makes an angle of {angle}° with the ground.'
    },
    {
      context: 'warehouse',
      objects: ['crate', 'ramp'],
      template: 'A {mass} kg crate is placed on a frictionless loading ramp inclined at {angle}° to the horizontal.'
    },
    {
      context: 'skiing',
      objects: ['skier', 'slope'],
      template: 'A skier of mass {mass} kg starts from rest on a smooth ski slope that makes an angle of {angle}° with the horizontal.'
    }
  ],
  'projectile-basic': [
    {
      context: 'sports',
      objects: ['ball', 'player'],
      template: 'A ball is kicked with an initial velocity of {velocity} m/s at an angle of {angle}° above the horizontal.'
    },
    // ... more templates
  ]
};
```

### Output

```typescript
interface Stage4Output {
  extractionId: string;
  authoredQuestion: {
    title: string;
    promptText: string;
    context: string | null;
    given: Array<{
      label: string;
      value: string;
      unit: string;
    }>;
    asked: Array<{
      label: string;
      expectedForm: string;
    }>;
    scenarioContext: string;    // e.g., "playground"
    templateUsed: string;       // Template ID for audit
  };
  originalityCheck: {
    isOriginal: boolean;
    similarityScore: number;    // 0-1, lower is more original
    flaggedPhrases: string[];   // Any phrases too similar to source
  };
  status: 'authored' | 'needs_revision' | 'failed';
}
```

### Example Output

```json
{
  "extractionId": "ext_abc123",
  "authoredQuestion": {
    "title": "Child on Playground Slide",
    "promptText": "A child sits on a smooth plastic slide at a playground. The slide makes an angle of 40° with the ground. If the child has a mass of 25 kg and friction is negligible, calculate:\n\n(a) The acceleration of the child as they slide down\n(b) The force the slide exerts perpendicular to its surface\n\nUse g = 10 m/s²",
    "context": "Assume the child can be modeled as a point mass.",
    "given": [
      { "label": "Mass", "value": "25", "unit": "kg" },
      { "label": "Angle", "value": "40", "unit": "°" },
      { "label": "Gravity", "value": "10", "unit": "m/s²" }
    ],
    "asked": [
      { "label": "Acceleration", "expectedForm": "numeric" },
      { "label": "Normal Force", "expectedForm": "numeric" }
    ],
    "scenarioContext": "playground",
    "templateUsed": "inclined-plane-frictionless-playground-001"
  },
  "originalityCheck": {
    "isOriginal": true,
    "similarityScore": 0.12,
    "flaggedPhrases": []
  },
  "status": "authored"
}
```

### Failure Conditions

| Condition | Action |
|-----------|--------|
| `similarityScore > 0.4` | `needs_revision` - too similar to source |
| `flaggedPhrases.length > 0` | `needs_revision` - contains source phrases |
| No suitable template | `failed` - manual authoring required |

---

## Stage 5: Step Scaffolding Generation

### Input

```typescript
interface Stage5Input {
  extractionId: string;
  authoredQuestion: Stage4Output['authoredQuestion'];
  patternMatch: Stage3Output['patternMatch'];
  structure: Stage2Output['structure'];
}
```

### Process

```
1. LOAD step template for pattern
2. GENERATE steps based on pattern structure:
   - Problem identification step
   - FBD/diagram step (if applicable)
   - Component resolution steps
   - Equation application steps
   - Numerical calculation steps
   - Verification step

3. COMPUTE correct answers for each step
4. GENERATE explanations (micro, conceptual, deep)
5. CREATE mistake mappings based on common errors
6. ASSIGN cognitive stages to each step
```

### Step Templates

```typescript
const STEP_TEMPLATES: Record<string, StepTemplate[]> = {
  'inclined-plane-frictionless': [
    {
      stepId: 's1-identify',
      type: 'MCQ_SINGLE',
      cognitiveStage: 'understand',
      promptTemplate: 'What type of physics problem is this?',
      choicesTemplate: [
        { key: 'A', text: 'Projectile motion', isDistractor: true },
        { key: 'B', text: 'Inclined plane / ramp problem', isDistractor: false },
        { key: 'C', text: 'Circular motion', isDistractor: true },
        { key: 'D', text: 'Simple harmonic motion', isDistractor: true }
      ],
      correct: 'B'
    },
    {
      stepId: 's2-fbd',
      type: 'DIAGRAM_FBD',
      cognitiveStage: 'apply',
      promptTemplate: 'Draw the free body diagram. What forces act on the {object}?',
      diagramValidator: {
        scenarioId: 'incline-single-body',
        requiredForces: ['mg', 'N'],
        directionRules: [
          { force: 'mg', rule: 'DOWN_GLOBAL' },
          { force: 'N', rule: 'PERP_TO_SURFACE' }
        ]
      }
    },
    {
      stepId: 's3-components',
      type: 'MCQ_SINGLE',
      cognitiveStage: 'apply',
      promptTemplate: 'What is the component of weight parallel to the {surface}?',
      choicesTemplate: [
        { key: 'A', text: '$mg \\cos({angle}°)$', isDistractor: true },
        { key: 'B', text: '$mg \\sin({angle}°)$', isDistractor: false },
        { key: 'C', text: '$mg \\tan({angle}°)$', isDistractor: true },
        { key: 'D', text: '$mg$', isDistractor: true }
      ],
      correct: 'B'
    },
    {
      stepId: 's4-acceleration',
      type: 'NUMERIC',
      cognitiveStage: 'apply',
      promptTemplate: 'Calculate the acceleration down the {surface}. Enter your answer in m/s².',
      computeAnswer: (given) => given.g * Math.sin(given.angle * Math.PI / 180),
      tolerance: 0.05
    },
    {
      stepId: 's5-normal',
      type: 'NUMERIC',
      cognitiveStage: 'apply',
      promptTemplate: 'Calculate the normal force. Enter your answer in N.',
      computeAnswer: (given) => given.mass * given.g * Math.cos(given.angle * Math.PI / 180),
      tolerance: 0.5
    },
    {
      stepId: 's6-verify',
      type: 'MCQ_SINGLE',
      cognitiveStage: 'evaluate',
      promptTemplate: 'Sanity check: If the angle were 0° (flat ground), what would be the acceleration and normal force?',
      choicesTemplate: [
        { key: 'A', text: 'a = 0, N = mg', isDistractor: false },
        { key: 'B', text: 'a = g, N = 0', isDistractor: true },
        { key: 'C', text: 'a = 0, N = 0', isDistractor: true },
        { key: 'D', text: 'a = g, N = mg', isDistractor: true }
      ],
      correct: 'A'
    }
  ]
};
```

### Output

```typescript
interface Stage5Output {
  extractionId: string;
  steps: Array<{
    stepId: string;
    type: StepType;
    prompt: string;
    cognitiveStage: CognitiveStage;
    pattern?: string;
    metaSkill?: string;
    topic?: string;
    difficulty: number;
    choices?: Choice[];
    correct?: string | string[];
    correctNumeric?: number;
    diagramValidator?: DiagramValidator;
    validation?: StepValidation;
    explanations: Explanations;
    mistakeMapping: MistakeRule[];
  }>;
  solutions: {
    finalAnswer: AnswerSpec;
    synthesis: string[];
    limitingCases: LimitingCase[];
    fullDerivation: string;
    answerKey: Record<string, number>;
  };
  status: 'scaffolded' | 'partial' | 'failed';
}
```

### Failure Conditions

| Condition | Action |
|-----------|--------|
| No step template for pattern | `failed` - manual scaffolding required |
| Answer computation error | `partial` - manual answer entry required |
| Missing required step type | `partial` - requires completion |

---

## Stage 6: Provenance & Rights Tagging

### Input

```typescript
interface Stage6Input {
  extractionId: string;
  mathpixJobId: string;
  sourceUri: string;
  sourcePageNumber: number;
  authoredQuestion: Stage4Output['authoredQuestion'];
  steps: Stage5Output['steps'];
  solutions: Stage5Output['solutions'];
  patternMatch: Stage3Output['patternMatch'];
}
```

### Process

```
1. ASSEMBLE complete question.v2 payload
2. TAG provenance:
   - origin: 'mathpix'
   - sourceUri: original PDF
   - sourcePageNumber: page number
   - ingestedAt: now
   - ingestedBy: user/system ID
   - processingNotes: pipeline version

3. SET lifecycle:
   - state: 'draft' (requires human review)
   - stateChangedAt: now

4. TAG AI metadata (if AI was used in authoring):
   - model: authoring model
   - generatedAt: timestamp
   - humanReviewed: false
   - aiGeneratedFields: list of AI-authored fields

5. COMPUTE classification tags from pattern and structure

6. GENERATE questionId
   - Format: {pattern}-{source}-{sequence}
   - Example: "inclined-plane-mathpix-001"

7. SAVE to questions table
8. CREATE question_tags entries
9. LINK to raw_extractions for audit trail
```

### Output

```typescript
interface Stage6Output {
  questionId: string;
  extractionId: string;
  payload: QuestionV2Payload;  // Complete question.v2 JSON
  provenance: {
    origin: 'mathpix';
    sourceUri: string;
    sourcePageNumber: number;
    mathpixJobId: string;
    ingestedAt: string;
    ingestedBy: string;
    processingNotes: string;
  };
  lifecycle: {
    state: 'draft';
    stateChangedAt: string;
  };
  status: 'saved' | 'failed';
}
```

### Complete Question.v2 Example

```json
{
  "schemaVersion": "question.v2",
  "questionId": "inclined-plane-mathpix-001",

  "metadata": {
    "title": "Child on Playground Slide",
    "difficulty": 2,
    "estimatedTimeSec": 480,
    "language": "en",
    "source": {
      "kind": "original",
      "reference": "Generated from pattern template",
      "year": 2026
    },
    "version": 1,
    "createdAt": "2026-01-03T10:30:00Z",
    "updatedAt": "2026-01-03T10:30:00Z"
  },

  "classification": {
    "topicTags": ["mechanics", "newton-laws", "dynamics"],
    "patternTags": ["inclined-plane", "single-body", "frictionless"],
    "metaSkillTags": ["fbd-drawing", "component-resolution"],
    "trapTags": ["sin-cos-confusion", "sign-convention"],
    "learningObjectives": [
      "Apply Newton's second law to inclined plane problems",
      "Resolve weight into components parallel and perpendicular to incline"
    ]
  },

  "prompt": {
    "text": "A child sits on a smooth plastic slide...",
    "context": "Assume the child can be modeled as a point mass.",
    "given": [...],
    "asked": [...]
  },

  "primaryPatternId": "inclined-plane-frictionless",
  "secondaryPatternIds": ["newton-second-law-1d"],

  "steps": [...],
  "solutions": {...},

  "provenance": {
    "origin": "mathpix",
    "sourceUri": "file:///uploads/physics-problems.pdf",
    "sourcePageNumber": 42,
    "mathpixJobId": "mpx_abc123",
    "ingestedAt": "2026-01-03T10:30:00Z",
    "ingestedBy": "user_xyz",
    "processingNotes": "Pipeline v1.0.0"
  },

  "lifecycle": {
    "state": "draft",
    "stateChangedAt": "2026-01-03T10:30:00Z"
  },

  "aiMetadata": {
    "model": "claude-3-opus",
    "generatedAt": "2026-01-03T10:29:00Z",
    "humanReviewed": false,
    "aiGeneratedFields": [
      "prompt.text",
      "steps[*].explanations"
    ]
  }
}
```

---

## Pipeline State Machine

```
                                    ┌─────────────────┐
                                    │   REJECTED      │
                                    │  (terminal)     │
                                    └────────▲────────┘
                                             │
              ┌──────────────────────────────┼──────────────────────────────┐
              │                              │                              │
              │ confidence < 0.7             │ duplicate                    │ originality
              │ empty extraction             │ detected                     │ check failed
              │                              │                              │
┌─────────────┴─────────────┐  ┌─────────────┴─────────────┐  ┌─────────────┴─────────────┐
│        Stage 1            │  │        Stage 3            │  │        Stage 4            │
│     Raw Intake            │──│    Pattern Match          │──│   Original Authoring      │
│                           │  │                           │  │                           │
└─────────────┬─────────────┘  └─────────────┬─────────────┘  └─────────────┬─────────────┘
              │                              │                              │
              ▼                              │                              ▼
┌─────────────────────────────┐              │               ┌─────────────────────────────┐
│        Stage 2              │              │               │        Stage 5              │
│   Structural Analysis       │──────────────┘               │   Step Scaffolding          │
│                             │                              │                             │
└─────────────┬───────────────┘                              └─────────────┬───────────────┘
              │                                                            │
              │ no given/asked                                             │
              │ unknown scenario                                           ▼
              │                                               ┌─────────────────────────────┐
              ▼                                               │        Stage 6              │
┌─────────────────────────────┐                               │   Provenance Tagging        │
│     NEEDS_MANUAL_REVIEW     │                               │                             │
│       (terminal)            │                               └─────────────┬───────────────┘
└─────────────────────────────┘                                             │
                                                                            ▼
                                                              ┌─────────────────────────────┐
                                                              │         DRAFT               │
                                                              │   (awaiting human review)   │
                                                              └─────────────────────────────┘
```

---

## Database Tables

### raw_extractions (Audit Table)

```sql
CREATE TABLE raw_extractions (
  id                  TEXT PRIMARY KEY,
  mathpix_job_id      TEXT UNIQUE NOT NULL,
  source_uri          TEXT NOT NULL,
  source_page_number  INTEGER,
  raw_latex           TEXT NOT NULL,
  raw_text            TEXT,
  confidence          REAL NOT NULL,
  extracted_at        TIMESTAMPTZ NOT NULL,
  extracted_by        TEXT NOT NULL,
  status              TEXT NOT NULL,  -- 'accepted', 'rejected'
  rejection_reason    TEXT,

  -- Pipeline tracking
  pipeline_version    TEXT,
  current_stage       INTEGER,
  stage_outputs       JSONB,          -- Outputs from each stage

  -- Linkage
  question_id         TEXT REFERENCES questions(question_id),

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_raw_extractions_status ON raw_extractions(status);
CREATE INDEX idx_raw_extractions_mathpix ON raw_extractions(mathpix_job_id);
```

---

## API Endpoints

### POST /api/pipeline/ingest

```typescript
// Request
{
  mathpixJobId: string;
  sourceUri: string;
  sourcePageNumber: number;
  rawLatex: string;
  rawText: string;
  confidence: number;
}

// Response
{
  extractionId: string;
  status: 'accepted' | 'rejected';
  rejectionReason?: string;
}
```

### POST /api/pipeline/process

```typescript
// Request
{
  extractionId: string;
  stages?: number[];  // Optional: run specific stages only
}

// Response
{
  extractionId: string;
  currentStage: number;
  status: 'completed' | 'needs_review' | 'failed';
  questionId?: string;  // If completed
  failureReason?: string;
  stageOutputs: Record<number, StageOutput>;
}
```

### GET /api/pipeline/status/:extractionId

```typescript
// Response
{
  extractionId: string;
  mathpixJobId: string;
  currentStage: number;
  status: 'processing' | 'completed' | 'needs_review' | 'failed';
  questionId?: string;
  stageOutputs: Record<number, StageOutput>;
  createdAt: string;
  updatedAt: string;
}
```
