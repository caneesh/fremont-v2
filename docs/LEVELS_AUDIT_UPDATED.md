# Levels Feature Audit - Updated

**Audit Date:** 2026-01-10
**Purpose:** Establish current truth of Foundation 1/Foundation 2 implementation and identify gaps for tutor behavior integration.

---

## 1. What Already Exists

### 1.1 Profile Storage Layer (COMPLETE)

| Component | File | Line | Status |
|-----------|------|------|--------|
| UserProfileStore class | `lib/profile/userProfileStore.ts` | 16-154 | DONE |
| Storage key | `lib/profile/userProfileStore.ts` | 11 | `physiscaffold_user_profile` |
| Default track | `lib/profile/userProfileStore.ts` | 12 | `foundation2` |
| useUserProfile hook | `lib/profile/useUserProfile.ts` | 42-105 | DONE |
| Profile types | `lib/profile/types.ts` | 12-27 | DONE |
| Track info constants | `lib/profile/types.ts` | 59-96 | DONE |

**Interface:**
```typescript
// lib/profile/userProfileStore.ts:16-40
class UserProfileStore {
  get(): UserProfile | null
  getTrack(): Track  // Returns default if no profile
  set(userId: string, update: UserProfileUpdate): UserProfile
  setTrack(userId: string, track: Track): UserProfile
  subscribe(callback: Subscriber): () => void
  clear(): void
  hasProfile(): boolean
  ensureProfile(userId: string): UserProfile
}
```

### 1.2 Level UI Components (COMPLETE)

| Component | File | Status |
|-----------|------|--------|
| LevelBadge | `components/LevelBadge.tsx` | DONE - Shows track, opens switcher on click |
| LevelSwitcher | `components/LevelSwitcher.tsx` | DONE - Modal with 4 track options |
| Settings Page | `app/settings/profile/page.tsx` | DONE |
| Debug Inspector | `app/debug/profile/page.tsx` | DONE |

### 1.3 Navigation Integration (PARTIAL)

| Location | File:Line | LevelBadge Present? |
|----------|-----------|---------------------|
| MobileNav (floating button) | `components/MobileNav.tsx:115` | YES |
| AppShell TopBar (desktop) | `components/shell/TopBar.tsx:74` | YES |
| AppShell BottomNavV2 (mobile) | `components/shell/BottomNavV2.tsx` | NO (uses MobileNav instead) |
| AppShell Sidebar (desktop) | `components/shell/Sidebar.tsx` | NO (in TopBar instead) |

**Status:** Desktop and mobile users can now see and change their level.

### 1.4 Track Definitions (COMPLETE - NOT WIRED)

| Definition | File:Line | Status |
|------------|-----------|--------|
| Foundation 1 Skills | `lib/tracks/foundation.ts:22-83` | Defined, not used at runtime |
| Foundation 2 Skills | `lib/tracks/foundation.ts:117-178` | Defined, not used at runtime |
| F1 Question Characteristics | `lib/tracks/foundation.ts:88-106` | Defined, not enforced |
| F2 Question Characteristics | `lib/tracks/foundation.ts:183-201` | Defined, not enforced |
| Track Transitions | `lib/tracks/foundation.ts:210-227` | Defined, not wired |
| Progression Requirements | `lib/tracks/foundation.ts:261-286` | Defined, not checked |
| Remediation Triggers | `lib/tracks/foundation.ts:343-368` | Defined, not wired |
| Readiness Signals | `lib/tracks/foundation.ts:440-475` | Defined, not used |

### 1.5 Question Filtering (PARTIAL)

| Component | File:Line | Status |
|-----------|-----------|--------|
| QuestionTrack type | `types/studyPath.ts:7` | DONE |
| difficultyToTracks() | `types/studyPath.ts:33-42` | DONE - Maps Easy/Med/Hard to tracks |
| questionMatchesTrack() | `types/studyPath.ts:47-55` | DONE |
| API ?track= param | `app/api/study-path/questions/route.ts:11-19` | DONE |
| Study path uses track | `app/study-path/page.tsx` | DONE - Passes track to API |

**Gap:** This is a difficulty-based proxy. Questions don't have explicit `track` field. Mapping is:
- Foundation 1/2 → Easy questions
- Foundation 2/Intermediate → Medium questions
- Intermediate/Competitive → Hard questions

### 1.6 E2E Tests (COMPLETE)

| Test | File | Coverage |
|------|------|----------|
| Level persistence | `e2e/level-persistence.spec.ts` | 7 tests covering badge, switcher, localStorage persistence, navigation |

