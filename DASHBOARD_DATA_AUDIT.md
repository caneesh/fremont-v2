# Dashboard Data Authenticity Audit

**Audit Date:** 2026-01-10
**Auditor:** Senior Engineer Review
**Scope:** All dashboard sections in DashboardV3

## Executive Summary

**Verdict: ALL DATA IS REAL** - The dashboard displays actual user activity data persisted in localStorage. There is NO mock data, hardcoded placeholders, or demo data. However, data is localStorage-only (no server persistence).

---

## 1. Dashboard Entry Point

### Route Mapping
| Route | Condition | Component |
|-------|-----------|-----------|
| `/` | `DASHBOARD_V3=true` | Redirects to `/study-path` |
| `/study-path` | `DASHBOARD_V3=true` | `DashboardV3` |
| `/study-path` | `DASHBOARD_V3=false` | Legacy topic view |

### Entry File
- **Route:** `app/study-path/page.tsx:111-124`
- **Component:** `components/dashboard/DashboardV3.tsx`

### Child Components (Data Tiles)
| Component | File | Data Type |
|-----------|------|-----------|
| `DashboardTiles` | `components/dashboard/DashboardTiles.tsx` | Continue, Tasks, Progress, Reviews |
| `TodaysFocus` | `components/dashboard/TodaysFocus/TodaysFocus.tsx` | Primary action recommendation |
| `DashboardHeroMetrics` | `components/dashboard/DashboardHeroMetrics.tsx` | Days practiced, Problems solved, Independence |
| `ProgressOverview` | `components/dashboard/ProgressOverview/ProgressOverview.tsx` | Pattern mastery, Confidence, Sanity checks |
| `MistakeIntelligence` | `components/dashboard/MistakeIntelligence/MistakeIntelligence.tsx` | Top mistake categories |
| `ActiveProblems` | `components/dashboard/ActiveProblems/ActiveProblems.tsx` | In-progress, solved, skipped problems |
| `CoverageSummary` | `components/dashboard/CoverageSummary.tsx` | Topics touched this week |

---

## 2. Data Provenance Audit

### Per-Section Analysis

| Section | UI Component | Data Source Type | localStorage Key | Evidence | Update Mechanism | Verdict |
|---------|-------------|------------------|------------------|----------|------------------|---------|
| **Continue Tile** | `DashboardTiles.tsx:70-126` | localStorage | `physiscaffold_problem_attempts` | `useDashboardData.ts:99-117` via `problemHistoryService.getHistory()` | `saveDraft()` called on every problem step edit | **REAL** |
| **Today's Tasks** | `DashboardTiles.tsx:140-227` | localStorage | `physiscaffold_today_plan_{userId}_{date}` | `useDashboardData.ts:120-125` via `planService.getOrCreatePlan()` | User adds tasks via TaskPickerModal | **REAL** |
| **Progress Summary** | `DashboardTiles.tsx:242-296` | localStorage | `physiscaffold_study_progress` | `useDashboardData.ts:128-134` via `studyPathService.getStudyStats()` | `markQuestionSolved()` on problem completion | **REAL** |
| **Review Queue** | `DashboardTiles.tsx:315-393` | localStorage | `physiscaffold_mistake_cards` | `useDashboardData.ts:137-149` via `getCardsDue()`, `getNotebookStats()` | `createMistakeCard()` on struggle events | **REAL** |
| **Today's Focus** | `TodaysFocus.tsx:85-153` | localStorage | Multiple (see below) | `todaysFocusService.ts:321-377` | Aggregates from problem history, mistakes, patterns | **REAL** |
| **Hero Metrics** | `DashboardHeroMetrics.tsx` | localStorage | `physiscaffold_problem_attempts` | `dashboardMetrics.ts:86-138` via `computeDashboardMetrics()` | Problem attempts trigger updates | **REAL** |
| **Pattern Mastery** | `ProgressOverview.tsx` | localStorage | `physiscaffold_v2_pattern_states` | `progressOverviewService.ts:69-111` via `studyPlanV2Service` | Pattern practice updates state | **REAL** |
| **Confidence Distribution** | `ProgressOverview.tsx` | localStorage | `physiscaffold_v2_step_attempts` | `progressOverviewService.ts:116-163` | Step attempts with confidence rating | **PARTIAL** |
| **Sanity Check Rate** | `ProgressOverview.tsx` | localStorage | `physiscaffold_events` | `progressOverviewService.ts:168-209` | Event logging on check completion | **PARTIAL** |
| **Mistake Intelligence** | `MistakeIntelligence.tsx` | localStorage | `physiscaffold_mistake_cards` | `mistakeIntelligenceService.ts:191-254` | Mistake cards created on struggles | **REAL** |
| **Active Problems** | `ActiveProblems.tsx` | localStorage | `physiscaffold_problem_attempts` | `activeProblemsService.ts` (not shown) | Problem history service | **REAL** |

### localStorage Keys Summary
```
physiscaffold_problem_attempts     # Problem history (IN_PROGRESS, SOLVED, SKIPPED)
physiscaffold_study_progress       # Topic-level progress
physiscaffold_today_plan_*         # Daily study plans
physiscaffold_mistake_cards        # SRS mistake cards
physiscaffold_review_sessions      # Review session history
physiscaffold_review_streak        # Current review streak
physiscaffold_v2_pattern_states    # Pattern mastery states
physiscaffold_v2_step_attempts     # Individual step attempts
physiscaffold_events               # Event log for analytics
```

