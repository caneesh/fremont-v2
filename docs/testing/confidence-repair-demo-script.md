# Confidence Repair System - Demo Scripts

Quick scripts for recording video demos. Each demo is ~1-2 minutes.

---

## Pre-Recording Setup

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Open browser
open http://localhost:3000
```

**Browser Setup:**
- Chrome Guest Mode (clean state)
- Viewport: 1280x720
- DevTools open (for some demos)

---

## Demo 1: Happy Path (1 min)

**Title Card:** "Normal Session - No Recovery Needed"

**Script:**
1. "Let's see what a normal study session looks like."
2. [Navigate to problem]
3. "I'll complete a few steps using the micro-tasks."
4. [Complete 2 steps]
5. "I'll use Reveal once - that's fine, it's available."
6. [Use Reveal on step 3]
7. "Now I'll complete the problem."
8. [Complete problem]
9. "If I start a new session..."
10. [Close tab, open new]
11. "No recovery mode - I'm ready to continue normally."

**End Card:** "Reveal used once = OK. No recovery needed."

---

## Demo 2: Bad Session (2 min)

**Title Card:** "When a Session Goes Wrong"

**Script:**
1. "Sometimes students have a rough session. Let's see what that looks like."
2. [Start problem]
3. "I'm struggling... I'll use Reveal."
4. [Use Reveal - show counter going to 1]
5. "Still stuck... Reveal again."
6. [Use Reveal - counter at 2]
7. "One more time..."
8. [Use Reveal - counter at 3]
9. "That's 3 reveals - first trigger activated."
10. [Make wrong attempts]
11. "Making errors... circuit breaker warning appears."
12. [Continue until circuit breaker trips]
13. "Circuit breaker tripped - second trigger."
14. [Show console] "Two triggers = bad session detected."

**End Card:** "2+ triggers = Bad session. Recovery will activate next time."

---

## Demo 3: Recovery Activation (2 min)

**Title Card:** "Recovery Mode - Automatic Activation"

**Setup:** Run in console before recording:
```javascript
const badOutcome = {
  sessionId: 'demo-bad-session',
  endedAt: new Date().toISOString(),
  metrics: { revealCount: 3, circuitBreakerTripped: true, stepTimesMs: [], endedMidProblem: false, stepsAttempted: 5, stepsCompleted: 2, totalDurationMs: 300000 },
  activatedTriggers: ['reveal_overuse', 'circuit_breaker_trip'],
  isBadSession: true
};
const data = {
  version: 1,
  lastSessionOutcome: badOutcome,
  recoveryState: { status: 'inactive', warmUpsCompleted: 0, config: { revealDisabled: true, extraMicroTasksEnabled: true, supportiveToneOnly: true, warmUpProblemsRequired: 1 } },
  recoveryHistory: [],
  lastUpdatedAt: new Date().toISOString()
};
localStorage.setItem('physiscaffold_recovery_data', JSON.stringify(data));
```

**Script:**
1. "After a bad session, the system remembers."
2. [Refresh page]
3. "Notice the banner: 'Let's rebuild confidence first.'"
4. [Highlight banner]
5. "The system picked a warm-up problem from a pattern I've mastered."
6. [Show problem title and pattern]
7. "This is designed to give me an easy win and rebuild confidence."
8. "Notice: the problem difficulty is Easy or Medium."

**End Card:** "Recovery Mode: One warm-up from a mastered pattern."

---

## Demo 4: Completing Recovery (2 min)

**Title Card:** "Completing Recovery - Back to Normal"

**Setup:** Recovery mode should be active (from Demo 3)

**Script:**
1. "I'm in recovery mode with a warm-up problem."
2. [Show recovery banner]
3. "Let me work through this step by step."
4. [Complete Step 1]
5. "Notice Reveal isn't available - that's intentional."
6. [Point to where Reveal would be]
7. [Complete remaining steps]
8. "And... done!"
9. [Submit answer]
10. "Success! The recovery banner is gone."
11. [Navigate to next problem]
12. "I'm back to normal mode. Reveal is available again."
13. [Show Reveal button enabled]

**End Card:** "One successful warm-up = Recovery complete!"

---

## Demo 5: Reveal Disabled (1 min)

**Title Card:** "Recovery Mode - Reveal Disabled"

**Setup:** Activate recovery mode

**Script:**
1. "During recovery mode, Reveal is disabled."
2. [Show step with hint options]
3. "I can use hints level 1 through 4..."
4. [Show available hints]
5. "But level 5 - Reveal - is not available."
6. [Show disabled/missing Reveal]
7. "This encourages me to work through the problem using the micro-tasks."
8. [Show micro-tasks working]
9. "I can still get help, just not the full solution."

**End Card:** "Recovery = No full reveals. Build skills instead."

---

## Demo 6: Supportive Tone (1 min)

**Title Card:** "Recovery Mode - Supportive Professor"

**Setup:** Activate recovery mode

**Script:**
1. "During recovery, the professor check-in is always supportive."
2. [Complete a step]
3. "Notice the encouraging message."
4. [Highlight professor message]
5. "Even if I struggle a bit..."
6. [Make a mistake, then correct]
7. "The feedback stays positive and encouraging."
8. [Show supportive message]
9. "No challenging phrases like 'That was too easy' or 'You should know this.'"

**End Card:** "Recovery mode = Supportive feedback only."

---

## Demo 7: No Mastered Problems (1 min)

**Title Card:** "Edge Case - New Student"

**Setup:**
```javascript
localStorage.removeItem('physiscaffold_concept_mastery');
// Keep problem attempts but remove mastery data
// Then trigger bad session as in Demo 3
```

**Script:**
1. "What if a new student has a bad session but no mastered patterns?"
2. [Show recovery activation]
3. "The system falls back to any previously solved problem."
4. [Show fallback problem]
5. "It still works - the student gets a familiar problem."
6. [Complete warm-up]
7. "Recovery completes normally."

**End Card:** "Fallback ensures recovery always works."

---

## Quick Reset Between Demos

```javascript
// Clear everything
localStorage.clear();
sessionStorage.clear();
location.reload();
```

```javascript
// Clear just recovery data
localStorage.removeItem('physiscaffold_recovery_data');
sessionStorage.removeItem('physiscaffold_session_metrics');
location.reload();
```

---

## Trigger Quick Reference

| Trigger | How to Activate | Threshold |
|---------|-----------------|-----------|
| `reveal_overuse` | Use Reveal 3+ times | > 2 |
| `circuit_breaker_trip` | Make repeated errors | Tag-specific |
| `slow_step_time` | Spend 5+ min per step | > 300000ms |
| `session_incomplete` | Close tab mid-problem | In progress |

**Recovery activates when: 2 or more triggers**

---

## Key Messages for Narration

- "The system detected a frustrating session"
- "Let's rebuild confidence first"
- "A warm-up from a pattern you've mastered"
- "Reveal is disabled to encourage active learning"
- "The professor is extra supportive during recovery"
- "One successful warm-up and you're back to normal"
- "Recovery never blocks your planned curriculum"
