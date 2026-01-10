# Levels Feature Audit

**Audit Date:** 2026-01-10
**Auditor:** Claude Code
**Purpose:** Verify implementation status of "Levels" (Foundation 1/2, Intermediate, Competitive) feature

---

## Executive Summary

| Level Name | Exists in Code? | Where (file paths) | Used at Runtime? | How User Accesses It Now |
|------------|-----------------|-------------------|------------------|-------------------------|
| Foundation 1 | YES | `prisma/schema.prisma:47`, `lib/tracks/foundation.ts:22-83` | PARTIAL - Questions tagged, no user selection | **NO ACCESS** |
| Foundation 2 | YES | `prisma/schema.prisma:48`, `lib/tracks/foundation.ts:117-178` | PARTIAL - Questions tagged, no user selection | **NO ACCESS** |
| Intermediate | YES | `prisma/schema.prisma:49`, `lib/tracks/foundation.ts:219` | PARTIAL - Questions tagged, no user selection | **NO ACCESS** |
| Competitive | YES | `prisma/schema.prisma:50`, `lib/tracks/foundation.ts:223` | DEFAULT - All users default here | **DEFAULT (no choice)** |

**VERDICT:** Levels exist in data model but **no UI exists for users to view or change their level**.

---

## 1. Where Levels Exist

### 1.1 Prisma Schema (`prisma/schema.prisma:46-51`)

```prisma
enum Track {
  foundation1
  foundation2
  intermediate
  competitive
}
```

- Questions have `track Track @default(competitive)` field (line 80)
- User model in schema does NOT have a track field
- Only questions are tagged with tracks, not users

### 1.2 Foundation Track Definitions (`lib/tracks/foundation.ts`)

**Foundation 1 Skills (lines 22-83):**
- `QUALITATIVE_REASONING` - Predict without calculation
- `REPRESENTATION` - Translate between verbal/pictorial/diagram
- `CAUSE_EFFECT` - Identify causal relationships
- `COMPARISON` - Compare scenarios
- `LIMITING_CASES` - Use extreme values

**Foundation 2 Skills (lines 117-178):**
- `VECTOR_SENSE` - Understand direction/magnitude
- `CONSTRAINT_IDENTIFICATION` - Recognize physical constraints
- `MULTI_STEP_REASONING` - Chain logical steps
- `EQUATION_SENSE` - Physical meaning of equations
- `UNIT_CONSISTENCY` - Dimensional analysis

**Track Transitions (lines 210-227):**
```typescript
foundation1 → foundation2
foundation2 → intermediate, competitive
intermediate → competitive
competitive → (top, remediate to intermediate/foundation2)
```

### 1.3 Analytics/Readiness (`lib/analytics/readiness.ts:253`)

```typescript
const trackOrder = [Track.foundation1, Track.foundation2, Track.intermediate, Track.competitive]
```

---

## 2. What Does NOT Exist

### 2.1 User Profile Store
- **No `UserProfileStore`** or similar abstraction
- **No `physiscaffold_user_profile`** localStorage key
- User session (`types/auth.ts`) contains only: `userId`, `code`, `authenticatedAt`
- **No track/level field in user session**

### 2.2 Level Selection UI
- **No `/settings` route** (`app/**/settings/**` = 0 files)
- **No `/profile` route** (`app/**/profile/**` = 0 files)
- **No onboarding flow** for level selection
- **No Level Badge** in navigation components
- **No Level Switcher** modal

### 2.3 Dashboard Integration
- `DashboardModel` (`types/dashboardModel.ts`) has no `track`/`level` field
- No level filtering in study plan generation

---

## 3. Current User Experience

### How Users Get Assigned a Level Today
1. User enters pilot code → Creates session with `userId`
2. **Default track = `competitive`** (hardcoded in Prisma schema)
3. No option to select or change level
4. All users see competitive-track questions

### What Users See
- No level indicator anywhere in UI
- No "Change Level" option
- Pattern Track page (`/pattern-track`) shows patterns but not user's track level
- Dashboard shows progress but no track context

---

## 4. Gap Analysis

| Component | Expected | Actual | Gap |
|-----------|----------|--------|-----|
| User Profile Storage | `localStorage` with track | None | **MISSING** |
| Level Badge (Header) | Shows current level | None | **MISSING** |
| Level Switcher Modal | Lets user change level | None | **MISSING** |
| Settings Page | `/settings/profile` | No settings routes | **MISSING** |
| Onboarding | First-time level selection | None | **MISSING** |
| Dashboard Integration | Filter by user's track | No filtering | **MISSING** |
| Question Selection | Filter by user's track | Questions have track, but not filtered | **PARTIAL** |

---

## 5. Implementation Plan

### Phase 1: UserProfileStore (Priority: HIGH)

Create `lib/profile/userProfileStore.ts`:
```typescript
interface UserProfile {
  userId: string
  track: Track
  displayName?: string
  createdAt: string
  updatedAt: string
}

interface UserProfileStore {
  get(): UserProfile | null
  set(profile: Partial<UserProfile>): void
  subscribe(callback: (profile: UserProfile | null) => void): () => void
  clear(): void
}
```