---

## 2. What is Missing

### 2.1 ~~LevelBadge Not in Desktop Shell~~ (DONE)

**Status:** RESOLVED - LevelBadge added to `components/shell/TopBar.tsx:74`

### 2.2 Tutor Does NOT Adapt to Track

**Problem:** The Socratic tutor prompts are identical for all tracks. Foundation 1 users get the same tutoring style as Competitive users.

**Current state:** `app/api/socratic-tutor/route.ts`
- Line 33-65: GET handler prompt - no track awareness
- Line 130-174: POST handler prompt - no track awareness
- Line 240-317: Socratic-first mode prompt - no track awareness

**What F1/F2 should change:**

| Track | Expected Tutor Behavior | Currently Implemented |
|-------|------------------------|----------------------|
| Foundation 1 | Qualitative focus, no algebra, max 3 steps, 2-5 min questions | NO |
| Foundation 2 | Basic algebra OK, vector concepts, max 5 steps, 3-8 min questions | NO |
| Intermediate | Full algebra, multi-step, standard tutoring | (default behavior) |
| Competitive | Challenge mode, less hand-holding, time pressure | NO |

**Files to modify:**
- `app/api/socratic-tutor/route.ts` - Add `track` to request, inject track-specific prompt sections
- `lib/tracks/foundation.ts:88-106` - Use `FOUNDATION1_QUESTION_CHARACTERISTICS`
- `lib/tracks/foundation.ts:183-201` - Use `FOUNDATION2_QUESTION_CHARACTERISTICS`

**TODO:**
```
// TODO: Wire track to tutor prompts
// See: app/api/socratic-tutor/route.ts:33 (GET prompt)
// See: app/api/socratic-tutor/route.ts:130 (POST prompt)
// See: app/api/socratic-tutor/route.ts:240 (Socratic-first prompt)
// Reference: lib/tracks/foundation.ts:88-106 (F1 characteristics)
// Reference: lib/tracks/foundation.ts:183-201 (F2 characteristics)
```

### 2.3 Remediation Not Wired

**Problem:** `shouldTriggerRemediation()` function exists but is never called.

**Current state:**
- `lib/tracks/foundation.ts:373-414` - Function defined
- No callers in codebase

**Expected behavior:** When user struggles (low scores, repeated errors), suggest dropping to lower track.

**TODO:**
```
// TODO: Wire remediation triggers to question flow
// See: lib/tracks/foundation.ts:373-414 (shouldTriggerRemediation)
// Call site candidates:
//   - app/api/socratic-tutor/route.ts (after analyzing answer)
//   - lib/studyPath/studyPathService.ts (in progress tracking)
```

### 2.4 Progression Not Wired

**Problem:** `checkProgressionEligibility()` exists but is never called.

**Current state:**
- `lib/tracks/foundation.ts:291-327` - Function defined
- No callers in codebase
- No UI to show "ready to advance" status

**TODO:**
```
// TODO: Wire progression eligibility checks
// See: lib/tracks/foundation.ts:291-327 (checkProgressionEligibility)
// See: lib/tracks/foundation.ts:480-498 (calculateReadinessScore)
// UI candidates:
//   - app/settings/profile/page.tsx (show readiness)
//   - components/LevelBadge.tsx (show "ready" indicator)
```

### 2.5 Questions Not Tagged with Track

**Problem:** Questions in `data/questions.json` don't have explicit `track` field. Current filtering uses difficulty as proxy.

**Current mapping:** (`types/studyPath.ts:33-42`)
```typescript
case 'Easy': return ['foundation1', 'foundation2']
case 'Medium': return ['foundation2', 'intermediate']
case 'Hard': return ['intermediate', 'competitive']
```

**TODO:**
```
// TODO: Add explicit track field to questions
// See: data/questions.json (add "track" field)
// See: types/studyPath.ts:16 (track?: QuestionTrack is optional)
// Decision: Is difficulty proxy sufficient, or do we need per-question track tags?
```

### 2.6 Scaffold/Hint Behavior Not Track-Aware

**Problem:** Scaffold and hint generation doesn't adapt to track level.

**Files that generate scaffolds/hints:**
- `app/api/scaffold/hint/route.ts` - No track param
- `app/api/scaffold/step/explain/route.ts` - No track param
- `lib/phasedScaffold.ts` - No track awareness

