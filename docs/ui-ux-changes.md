# UI/UX Improvements Documentation

This document describes the UI/UX improvements implemented based on feedback analysis.

## Overview

The changes focus on five key areas:
1. Reducing solve-mode feature density with Coach Tools consolidation
2. Replacing fake progress with honest indeterminate progress
3. Standardizing feedback surfaces across the app
4. Reducing spinner/redirect friction on entry
5. Accessibility quick wins for modals

---

## Phase 1: Coach Tools Panel

### What Changed
- Created a consolidated "Coach Tools" panel that houses advanced interventions
- Added a persistent Coach Tools button in the solve surface header (top-right)
- Moved advanced features behind this single affordance:
  - Step confidence heatmap
  - Related past mistakes display
  - Constraint feedback/collisions
  - "Stuck?" Socratic rewind helper
  - Pattern selection
  - Skip/commit analytics

### Why
- Solve mode was too feature-dense with competing UI elements
- Users need a focused, guided path for the core solve experience
- Advanced tools should be accessible but not intrusive

### Files Changed
- `components/CoachToolsPanel.tsx` (new)
- `components/SolutionScaffold.tsx` (integrated panel)

### Screens/Flows Affected
- Solve page main view
- All modals/interventions that were moved into the panel

### Acceptance Checklist
- [ ] User can complete the standard happy path without seeing multiple competing popups
- [ ] All advanced tools are accessible via the Coach Tools button
- [ ] Panel remembers its open/closed state during the session
- [ ] Alert badge shows count of active issues (constraint collisions, mistakes)

---

## Phase 2: Progress Indicator Honesty

### What Changed
- Removed time-based fake progress bars from ProblemInput
- Replaced with honest indeterminate progress animation
- Status messages cycle without implying specific progress percentages
- Shows realistic time estimate ("typically takes 10-20 seconds")

### Why
- The old progress bar was fake - it showed percentages based on elapsed time, not actual server progress
- Users would see progress jump backwards or hang at 95% indefinitely
- Honest UX is better UX

### Files Changed
- `components/ProblemInput.tsx` (loading state redesign)
- `app/globals.css` (indeterminate progress animation)

### Screens/Flows Affected
- Problem input/submission flow
- Scaffold generation loading state

### Acceptance Checklist
- [ ] No time-based fake progress bars that diverge from actual work
- [ ] User sees honest indeterminate progress indicator
- [ ] Status messages cycle to show activity without fake percentages
- [ ] Progress transitions never "jump backwards"

---

## Phase 3: Standardized Feedback Surfaces

### What Changed
- Created `InlineError`, `InlineWarning`, `InlineSuccess` components
- Established clear rules for feedback placement:
  - **Inline (near control)**: validation errors, blocking API errors, form errors
  - **Toast**: "Saved", "Copied", "Updated", non-blocking confirmations
- Updated ProblemInput to use InlineError for API errors

### Why
- Feedback surfaces were inconsistent across the app
- Blocking errors were sometimes shown as toasts (easy to miss)
- Need clear rules for developers to follow

### Files Changed
- `components/ui/InlineError.tsx` (new)
- `components/ProblemInput.tsx` (uses InlineError)

### Screens/Flows Affected
- All forms and input areas
- Problem submission error handling

### Acceptance Checklist
- [ ] Blocking error messages appear near the thing the user interacted with
- [ ] Toasts are not used for critical errors that require immediate attention
- [ ] Inline error components have proper ARIA roles (`role="alert"`, `aria-live`)

---

## Phase 4: Entry Redirect Friction

### What Changed
- Created `ShellSkeleton` component with dashboard/solve/generic variants
- Updated home page to show skeleton during redirects instead of simple spinner
- Skeleton matches the target page layout structure

### Why
- Cold load showed "spinner -> redirect -> spinner" behavior
- Users experienced jarring transitions
- Skeleton provides smoother perceived performance

### Files Changed
- `components/shell/ShellSkeleton.tsx` (new)
- `app/page.tsx` (uses ShellSkeleton during redirects)

