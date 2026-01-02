# Confidence Repair System - UI Test Cases

These test cases cover all user journeys for the Confidence Repair System. Each scenario is designed to be recorded as a short video demo (1-3 minutes).

---

## Video Demo Index

| Demo # | Title | Duration | Scenario |
|--------|-------|----------|----------|
| 1 | Happy Path - No Recovery Needed | 1 min | Normal session, no triggers |
| 2 | Bad Session Detection | 2 min | Triggering bad session indicators |
| 3 | Recovery Mode Activation | 2 min | Starting new session after bad session |
| 4 | Recovery Mode Completion | 2 min | Successfully completing warm-up |
| 5 | Recovery Mode - Reveal Disabled | 1 min | Attempting to use Reveal in recovery |
| 6 | Recovery Mode - Supportive Tone | 1 min | Professor check-in during recovery |
| 7 | Edge Case - No Mastered Problems | 1 min | Recovery with fallback selection |
| 8 | Session Abandonment Mid-Problem | 1 min | Closing browser during problem |

---

## Demo 1: Happy Path - No Recovery Needed

**Goal:** Show that normal sessions don't trigger recovery mode.

**Duration:** ~1 minute

### Prerequisites
- Clear localStorage: `localStorage.clear()`
- Clear sessionStorage: `sessionStorage.clear()`
- Feature flag enabled: `CONFIDENCE_REPAIR=true`

### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to a problem | Problem loads normally, no recovery banner |
| 2 | Complete Step 1 using micro-tasks | Step completes, no issues |
| 3 | Complete Step 2 using micro-tasks | Step completes, reveals available |
| 4 | Use Reveal once on Step 3 | Reveal works normally |
| 5 | Complete the problem | Problem marked as solved |
| 6 | Close tab, open new session | No recovery mode message appears |
| 7 | Navigate to next problem | Normal problem view, no restrictions |

### Verification Points
- [ ] No "Let's rebuild confidence first" message
- [ ] Reveal button is enabled
- [ ] Professor check-in uses normal tone
- [ ] Session metrics show < 2 triggers

---

## Demo 2: Bad Session Detection

**Goal:** Show how a frustrating session triggers the detection system.

**Duration:** ~2 minutes

### Prerequisites
- Clear localStorage and sessionStorage
- Start fresh session

### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to a challenging problem | Problem loads |
| 2 | Struggle with Step 1, use Reveal | Reveal counter: 1 |
| 3 | Struggle with Step 2, use Reveal | Reveal counter: 2 |
| 4 | Struggle with Step 3, use Reveal | Reveal counter: 3 (trigger 1: reveal_overuse) |
| 5 | Make multiple wrong attempts | Circuit breaker warning appears |
| 6 | Continue making errors | Circuit breaker trips (trigger 2: circuit_breaker_trip) |
| 7 | Open DevTools Console | Check session metrics show 2+ triggers |

### Verification Points
- [ ] Console shows `[SessionOutcome]` logs with trigger count
- [ ] `getSessionOutcomeSummary()` returns `isBad: true`
- [ ] At least 2 triggers are activated

### DevTools Commands
```javascript
// Check current session state
import('/lib/sessionOutcomeAnalyzer').then(m => console.log(m.getSessionOutcomeSummary()))

// Check if trending bad
import('/lib/sessionOutcomeAnalyzer').then(m => console.log(m.isSessionTrendingBad()))
```

---

## Demo 3: Recovery Mode Activation

**Goal:** Show recovery mode activating automatically on new session.

**Duration:** ~2 minutes

### Prerequisites
- Complete Demo 2 (bad session recorded)
- OR manually set bad session:
```javascript
// In DevTools Console
const badOutcome = {
  sessionId: 'demo-bad-session',
  endedAt: new Date().toISOString(),
  metrics: { revealCount: 3, circuitBreakerTripped: true, stepTimesMs: [], endedMidProblem: false, stepsAttempted: 5, stepsCompleted: 2, totalDurationMs: 300000 },
  activatedTriggers: ['reveal_overuse', 'circuit_breaker_trip'],
  isBadSession: true
};
localStorage.setItem('physiscaffold_recovery_data', JSON.stringify({
  version: 1,
  lastSessionOutcome: badOutcome,
  recoveryState: { status: 'inactive', warmUpsCompleted: 0, config: { revealDisabled: true, extraMicroTasksEnabled: true, supportiveToneOnly: true, warmUpProblemsRequired: 1 } },
  recoveryHistory: [],
  lastUpdatedAt: new Date().toISOString()
}));
```

### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Close current tab completely | Session ends |
| 2 | Open new tab, navigate to app | New session starts |
| 3 | Observe the UI | Recovery mode banner appears |
| 4 | Read the message | Shows "Let's rebuild confidence first." |
| 5 | View the warm-up problem | Problem from mastered pattern is presented |
| 6 | Check problem details | Shows pattern name and mastery level |

