# Paper Solution Upload + AI Feedback

## Complete Feature Specification

This document provides the complete specification for the Paper Solution Upload feature, including UX flows, implementation details, and phased roadmap.

---

## Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [UX Flow & Components](#2-ux-flow--components)
3. [API Endpoints](#3-api-endpoints)
4. [Prompt Templates](#4-prompt-templates)
5. [Data Model Changes](#5-data-model-changes)
6. [Phased Implementation Roadmap](#6-phased-implementation-roadmap)

---

## 1. Feature Overview

### 1.1 Problem Statement

Many students prefer solving physics problems on paper with pen/pencil. Currently, the app only accepts typed answers, which:
- Slows down students who think better on paper
- Makes it difficult to write equations and diagrams
- Requires re-typing handwritten work

### 1.2 Solution

A paper-first solution submission system that:
1. Captures photos/scans of handwritten work (1-5 images)
2. Extracts text using Claude Vision OCR
3. Allows students to correct OCR errors before analysis
4. Provides Socratic-style feedback focused on ONE issue at a time
5. Enables revision cycles without starting from scratch

### 1.3 Key Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Non-disruptive** | Paper upload is optional, beside existing textarea |
| **Error-tolerant** | Low-confidence OCR regions are highlighted for correction |
| **Focused feedback** | ONE issue at a time (cognitive load management) |
| **Privacy-respecting** | "Just store" mode skips AI analysis |
| **Mobile-first** | Native camera integration, touch-friendly UI |

---

## 2. UX Flow & Components

### 2.1 User Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP ACCORDION (existing)                                               │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Textarea for typed answer (existing)                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────── OR ───────────────────────────────────    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 📷 PAPER SOLUTION UPLOADER (new)                                │   │
│  │                                                                 │   │
│  │  [📸 Take Photo]  [📁 Choose Files]                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ IMAGE PREVIEW GALLERY                                                   │
│                                                                         │
│  ┌───────┐ ┌───────┐ ┌───────┐                                        │
│  │  📄1  │ │  📄2  │ │  📄3  │  [+ Add More]                          │
│  │ 🔄 🗑️│ │ 🔄 🗑️│ │ 🔄 🗑️│                                          │
│  └───────┘ └───────┘ └───────┘                                        │
│                                                                         │
│                            [Extract Text from Images →]                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ EXTRACTED TEXT EDITOR                                                   │
│                                                                         │
│  Confidence: ████████░░ 82%                                            │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Let m₁ = 2kg, m₂ = 3kg                                         │   │
│  │ v₁ᵢ = 5 m/s, v₂ᵢ = 0                                          │   │
│  │                                                                 │   │
│  │ p_total = m₁v₁ᵢ + m₂v₂ᵢ = 10 kg⋅m/s                          │   │
│  │                                                                 │   │
│  │ [editable text area]                                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ☑️ Analyze my work (default)                                          │
│  ○ Just store my work                                                  │
│                                                                         │
│  [← Back]                                    [Analyze Solution →]       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ HANDWRITING FEEDBACK PANEL                                              │
│                                                                         │
│  Step 2: Apply Conservation of Momentum                                │
│  Status: ⚠️ PARTIAL - Good start, one issue to address                 │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────     │
│  ✅ What you did well:                                                  │
│  • Correctly identified masses and initial velocities                   │
│  • Set up p_before equation correctly                                   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────     │
│  🔍 First issue to address:                                             │
│  You assumed a perfectly inelastic collision...                         │
│                                                                         │
│  💡 Why this matters:                                                   │
│  The problem says "elastic collision" which requires...                 │
│                                                                         │
│  🤔 Think about this:                                                   │
│  "If kinetic energy is also conserved, what additional equation...?"   │
│                                                                         │
│  📎 Suggested next action:                                              │
│  Write the kinetic energy conservation equation.                        │
│                                                                         │
│  [📸 Upload Revised Work]  [✏️ Edit Text]  [Continue →]                │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Hierarchy

```
<StepAccordion>
  ├── <textarea> (existing typed input)
  │
  └── <PaperSolutionUploader>
        ├── <ImagePreviewGallery>
        │     └── <ImageThumbnail> (with rotate/delete controls)
        │
        ├── <ExtractedTextEditor>
        │     ├── <ConfidenceIndicator>
        │     ├── <textarea> (editable OCR output)
        │     └── <AnalyzeModeToggle>
        │
        └── <HandwritingFeedbackPanel>
              ├── <StatusBadge>
              ├── <CorrectElementsList>
              ├── <IssueDetail>
              ├── <SocraticNudge>
              └── <ActionButtons>
```

---

## 3. API Endpoints

### 3.1 Upload Images

```
POST /api/paper-solution/upload
Authorization: Bearer <userCode>

Request:
{
  "problemId": "abc123",
  "stepId": 2,  // or null for full problem
  "images": [
    {
      "base64Data": "...",
      "filename": "page1.jpg",
      "mimeType": "image/jpeg"
    }
  ]
}

Response:
{
  "uploadId": "upload_xyz",
  "images": [
    { "id": "img_1", "url": "...", "thumbnailUrl": "..." }
  ],
  "_quota": { "paperUploadsRemaining": 18, "dailyLimit": 20 }
}
```

### 3.2 Extract Text (OCR)

```
POST /api/paper-solution/extract
Authorization: Bearer <userCode>

Request:
{
  "uploadId": "upload_xyz",
  "imageIds": ["img_1", "img_2"],
  "enhanceForMath": true
}

Response:
{
  "extractionId": "ext_abc",
  "rawText": "...",
  "cleanedText": "...",
  "overallConfidence": 0.82,
  "lowConfidenceRegions": [
    {
      "regionId": "region_3",
      "text": "p = m[?]v",
      "confidence": 0.45,
      "alternatives": ["m₁v", "mv₁", "m₂v"]
    }
  ],
  "processingTimeMs": 2340
}
```

### 3.3 Analyze Solution

```
POST /api/paper-solution/analyze
Authorization: Bearer <userCode>

Request:
{
  "extractionId": "ext_abc",
  "finalText": "... user-edited text ...",
  "stepId": 2,
  "stepRubric": {
    "stepId": 2,
    "stepTitle": "Apply Conservation of Momentum",
    "objective": "Set up momentum equations",
    "requiredElements": ["identify system", "define variables", "p_before = p_after"],
    "commonMistakes": ["confusing elastic/inelastic", "sign errors"],
    "acceptanceCriteria": "..."
  },
  "problemContext": {
    "problemText": "...",
    "domain": "Mechanics",
    "subdomain": "Collisions",
    "relevantConcepts": ["momentum", "kinetic energy"]
  },
  "previousFeedback": null  // or previous feedback for revision
}

Response:
{
  "analysisId": "ana_123",
  "status": "partial",
  "summary": "Good start with momentum setup, but collision type assumption needs correction.",
  "correctElements": [
    "Correctly identified masses",
    "Set up initial momentum equation"
  ],
  "firstIssue": {
    "title": "Wrong collision type assumed",
    "description": "You used v_f = p/(m₁+m₂), which assumes inelastic collision",
    "whyItMatters": "Elastic collisions conserve both momentum AND kinetic energy"
  },
  "socraticNudge": "If kinetic energy is also conserved, what additional equation do you need?",
  "suggestedAction": "Write the KE conservation equation and solve the 2-equation system",
  "analysisConfidence": 0.91,
  "clarificationNeeded": false
}
```

---

## 4. Prompt Templates

### 4.1 OCR Extraction Prompt

```
SYSTEM:
You are an expert OCR system specialized in extracting handwritten physics
and mathematics solutions. Your task is to accurately transcribe handwritten
content from student work.

GUIDELINES:
1. Preserve the exact structure and flow of the student's work
2. Use standard notation: v₁, m₂, θ, ω, α, →, ≈, ≠, ≤, ≥, ∞
3. Mark unclear parts: [?] or [unclear: best guess]
4. Preserve intentional line breaks
5. Format code blocks with ``` markers
6. Keep equations on their own lines
7. Describe diagrams: [DIAGRAM: brief description]

OUTPUT FORMAT (JSON):
{
  "rawText": "exact transcription",
  "cleanedText": "normalized version",
  "regions": [...],
  "overallConfidence": 0.87,
  "notes": "observations about legibility"
}
```

### 4.2 Socratic Analysis Prompt

```
SYSTEM:
You are a Socratic physics tutor analyzing a student's handwritten solution.
Provide focused, constructive feedback that helps the student discover their
own errors.

CORE PRINCIPLES:
1. ONE ISSUE FOCUS: Identify only the FIRST significant issue
2. SOCRATIC METHOD: Ask guiding questions, don't give answers
3. POSITIVE FIRST: Acknowledge what's correct before issues
4. CONCEPTUAL DEPTH: Connect errors to underlying physics
5. OCR AWARENESS: If text seems misread, ask for clarification

ANALYSIS FRAMEWORK:
- Compare against step objective and rubric
- Check: principles, equation setup, logic flow, given info, assumptions
- Distinguish: conceptual vs procedural vs calculation errors

OUTPUT FORMAT (JSON):
{
  "status": "pass|partial|fail|unclear",
  "summary": "1-2 sentence assessment",
  "correctElements": ["what they did right"],
  "firstIssue": { "title", "description", "whyItMatters" } | null,
  "socraticNudge": "guiding question",
  "suggestedAction": "concrete next step",
  "analysisConfidence": 0.85,
  "clarificationNeeded": false
}
```

---

## 5. Data Model Changes

### 5.1 New Types (types/paperSolution.ts)

See the created file for complete type definitions including:
- `ImageUpload`
- `SolutionUpload`
- `ExtractionResult`
- `AnalysisResult`
- `StepRubric`

### 5.2 Storage Extensions

```typescript
// Extend existing StepProgress
interface StepProgressWithPaper {
  stepId: number
  isCompleted: boolean
  userAnswer?: string              // Typed (existing)
  paperSolutionId?: string         // Paper upload (new)
  submissionMethod: 'typed' | 'paper' | 'both'
}
```

### 5.3 Quota Extension

Add to serverQuotaService:
```typescript
quotas: {
  problems: number     // existing
  hints: number        // existing
  reflections: number  // existing
  paperUploads: number // NEW: daily limit 20
}
```

---

## 6. Phased Implementation Roadmap

### Phase 1: MVP (Week 1-2)

**Goal:** Basic upload → OCR → feedback flow working end-to-end

#### 6.1.1 Week 1: Foundation

| Task | Priority | Effort |
|------|----------|--------|
| Create `types/paperSolution.ts` | P0 | 2h |
| Build `PaperSolutionUploader` component shell | P0 | 4h |
| Build `ImagePreviewGallery` component | P0 | 4h |
| Implement `POST /api/paper-solution/upload` | P0 | 3h |
| Basic file validation (type, size) | P0 | 2h |
| Image rotation handling | P1 | 2h |

**Milestone:** User can upload and preview images with rotation

#### 6.1.2 Week 2: OCR + Analysis

| Task | Priority | Effort |
|------|----------|--------|
| Implement `POST /api/paper-solution/extract` with Claude Vision | P0 | 6h |
| Build `ExtractedTextEditor` component | P0 | 4h |
| Confidence highlighting for low-confidence regions | P1 | 3h |
| Implement `POST /api/paper-solution/analyze` | P0 | 6h |
| Build `HandwritingFeedbackPanel` component | P0 | 4h |
| Integrate into StepAccordion | P0 | 3h |
| Add paperUploads quota tracking | P1 | 2h |

**Milestone:** Complete flow: upload → extract → edit → analyze → feedback

---

### Phase 2: Polish & Edge Cases (Week 3)

**Goal:** Handle errors gracefully, improve confidence UX

| Task | Priority | Effort |
|------|----------|--------|
| Image quality detection + tips | P1 | 4h |
| Low-confidence region confirmation UI | P1 | 4h |
| "Just store" mode (skip analysis) | P1 | 2h |
| Revision flow (upload new image with context) | P1 | 3h |
| Mobile camera capture optimization | P2 | 4h |
| Dark mode styling for all components | P2 | 2h |
| Error state handling (network, API failures) | P1 | 3h |
| Loading state improvements | P2 | 2h |

**Milestone:** Production-ready error handling and mobile experience

---

### Phase 3: Region Highlighting (Week 4)

**Goal:** Link feedback to specific image regions

| Task | Priority | Effort |
|------|----------|--------|
| Store bounding boxes from OCR | P2 | 4h |
| Image overlay component for highlighting | P2 | 6h |
| Click-to-jump between feedback and image | P2 | 4h |
| Side-by-side view (image + extracted text) | P3 | 4h |

**Milestone:** Visual connection between feedback and handwritten work

---

### Phase 4: Enhanced Math Support (Week 5+)

**Goal:** Better math notation handling

| Task | Priority | Effort |
|------|----------|--------|
| LaTeX output option from OCR | P3 | 6h |
| Math renderer for extracted equations | P3 | 4h |
| Structured math parsing (basic) | P3 | 8h |
| Equation comparison for analysis | P3 | 6h |

**Milestone:** Math-aware extraction and feedback

---

### Phase 5: Full Problem Upload (Week 6+)

**Goal:** Support uploading solution for entire problem, not just per-step

| Task | Priority | Effort |
|------|----------|--------|
| Multi-step detection in single image | P3 | 8h |
| Step-by-step feedback for full solution | P3 | 6h |
| Auto-mapping to scaffold steps | P3 | 6h |

**Milestone:** Support both per-step and full-problem workflows

---

## 7. Testing Strategy

### 7.1 Unit Tests

- Image validation (type, size, count)
- Confidence scoring logic
- Prompt construction
- Response parsing

### 7.2 Integration Tests

- Upload → Extract → Analyze flow
- Quota enforcement
- Error handling at each stage

### 7.3 Manual Testing Checklist

- [ ] Upload from mobile camera
- [ ] Upload from desktop file picker
- [ ] Multiple images (reorder, delete, add)
- [ ] Rotate 90°, 180°, 270°
- [ ] Low-confidence text highlighting
- [ ] Edit extracted text
- [ ] Toggle analyze/store mode
- [ ] Receive feedback for pass/partial/fail
- [ ] Upload revised work
- [ ] Dark mode appearance

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Upload success rate | >95% | API success/total attempts |
| OCR confidence | >75% avg | Extraction confidence scores |
| User correction rate | <30% | Edits to extracted text |
| Feedback helpfulness | >4/5 | Post-feedback survey |
| Revision rate | >50% | Users who revise after feedback |
| Time to feedback | <10s | Upload start to feedback display |

---

## 9. Open Questions

1. **Storage:** Where to persist uploaded images long-term? (S3, R2, etc.)
2. **Cost:** Claude Vision API costs per image - need usage monitoring
3. **Math rendering:** Integrate KaTeX/MathJax for extracted equations?
4. **Diagram support:** Should we attempt to interpret hand-drawn diagrams?
5. **Handwriting training:** User-specific OCR improvements over time?

---

## 10. Files Created

| File | Purpose |
|------|---------|
| `types/paperSolution.ts` | All TypeScript types |
| `app/api/paper-solution/upload/route.ts` | Image upload endpoint |
| `app/api/paper-solution/extract/route.ts` | OCR extraction endpoint |
| `app/api/paper-solution/analyze/route.ts` | Socratic analysis endpoint |
| `components/paper-solution/PaperSolutionUploader.tsx` | Main orchestrator |
| `components/paper-solution/ImagePreviewGallery.tsx` | Image gallery UI |
| `components/paper-solution/ExtractedTextEditor.tsx` | Text editing UI |
| `components/paper-solution/HandwritingFeedbackPanel.tsx` | Feedback display |
| `components/paper-solution/index.ts` | Component exports |
| `docs/PAPER_SOLUTION_FEATURE.md` | This documentation |