### Screens/Flows Affected
- Home page (`/`)
- Initial app load when Dashboard V3 is enabled

### Acceptance Checklist
- [ ] Cold load shows one consistent shell/skeleton, not multiple sequential spinners
- [ ] Skeleton matches the layout structure of the target page
- [ ] Desktop and mobile layouts both have appropriate skeletons

---

## Phase 5: Modal Accessibility

### What Changed
- Created `useAccessibleModal` hook for reusable modal accessibility
- Updated ToastProvider confirm dialog with full accessibility support
- Added:
  - Focus trap inside modals
  - Escape key closes modal
  - `aria-modal="true"` and `role="dialog"`
  - `aria-labelledby` and `aria-describedby`
  - Returns focus to triggering element on close
  - Body scroll lock while modal is open

### Why
- Keyboard-only users couldn't properly navigate modals
- Screen readers didn't announce dialogs correctly
- Focus would get lost when modals closed

### Files Changed
- `hooks/useAccessibleModal.ts` (new)
- `components/ui/ToastProvider.tsx` (accessible ConfirmDialog)
- `components/CoachToolsPanel.tsx` (uses accessible modal patterns)

### Screens/Flows Affected
- All confirmation dialogs
- Coach Tools panel
- Any component using the useAccessibleModal hook

### Acceptance Checklist
- [ ] Keyboard-only user can open/close modals using Tab and Escape
- [ ] Focus is trapped inside modal while open
- [ ] Screen readers announce dialogs correctly
- [ ] Focus returns to triggering element when modal closes

---

## Verification Commands

```bash
# Run TypeScript checks
npx tsc --noEmit

# Run ESLint
npm run lint

# Run development server
npm run dev

# Run build
npm run build

# Run tests (if configured)
npm test
```

## Manual Testing Steps

### Coach Tools Panel
1. Navigate to solve page and submit a problem
2. Verify the Coach Tools button appears in the header
3. Click the button and verify the panel opens
4. Navigate through all sections in the panel
5. Close the panel and verify focus returns

### Progress Indicator
1. Submit a problem on the solve page
2. Verify the loading indicator shows indeterminate progress
3. Verify no fake percentage is displayed
4. Verify the message cycles through different states

### Feedback Surfaces
1. Try to submit an empty problem
2. Verify inline validation error appears near the textarea
3. Trigger an API error and verify inline error appears
4. Complete an action and verify toast appears for confirmation

### Entry Redirect
1. Clear browser cache and reload the home page
2. Verify a skeleton appears instead of a spinner
3. Verify smooth transition to the dashboard

### Modal Accessibility
1. Open a confirmation dialog
2. Press Tab and verify focus stays within the modal
3. Press Escape and verify modal closes
4. Use a screen reader and verify dialog is announced

---

## Tradeoffs and TODOs

### Known Limitations
- Coach Tools panel doesn't yet include all advanced interventions (some modals like DrillModal still appear independently when circuit breaker trips)
- The useAccessibleModal hook should be applied to more modals across the app

### Future Improvements
- Consider adding keyboard shortcut hints in Coach Tools panel
- Add animation transitions for panel open/close
- Implement server-side progress tracking for truly real progress bars
- Create a modal registry to ensure only one modal is open at a time

### Technical Debt
- Some older modal components still don't use the accessible modal hook
- Should audit all alert/confirm usage across the app to ensure consistency

---

## Files Summary by Phase

### Phase 1: Coach Tools
- `components/CoachToolsPanel.tsx` (new, 500+ lines)
- `components/SolutionScaffold.tsx` (modified)

### Phase 2: Progress Honesty
- `components/ProblemInput.tsx` (modified)
- `app/globals.css` (modified)

### Phase 3: Feedback Standardization
- `components/ui/InlineError.tsx` (new)
- `components/ProblemInput.tsx` (modified)

### Phase 4: Entry Redirect
- `components/shell/ShellSkeleton.tsx` (new)
- `app/page.tsx` (modified)

### Phase 5: Accessibility
- `hooks/useAccessibleModal.ts` (new)
- `components/ui/ToastProvider.tsx` (modified)