### Verification Points
- [ ] Recovery banner is visible at top
- [ ] Message says "Let's rebuild confidence first."
- [ ] Warm-up problem is from a previously mastered pattern
- [ ] UI indicates this is a recovery warm-up

### UI Elements to Highlight
- Recovery mode banner (expected location: top of scaffold)
- Warm-up problem title
- Pattern name badge
- Mastery indicator

---

## Demo 4: Recovery Mode Completion

**Goal:** Show how completing a warm-up exits recovery mode.

**Duration:** ~2 minutes

### Prerequisites
- Recovery mode is active (from Demo 3)
- Warm-up problem is displayed

### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View the recovery warm-up problem | Problem shows with recovery indicators |
| 2 | Complete Step 1 using micro-tasks | Step marked complete |
| 3 | Complete Step 2 (no Reveal available) | Reveal button is disabled/hidden |
| 4 | Complete all remaining steps | Each step completes normally |
| 5 | Submit final answer | Problem marked as solved |
| 6 | Observe the UI transition | Recovery mode completion message |
| 7 | Navigate to next problem | Normal mode restored |

### Verification Points
- [ ] Warm-up completes successfully
- [ ] Success message: "Great job! You're ready to continue."
- [ ] Recovery banner disappears
- [ ] Next problem shows normal UI (Reveal enabled)
- [ ] Professor check-in uses normal tone

### Success Celebration
- Confetti animation (if enabled)
- Encouraging message
- Smooth transition back to normal mode

---

## Demo 5: Recovery Mode - Reveal Disabled

**Goal:** Show that Reveal is disabled during recovery mode.

**Duration:** ~1 minute

### Prerequisites
- Recovery mode is active

### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Step 1 of warm-up | Step loads |
| 2 | Look for Reveal button | Button is hidden OR disabled |
| 3 | Click where Reveal would be | No action / tooltip explains why |
| 4 | Use micro-tasks instead | Micro-tasks work normally |
| 5 | Check hint levels available | Only levels 1-4 available |

### Verification Points
- [ ] Reveal (hint level 5) is not accessible
- [ ] Helpful tooltip: "Reveal is disabled during warm-up"
- [ ] Other hint levels work normally
- [ ] Micro-tasks provide adequate support

### UI States to Show
- Disabled Reveal button appearance
- Tooltip on hover (if applicable)
- Alternative hint progression

---

## Demo 6: Recovery Mode - Supportive Tone

**Goal:** Show that professor check-in uses supportive tone only.

**Duration:** ~1 minute

### Prerequisites
- Recovery mode is active
- Complete at least one step to trigger professor check-in

### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete a step correctly | Professor check-in appears |
| 2 | Observe the message tone | Supportive, encouraging language |
| 3 | Complete step with some struggle | Still supportive (no challenge tone) |
| 4 | Read the feedback | No phrases like "That was too easy" |

### Verification Points
- [ ] No challenging or critical language
- [ ] Messages focus on encouragement
- [ ] Examples of supportive phrases:
  - "Great thinking!"
  - "You've got this!"
  - "Nice work on that step!"
  - "Keep going, you're doing well!"

### Tone Comparison (Normal vs Recovery)

| Situation | Normal Mode | Recovery Mode |
|-----------|-------------|---------------|
| Quick correct answer | "Too easy? Let's try harder!" | "Nice work!" |
| Slow but correct | "Took a while, but you got it" | "Great persistence!" |
| After hint usage | "Remember this for next time" | "Good use of resources!" |

---

## Demo 7: Edge Case - No Mastered Problems

**Goal:** Show fallback behavior when no high-mastery problems exist.

**Duration:** ~1 minute

### Prerequisites
- Clear concept mastery data:
```javascript
localStorage.removeItem('physiscaffold_concept_mastery');
```
- Keep at least one solved problem in history
- Trigger bad session (as in Demo 2)

### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start new session after bad session | Recovery mode activates |
| 2 | Observe warm-up selection | Falls back to any solved problem |
| 3 | Check problem source | Shows "Previous Problem" pattern |
| 4 | Complete the warm-up | Recovery completes normally |