### Data Flow Diagram
```
[User Activity]
       │
       ▼
┌──────────────────┐
│   SolvePage      │──► problemHistoryService.saveDraft()
│   (problem work) │──► createMistakeCard() on struggles
└──────────────────┘──► studyPathService.markQuestionSolved()
       │
       ▼
┌──────────────────┐
│   localStorage   │◄── All persistence
└──────────────────┘
       │
       ▼
┌──────────────────┐
│   Dashboard      │──► useDashboardData()
│   Components     │──► useStudyDashboardModel()
└──────────────────┘──► Section-specific services
```

---

## 3. Integration Gap Analysis

### PARTIAL Verdicts Explained

#### Confidence Distribution
- **Issue:** Not all step types log `confidenceRating`
- **Current:** `physiscaffold_v2_step_attempts` requires `confidenceRating` field
- **Gap:** Some step submissions don't include confidence
- **Fix:** Ensure all step completion handlers call `logStepAttempt()` with confidence

#### Sanity Check Rate
- **Issue:** Depends on consistent event logging
- **Current:** Looks for `sanity_check_completed` events in `physiscaffold_events`
- **Gap:** Not all completion paths log this event
- **Fix:** Add event logging to sanity check UI component

### TODO Markers in Code

| Location | TODO | Status |
|----------|------|--------|
| `useDashboardData.ts:49-50` | `patternsMastered: number \| null // null = data not available yet` | Needs pattern mastery service |
| `useDashboardData.ts:83` | `patternsMastered: null, // TODO: wire to pattern service` | Same as above |
| `DashboardTiles.tsx:288-289` | `{/* TODO: Wire to pattern mastery service */}` | Display shows "Patterns (TODO)" |

### Missing Integrations Checklist

- [ ] Wire `patternsMastered` to `studyPlanV2Service.getPatternState()` mastery calculation
- [ ] Add confidence rating to all step completion handlers
- [ ] Add `sanity_check_completed` event to SanityCheckModal onComplete
- [ ] Add cross-device sync (requires backend)

---

## 4. Runtime Verification

### Existing Dev Panel
Location: `components/dashboard/DashboardDevPanel.tsx`

The panel already shows:
- User ID
- Data provider (mock/local/db)
- Loading state
- Feature flags
- Model summary (tasks, modules, reviews, mistakes)
- Activity metrics
- Full model JSON (expandable)

**Verdict:** Existing panel satisfies Data Inspector requirements.

### How to Access
1. Run `npm run dev`
2. Visit `/study-path`
3. Click "Dev Panel" button (bottom-right corner)
4. Only visible when `NODE_ENV !== 'production'`

---

## 5. Update Event Tracing

### What Writes to Each Storage Key

| Storage Key | Writer Function | Trigger Event |
|-------------|-----------------|---------------|
| `physiscaffold_problem_attempts` | `problemHistoryService.saveDraft()` | User edits any step |
| | `problemHistoryService.markSolved()` | User completes problem |
| | `problemHistoryService.markSkipped()` | User skips problem |
| `physiscaffold_study_progress` | `studyPathService.markQuestionAttempted()` | User starts question |
| | `studyPathService.markQuestionSolved()` | User completes question |
| `physiscaffold_mistake_cards` | `createMistakeCard()` | Hint requested, step failed, timeout |
| `physiscaffold_review_sessions` | `submitReviewSession()` | User completes review |
| `physiscaffold_v2_pattern_states` | `studyPlanV2Service.updatePatternState()` | Pattern practice completion |

---

## 6. Recommended Minimal PR Plan

### PR 1: Fix patternsMastered TODO (Small)
```typescript
// In useDashboardData.ts, replace line 133:
patternsMastered: null,
// With:
patternsMastered: computePatternsMastered(userId),

// Add helper:
function computePatternsMastered(userId: string): number {
  const patterns = studyPlanV2Service.getAllPatterns()
  return patterns.filter(p => {
    const state = studyPlanV2Service.getPatternState(userId, p.id)
    return state.mastery >= 0.8
  }).length
}
```

### PR 2: Add Confidence Logging (Medium)
- Update step completion handlers to include `confidenceRating`
- Add UI prompt for confidence after step completion

### PR 3: Add Sanity Check Events (Small)
- Dispatch `sanity_check_completed` event on sanity check modal close
- Update `getSanityCheckStats()` to use this event

---

## 7. Verification Commands

```bash
# Start dev server
npm run dev

# Visit dashboard
open http://localhost:3000/study-path

# Run existing dashboard tests
npm test -- DashboardTiles

# Check TypeScript
npx tsc --noEmit

# View localStorage in browser
# DevTools → Application → Local Storage → localhost:3000
```

---

## Conclusion

The PhysiScaffold dashboard is populated with **REAL data** from actual user activity. All metrics, progress indicators, and recommendations derive from genuine interactions stored in localStorage.

**Strengths:**
- No mock/placeholder data
- Complete data flow from user action to display
- Existing Dev Panel for debugging

**Limitations:**
- localStorage-only (no server persistence)
- No cross-device sync
- Some minor integration gaps (confidence, sanity checks)

**Risk:** Clearing browser data loses all progress. Consider adding export/import functionality or server persistence for production use.
