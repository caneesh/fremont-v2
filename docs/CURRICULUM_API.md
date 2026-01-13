# Curriculum API Reference

**Version**: 1.0
**Base Path**: `/api/curriculum`

This document provides comprehensive API documentation for the curriculum module endpoints.

---

## Table of Contents

1. [Content Pack API](#content-pack-api)
2. [Classification API](#classification-api)
3. [Difficulty API](#difficulty-api)
4. [Evolution API](#evolution-api)
5. [Audit API](#audit-api)
6. [RAG Ingestion API](#rag-ingestion-api)
7. [Common Response Format](#common-response-format)
8. [Error Codes](#error-codes)

---

## Content Pack API

**Endpoint**: `/api/curriculum/content-pack`

Manage and retrieve atomic learning content packs.

### GET - Fetch Content Pack

Retrieve a content pack by concept identifier.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `concept` | string | Yes | Concept node ID (e.g., "newtons_third_law", "n3l") |

**Example Request**:
```bash
GET /api/curriculum/content-pack?concept=newtons_third_law
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "conceptCards": [...],
    "misconceptionCards": [...],
    "problemArchetypes": [...],
    "socraticTrees": [...],
    "masteryChecks": [...],
    "metadata": {
      "createdAt": "2026-01-09",
      "version": "1.0"
    }
  }
}
```

### POST - List Content Packs

List all available content packs.

**Request Body**:
```json
{
  "action": "list"
}
```

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "newtons_third_law",
      "name": "Newton's Third Law",
      "grade": "class9",
      "module": "laws_of_motion"
    }
  ]
}
```

---

## Classification API

**Endpoint**: `/api/curriculum/classify`

Foundation level classification and validation services.

### Actions

#### `classify` - Classify Content

Classify content based on difficulty and characteristics.

**Request Body**:
```json
{
  "action": "classify",
  "difficulty": {
    "conceptualLoad": "novice",
    "reasoningDepth": "developing",
    "transferDistance": "novice",
    "representationSwitching": "novice",
    "misconceptionRisk": "developing"
  },
  "characteristics": {
    "requiresFBD": true,
    "isIntuitionBased": true,
    "hasNonObviousInteraction": false,
    "reasoningSteps": 3,
    "mathLevel": "arithmetic"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "level": "foundation1",
    "confidence": 0.85,
    "reasons": ["Matches F1 criteria", "Intuition-based approach"],
    "violations": []
  }
}
```

#### `create-classification` - Create Foundation Classification

Create a foundation classification object.

**Request Body**:
```json
{
  "action": "create-classification",
  "level": "foundation1",
  "targetSkills": ["f1_qualitative_reasoning", "f1_fbd_identification"],
  "prerequisites": ["vectors_basics"]
}
```

#### `check-transition` - Check Transition Eligibility

Check if a student is ready to advance to the next foundation level.

**Request Body**:
```json
{
  "action": "check-transition",
  "currentLevel": "foundation1",
  "stats": {
    "questionsCompleted": 25,
    "averageScore": 0.82,
    "skillsCovered": ["f1_qualitative_reasoning", "f1_fbd_identification"]
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "eligible": true,
    "missingRequirements": [],
    "recommendations": ["Consider reviewing multi-body systems"]
  }
}
```

#### `get-skills` - Get Skills for Foundation Level

**Request Body**:
```json
{
  "action": "get-skills",
  "level": "foundation1"
}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "f1_qualitative_reasoning",
      "description": "Ability to reason about physics qualitatively"
    },
    {
      "id": "f1_fbd_identification",
      "description": "Identify forces acting on a body"
    }
  ]
}
```

#### `get-criteria` - Get Foundation Criteria

**Request Body**:
```json
{
  "action": "get-criteria",
  "level": "foundation1"
}
```

#### `validate-difficulty` - Validate Difficulty for Foundation

**Request Body**:
```json
{
  "action": "validate-difficulty",
  "difficulty": {
    "conceptualLoad": "novice",
    "reasoningDepth": "developing",
    "transferDistance": "novice",
    "representationSwitching": "novice",
    "misconceptionRisk": "developing"
  },
  "level": "foundation1"
}
```

---

## Difficulty API

**Endpoint**: `/api/curriculum/difficulty`

Five-dimensional difficulty analysis and scoring.

### Actions

#### `create-scores` - Create Difficulty Scores

**Request Body**:
```json
{
  "action": "create-scores",
  "dimensions": {
    "conceptualLoad": {
      "level": "developing",
      "rationale": "Requires understanding of Newton's laws"
    },
    "reasoningDepth": {
      "level": "proficient",
      "rationale": "Multi-step logical reasoning"
    },
    "transferDistance": {
      "level": "novice",
      "rationale": "Direct application"
    },
    "representationSwitching": {
      "level": "developing",
      "rationale": "Diagram to equations"
    },
    "misconceptionRisk": {
      "level": "proficient",
      "rationale": "Common sign errors"
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "dimensions": {
      "conceptualLoad": { "level": "developing", "score": 2, "rationale": "..." },
      "reasoningDepth": { "level": "proficient", "score": 3, "rationale": "..." },
      "transferDistance": { "level": "novice", "score": 1, "rationale": "..." },
      "representationSwitching": { "level": "developing", "score": 2, "rationale": "..." },
      "misconceptionRisk": { "level": "proficient", "score": 3, "rationale": "..." }
    },
    "composite": {
      "overall": "developing",
      "score": 2.2
    }
  }
}
```

#### `match-profile` - Match Content to Student Profile

**Request Body**:
```json
{
  "action": "match-profile",
  "difficulty": {
    "conceptualLoad": "developing",
    "reasoningDepth": "proficient",
    "transferDistance": "novice",
    "representationSwitching": "developing",
    "misconceptionRisk": "proficient"
  },
  "profile": {
    "foundationLevel": "foundation1",
    "conceptualStrength": "developing",
    "reasoningStrength": "developing",
    "transferStrength": "novice",
    "toleratesAmbiguity": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "match": "appropriate",
    "challenge": "moderate",
    "recommendations": ["Provide extra scaffolding for reasoning steps"]
  }
}
```

#### `get-profile` - Get Human-Readable Difficulty Profile

**Request Body**:
```json
{
  "action": "get-profile",
  "difficulty": {
    "conceptualLoad": "developing",
    "reasoningDepth": "proficient",
    "transferDistance": "novice",
    "representationSwitching": "developing",
    "misconceptionRisk": "proficient"
  }
}
```

#### `suggest-prerequisites` - Suggest Prerequisites

**Request Body**:
```json
{
  "action": "suggest-prerequisites",
  "difficulty": {
    "conceptualLoad": "proficient",
    "reasoningDepth": "proficient",
    "transferDistance": "developing",
    "representationSwitching": "developing",
    "misconceptionRisk": "proficient"
  }
}
```

#### `get-rubrics` - Get All Difficulty Rubrics

**Request Body**:
```json
{
  "action": "get-rubrics"
}
```

#### `convert` - Convert Between Score and Level

**Request Body** (score to level):
```json
{
  "action": "convert",
  "score": 3
}
```

**Request Body** (level to score):
```json
{
  "action": "convert",
  "level": "proficient"
}
```

---

## Evolution API

**Endpoint**: `/api/curriculum/evolution`

Concept evolution maps across grade levels.

### GET - List or Fetch Evolution Maps

**Without parameter** - List all available evolution maps:
```bash
GET /api/curriculum/evolution
```

**Response**:
```json
{
  "success": true,
  "data": {
    "available": [
      {
        "id": "newtons_laws",
        "conceptFamily": "Newton's Laws",
        "stages": 6,
        "themes": ["force", "motion", "equilibrium"]
      }
    ],
    "gradeOrder": ["class9", "class10", "class11", "class12", "jee_mains", "jee_advanced"]
  }
}
```

**With concept parameter** - Fetch specific evolution map:
```bash
GET /api/curriculum/evolution?concept=newtons_laws
```

### POST Actions

#### `analyze` - Analyze Evolution Map

**Request Body**:
```json
{
  "action": "analyze",
  "conceptFamily": "newtons_laws"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalStages": 6,
    "conceptProgression": [...],
    "keyTransitions": [...],
    "complexityGrowth": "exponential"
  }
}
```

#### `check-readiness` - Check Grade Level Readiness

**Request Body**:
```json
{
  "action": "check-readiness",
  "conceptFamily": "newtons_laws",
  "targetLevel": "class11",
  "studentProgress": {
    "masteredConcepts": ["n3l_basic", "n2l_basic"],
    "resolvedMisconceptions": ["action_reaction_same_body"],
    "completedArchetypes": ["incline_basic", "pulley_single"]
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "ready": true,
    "missingPrerequisites": [],
    "recommendedReview": ["friction_concepts"],
    "confidenceScore": 0.87
  }
}
```

#### `get-payoffs` - Get Payoff Tags

Shows future applications of current learning.

**Request Body**:
```json
{
  "action": "get-payoffs",
  "conceptFamily": "newtons_laws",
  "currentLevel": "class10",
  "conceptNode": "friction_kinetic"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "payoffs": [
      {
        "futureLevel": "class11",
        "application": "Circular motion on banked curves"
      },
      {
        "futureLevel": "jee_mains",
        "application": "Block-spring systems with friction"
      }
    ]
  }
}
```

#### `get-prerequisites` - Get Cross-Level Prerequisites

**Request Body**:
```json
{
  "action": "get-prerequisites",
  "conceptFamily": "newtons_laws"
}
```

#### `get-stage` - Get Specific Stage

**Request Body**:
```json
{
  "action": "get-stage",
  "conceptFamily": "newtons_laws",
  "level": "class11"
}
```

---

## Audit API

**Endpoint**: `/api/curriculum/audit`

Content quality auditing for pedagogical integrity.

### Actions

#### `audit-pack` - Audit Content Pack

**Request Body** (by concept):
```json
{
  "action": "audit-pack",
  "concept": "newtons_third_law"
}
```

**Request Body** (by content):
```json
{
  "action": "audit-pack",
  "contentPack": {
    "conceptCards": [...],
    "misconceptionCards": [...],
    ...
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "overallScore": 0.92,
    "risks": [
      {
        "type": "hint_dependency",
        "severity": "medium",
        "location": "socraticTrees[0]",
        "message": "Tree may create hint dependency pattern"
      }
    ],
    "recommendations": [...]
  }
}
```

#### `audit-concept-card` - Audit Single Concept Card

**Request Body**:
```json
{
  "action": "audit-concept-card",
  "conceptCard": {
    "id": "n3l_action_reaction",
    "title": "Action-Reaction Pairs",
    "intuitionHook": "...",
    "formalStatement": "...",
    "constraints": [...]
  }
}
```

#### `audit-socratic-tree` - Audit Socratic Tree

**Request Body**:
```json
{
  "action": "audit-socratic-tree",
  "socraticTree": {
    "id": "n3l_discovery",
    "root": {...},
    "branches": [...]
  }
}
```

#### `quality-checklist` - Generate Quality Checklist

**Request Body**:
```json
{
  "action": "quality-checklist",
  "concept": "newtons_third_law"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "checklist": [
      { "item": "Concept cards have intuition hooks", "passed": true },
      { "item": "Misconceptions have triggers", "passed": true },
      { "item": "All archetypes have transfer variants", "passed": false }
    ],
    "summary": {
      "total": 15,
      "passed": 13,
      "failed": 2,
      "passRate": 86.67
    }
  }
}
```

---

## RAG Ingestion API

**Endpoint**: `/api/curriculum/rag`

RAG (Retrieval-Augmented Generation) ingestion rules and validation.

### Actions

#### `decide-embedding` - Decide If Content Should Be Embedded

**Request Body**:
```json
{
  "action": "decide-embedding",
  "content": "Newton's third law states that for every action...",
  "contentType": "authoritative_fact",
  "context": {
    "conceptId": "n3l",
    "gradeLevel": "class9"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "shouldEmbed": true,
    "reason": "Authoritative facts should always be embedded",
    "chunkingStrategy": "paragraph",
    "priority": "high"
  }
}
```

#### `build-context` - Build Retrieval Context

**Request Body**:
```json
{
  "action": "build-context",
  "content": "When two objects interact, they exert equal and opposite forces...",
  "metadata": {
    "contentType": "authoritative_fact",
    "conceptId": "n3l",
    "gradeLevel": "class9"
  }
}
```

#### `get-fallback` - Get Failure Fallback

**Request Body**:
```json
{
  "action": "get-fallback",
  "failureType": "retrieval_timeout"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "fallbackStrategy": "use_cached",
    "message": "Using cached content due to retrieval timeout",
    "retryAfter": 5000
  }
}
```

#### `create-metadata` - Create RAG Metadata

**Request Body**:
```json
{
  "action": "create-metadata",
  "contentType": "authoritative_fact",
  "retrievalTags": ["newton", "third_law", "force_pairs"],
  "options": {
    "priority": "high",
    "cacheDuration": 86400
  }
}
```

#### `validate` - Validate Content for Ingestion

**Request Body**:
```json
{
  "action": "validate",
  "content": "Newton's third law states...",
  "metadata": {
    "contentType": "authoritative_fact",
    "retrievalTags": ["newton"],
    "uncertainty": {
      "confident": true
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "warnings": ["Consider adding more retrieval tags"]
  }
}
```

#### `batch-validate` - Validate Multiple Items

**Request Body**:
```json
{
  "action": "batch-validate",
  "items": [
    {
      "content": "Content 1...",
      "metadata": { "contentType": "authoritative_fact", ... }
    },
    {
      "content": "Content 2...",
      "metadata": { "contentType": "socratic_prompt", ... }
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "results": [...],
    "summary": {
      "total": 2,
      "valid": 2,
      "invalid": 0,
      "withWarnings": 1
    }
  }
}
```

#### `get-rules` - Get Content Type Rules

**Request Body** (specific type):
```json
{
  "action": "get-rules",
  "contentType": "authoritative_fact"
}
```

**Request Body** (all rules):
```json
{
  "action": "get-rules"
}
```

---

## Common Response Format

All successful responses follow this format:

```json
{
  "success": true,
  "data": { ... }
}
```

Error responses follow this format:

```json
{
  "error": "Error description",
  "status": 400
}
```

---

## Error Codes

| Status | Meaning |
|--------|---------|
| 400 | Bad Request - Missing required fields or unknown action |
| 404 | Not Found - Concept or resource not found |
| 500 | Internal Server Error - Server-side error |

---

## Difficulty Levels Reference

Valid difficulty levels for the taxonomy:

| Level | Score | Description |
|-------|-------|-------------|
| `novice` | 1 | Beginner level, single concept |
| `developing` | 2 | Growing understanding, 2 concepts |
| `proficient` | 3 | Competent, 3-4 concepts |
| `advanced` | 4 | High skill, 5+ concepts |
| `expert` | 5 | Mastery, complex integration |

---

## Foundation Levels Reference

| Level | Focus | Characteristics |
|-------|-------|-----------------|
| `foundation1` | Intuition + FBD | Qualitative reasoning, <=3 steps, arithmetic |
| `foundation2` | Non-obvious interactions | Multi-body, <=5 steps, basic algebra |

---

## Grade Levels Reference

Evolution maps support these grade levels in order:

1. `class9`
2. `class10`
3. `class11`
4. `class12`
5. `jee_mains`
6. `jee_advanced`

---

## RAG Content Types Reference

| Type | Description | Embedding Priority |
|------|-------------|-------------------|
| `authoritative_fact` | Core physics facts | Always embed |
| `socratic_prompt` | Guiding questions | Embed with context |
| `misconception_trap` | Common errors | Always embed |
| `problem_setup` | Problem statements | Selective |
| `solution_step` | Solution fragments | Never embed directly |
| `hint_text` | Hint content | Selective |