### Verification Points
- [ ] Recovery still activates (doesn't fail)
- [ ] Fallback problem is presented
- [ ] Pattern shows as "Previous Problem" or similar
- [ ] Warm-up completion still works

### Console Output
```
[WarmupSelector] No candidate problems found for recovery mode
[WarmupSelector] Using fallback: [Problem Title]
```

---

## Demo 8: Session Abandonment Mid-Problem

**Goal:** Show detection of incomplete session (session_incomplete trigger).

**Duration:** ~1 minute

### Prerequisites
- Clear all storage
- Start fresh session

### Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to a problem | Problem loads |
| 2 | Complete Step 1 | Step marked complete |
| 3 | Start Step 2 (don't complete) | Step is in progress |
| 4 | Close the browser tab | Session ends mid-problem |
| 5 | Open new tab, navigate to app | Check if trigger was recorded |

### Note
This trigger alone won't cause recovery (needs 2+ triggers), but combined with another trigger (like reveal_overuse), it will.

### Combined Scenario
| Step | Action | Trigger |
|------|--------|---------|
| 1 | Use Reveal 3 times | reveal_overuse |
| 2 | Close tab mid-problem | session_incomplete |
| 3 | Open new session | Recovery mode activates |

---

## Additional Test Scenarios

### Scenario A: Multiple Warm-ups Required

For future configuration where `warmUpProblemsRequired > 1`:

```javascript
// Set config to require 2 warm-ups
const data = JSON.parse(localStorage.getItem('physiscaffold_recovery_data'));
data.recoveryState.config.warmUpProblemsRequired = 2;
localStorage.setItem('physiscaffold_recovery_data', JSON.stringify(data));
```

| Step | Expected |
|------|----------|
| Complete 1st warm-up | "1 of 2 complete" message |
| Complete 2nd warm-up | Recovery mode exits |

---

### Scenario B: Recovery Abandonment

What happens if user navigates away during recovery:

| Step | Action | Expected |
|------|--------|----------|
| 1 | Activate recovery mode | Banner shows |
| 2 | Navigate to settings/home | Recovery persists |
| 3 | Return to problems | Recovery still active |
| 4 | Close tab without completing | Recovery abandoned |
| 5 | New session | May re-trigger if bad session still recorded |

---

### Scenario C: Slow Step Time Trigger

Testing the `slow_step_time` trigger (average > 5 minutes):

| Step | Action | Time |
|------|--------|------|
| 1 | Start Step 1 | 0:00 |
| 2 | Wait/struggle | 6:00 |
| 3 | Complete Step 1 | 6:00 (recorded) |
| 4 | Repeat for Step 2 | 6:00 (recorded) |
| 5 | Average = 6 min > 5 min threshold | Trigger activated |

---

## DevTools Quick Reference

### Check Current Recovery State
```javascript
JSON.parse(localStorage.getItem('physiscaffold_recovery_data'))
```

### Check Session Metrics
```javascript
JSON.parse(sessionStorage.getItem('physiscaffold_session_metrics'))
```

### Force Bad Session
```javascript
const badOutcome = {
  sessionId: 'test-' + Date.now(),
  endedAt: new Date().toISOString(),
  metrics: { revealCount: 3, circuitBreakerTripped: true, stepTimesMs: [], endedMidProblem: false, stepsAttempted: 5, stepsCompleted: 2, totalDurationMs: 300000 },
  activatedTriggers: ['reveal_overuse', 'circuit_breaker_trip'],
  isBadSession: true
};
const data = JSON.parse(localStorage.getItem('physiscaffold_recovery_data') || '{"version":1,"recoveryState":{"status":"inactive","warmUpsCompleted":0,"config":{"revealDisabled":true,"extraMicroTasksEnabled":true,"supportiveToneOnly":true,"warmUpProblemsRequired":1}},"recoveryHistory":[]}');
data.lastSessionOutcome = badOutcome;
localStorage.setItem('physiscaffold_recovery_data', JSON.stringify(data));
console.log('Bad session recorded. Refresh to see recovery mode.');
```

### Clear All Recovery Data
```javascript
localStorage.removeItem('physiscaffold_recovery_data');
sessionStorage.removeItem('physiscaffold_session_metrics');
console.log('Recovery data cleared.');
```

### Check Feature Flag
```javascript
// In browser console (requires module access)
import('/lib/featureFlags').then(m => console.log('CONFIDENCE_REPAIR:', m.isFeatureEnabled('CONFIDENCE_REPAIR')))
```

---

## Video Recording Tips

1. **Browser Setup**
   - Use Chrome in Guest mode for clean state
   - Set viewport to 1280x720 for consistency
   - Enable DevTools for debugging shots

2. **Narration Points**
   - Explain what triggers are being activated
   - Highlight UI changes during transitions
   - Mention the "why" behind each behavior

3. **Timing**
   - Pause briefly on important UI elements
   - Show console output for technical demos
   - Keep each demo under 3 minutes

4. **Demo Order**
   - Start with Demo 1 (happy path)
   - Progress to failure scenarios
   - End with edge cases

---

## Acceptance Criteria Checklist

| Requirement | Tested In |
|-------------|-----------|
| Recovery Mode never blocks planned curriculum | Demo 4, 7 |
| User is told "Let's rebuild confidence first." | Demo 3 |
| Recovery Mode exits deterministically | Demo 4 |
| Detection uses any 2 of 4 triggers | Demo 2 |
| Reveal disabled during recovery | Demo 5 |
| Supportive professor tone | Demo 6 |
| Warm-up from mastered pattern | Demo 3, 4 |
| Fallback when no mastered patterns | Demo 7 |
| Session outcome persisted | Demo 2, 3 |