**Storage Key:** `physiscaffold_user_profile`

### Phase 2: Level Badge + Switcher (Priority: HIGH)

**Level Badge:** Add to `components/MobileNav.tsx` or create new `components/LevelBadge.tsx`
- Shows: "Foundation 1" / "Foundation 2" / "Intermediate" / "Competitive"
- Click to open Level Switcher modal

**Level Switcher Modal:** Create `components/LevelSwitcher.tsx`
- Radio buttons for 4 tracks
- Description of each track
- "Save" button persists to UserProfileStore

### Phase 3: Settings Page (Priority: MEDIUM)

Create `app/settings/profile/page.tsx`:
- Current level display + change button
- Display name (optional)
- Export/import progress data

### Phase 4: Dashboard Integration (Priority: MEDIUM)

Update question selection to filter by user's track:
- `lib/questionEngine/selection.ts` - Add track filter
- `hooks/useStudyDashboardModel.ts` - Include track in model

### Phase 5: Debug Inspector (Priority: LOW)

Create `app/debug/profile/page.tsx`:
- Show all UserProfile data
- Allow manual profile editing (dev-only)

---

## 6. Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `lib/profile/userProfileStore.ts` | UserProfile CRUD + subscription |
| `lib/profile/types.ts` | UserProfile TypeScript types |
| `components/LevelBadge.tsx` | Header level indicator |
| `components/LevelSwitcher.tsx` | Modal for changing level |
| `app/settings/profile/page.tsx` | User settings page |
| `app/debug/profile/page.tsx` | Dev-only profile inspector |
| `e2e/level-persistence.spec.ts` | E2E smoke test |

### Modified Files
| File | Change |
|------|--------|
| `components/MobileNav.tsx` | Add LevelBadge |
| `types/dashboardModel.ts` | Add `track` field |
| `hooks/useStudyDashboardModel.ts` | Load track from profile |
| `lib/storage/types.ts` | Add `USER_PROFILE` storage key |

---

## 7. Verification Checklist

After implementation, verify:

- [ ] User can see their current level in the header
- [ ] User can click level badge to open switcher
- [ ] User can select a different level
- [ ] Level persists across page reloads (localStorage)
- [ ] Level persists across browser sessions
- [ ] `/settings/profile` page shows current level
- [ ] `/debug/profile` page shows all profile data (dev-only)
- [ ] E2E test passes for level persistence
- [ ] Dashboard respects user's selected level (future)

---

## 8. Vercel Environment Variables

No new environment variables required for basic implementation.

Future consideration:
- `NEXT_PUBLIC_DEFAULT_TRACK`: Override default track for new users

---

## 9. Implementation Status (Updated 2026-01-10)

### Implemented Components

| Component | File | Status |
|-----------|------|--------|
| UserProfileStore | `lib/profile/userProfileStore.ts` | DONE |
| Profile Types | `lib/profile/types.ts` | DONE |
| useUserProfile Hook | `lib/profile/useUserProfile.ts` | DONE |
| LevelBadge | `components/LevelBadge.tsx` | DONE |
| LevelSwitcher Modal | `components/LevelSwitcher.tsx` | DONE |
| Settings Page | `app/settings/profile/page.tsx` | DONE |
| Debug Inspector | `app/debug/profile/page.tsx` | DONE |
| E2E Tests | `e2e/level-persistence.spec.ts` | DONE |

### Storage Key Added

- `physiscaffold_user_profile` - Added to `lib/storage/types.ts`

### Files Modified

- `components/MobileNav.tsx` - Added LevelBadge and Settings nav item

### Remaining Work

- ~~Dashboard Integration: Filter questions by user's selected track~~ **DONE**

### Track Filtering Integration (Added 2026-01-10)

| Component | Change |
|-----------|--------|
| `types/studyPath.ts` | Added `QuestionTrack` type, `difficultyToTracks()`, `questionMatchesTrack()` |
| `lib/studyPath/studyPathService.ts` | Added `getQuestionsByTrack()`, `getQuestionsByTopicAndTrack()`, `getQuestionsBySubtopicAndTrack()`, updated `getRecommendedQuestions()` |
| `app/api/study-path/questions/route.ts` | Added `?track=` query parameter for filtering |
| `app/study-path/page.tsx` | Uses `useUserProfile()` hook to pass track to API |

**Track-to-Difficulty Mapping:**
- Foundation 1/2: Easy questions
- Foundation 2/Intermediate: Medium questions
- Intermediate/Competitive: Hard questions

---

## Conclusion

**Levels are now ACCESSIBLE to users.**

Implementation completed:
1. User profile storage with localStorage persistence
2. Level badge visible in navigation header
3. Level switcher modal for changing level
4. Settings page at `/settings/profile`
5. Debug inspector at `/debug/profile` (dev-only)
6. E2E smoke tests for persistence

**Remaining work:** Integrate level with question selection to filter by track.