**TODO:**
```
// TODO: Make scaffold generation track-aware
// See: app/api/scaffold/hint/route.ts
// See: app/api/scaffold/step/explain/route.ts
// See: lib/phasedScaffold.ts
// For F1: Simpler language, more diagrams, no equations
// For F2: Basic equations OK, step-by-step algebraic guidance
```

---

## 3. Next Commits Required

### ~~Commit 1: Add LevelBadge to Desktop Shell~~ (DONE)
**Status:** COMPLETE - Added to `components/shell/TopBar.tsx:74`

### Commit 2: Pass Track to Tutor API
**Priority:** High (foundation for behavior changes)
**Files:**
- `app/api/socratic-tutor/route.ts` - Accept `track` in request body
- `types/socraticTutor.ts` - Add `track` to request types
- Components calling the API - Pass track from `useUserProfile()`

### Commit 3: Inject Track-Specific Prompt Sections
**Priority:** High (core F1/F2 differentiation)
**Files:**
- `app/api/socratic-tutor/route.ts` - Build track-specific prompt sections
- `lib/tracks/foundation.ts` - Export prompt helper functions using FOUNDATION1/2_QUESTION_CHARACTERISTICS

**Prompt additions for F1:**
```
## Track: Foundation 1
- Focus on qualitative reasoning and physical intuition
- Do NOT use algebra or equations
- Use diagrams and visual explanations
- Keep explanations to 3 steps maximum
- Emphasize cause-effect relationships
```

**Prompt additions for F2:**
```
## Track: Foundation 2
- Bridge from intuition to quantitative reasoning
- Basic algebra is OK, but explain each step
- Introduce vector concepts gently
- Maximum 5 steps per problem
- Focus on understanding equations, not just solving
```

### Commit 4: Wire Remediation Triggers
**Priority:** Medium (adaptive learning)
**Files:**
- `lib/studyPath/studyPathService.ts` - Track error patterns
- `app/api/socratic-tutor/route.ts` - Call `shouldTriggerRemediation()`
- UI component - Show remediation suggestion

### Commit 5: Wire Progression Eligibility
**Priority:** Medium (track advancement)
**Files:**
- `lib/studyPath/studyPathService.ts` - Calculate stats for `checkProgressionEligibility()`
- `app/settings/profile/page.tsx` - Show readiness status
- `components/LevelBadge.tsx` - Optional "ready to advance" indicator

---

## 4. Summary Table

| Feature | Exists | Wired at Runtime | Affects User Experience |
|---------|--------|------------------|------------------------|
| Profile storage (localStorage) | YES | YES | YES - Track persists |
| LevelBadge (mobile) | YES | YES | YES - Users can see/change level |
| LevelBadge (desktop) | NO | - | NO - Desktop users don't see level |
| LevelSwitcher modal | YES | YES | YES - Users can change level |
| Question filtering by track | YES | YES | PARTIAL - Difficulty-based proxy |
| F1/F2 skill definitions | YES | NO | NO - Just data, not used |
| F1/F2 question characteristics | YES | NO | NO - Not enforced in tutor |
| Tutor prompts adapt to track | NO | NO | NO - Same tutoring for all |
| Remediation triggers | YES | NO | NO - Never called |
| Progression eligibility | YES | NO | NO - Never called |
| Scaffold/hints adapt to track | NO | NO | NO - Same for all tracks |

---

## 5. Verification Commands

```bash
# Check LevelBadge usage
grep -r "LevelBadge" --include="*.tsx" components/

# Check track usage in API routes
grep -r "track" --include="*.ts" app/api/

# Find tutor prompt locations
grep -n "You are a.*tutor" app/api/socratic-tutor/route.ts

# Check if remediation is called
grep -r "shouldTriggerRemediation" --include="*.ts" .

# Check if progression is called
grep -r "checkProgressionEligibility" --include="*.ts" .
```

---

## 6. Decision Points for Implementation

1. **Should track affect question content or just tutoring style?**
   - Current: Only tutoring style would change
   - Alternative: Filter/generate questions specifically for each track

2. **Should F1 users see F2/Intermediate questions at all?**
   - Current: Yes, via study-path filtering (difficulty proxy)
   - Alternative: Hard block on questions above their track

3. **Should progression be automatic or user-initiated?**
   - Current: Not implemented
   - Options:
     - Suggest advancement when ready
     - Auto-advance after threshold
     - User manually changes level

4. **How aggressive should remediation be?**
   - Current: Not implemented
   - Options:
     - Suggest only (user can ignore)
     - Strong recommendation with explanation
     - Auto-remediate after N failures
