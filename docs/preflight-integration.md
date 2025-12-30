# PreFlightCheckModal Integration Guide

This guide shows the minimal changes needed to integrate the Pre-Flight Check feature into `SolutionScaffold.tsx`.

## Overview

The integration requires:
1. **4 new imports** (2 lines)
2. **3 new state variables** (3 lines)
3. **1 new handler function** (~20 lines)
4. **1 step activation check** (~10 lines)
5. **1 modal render** (~15 lines)

**Total: ~50 lines of changes** to a 1040-line file.

---

## Step 1: Add Imports

Add these imports at the top of `SolutionScaffold.tsx`:

```tsx
// After line 38 (after DrillModal import)
import PreFlightCheckModal from './PreFlightCheckModal'
import type { PreFlightCheck, PreFlightValidation } from '@/types/preFlightCheck'
```

---

## Step 2: Add State Variables

Add these state variables after the existing state declarations (around line 73):

```tsx
// After line 73 (after solutionGradeResult state)

// Pre-Flight Check state
const [showPreFlightCheck, setShowPreFlightCheck] = useState(false)
const [currentPreFlightCheck, setCurrentPreFlightCheck] = useState<PreFlightCheck | null>(null)
const [passedPreFlightChecks, setPassedPreFlightChecks] = useState<Set<string>>(new Set())
```

---

## Step 3: Add Handler Function

Add this handler after the existing handlers (around line 640, after `handleTargetStep`):

```tsx
// Pre-Flight Check handlers
const handlePreFlightComplete = useCallback((passed: boolean, validation: PreFlightValidation) => {
  if (passed && currentPreFlightCheck) {
    setPassedPreFlightChecks(prev => new Set([...prev, currentPreFlightCheck.id]))
  }
  setShowPreFlightCheck(false)
  setCurrentPreFlightCheck(null)
}, [currentPreFlightCheck])

const handlePreFlightSkip = useCallback(() => {
  setShowPreFlightCheck(false)
  setCurrentPreFlightCheck(null)
}, [])

// Check for pre-flight requirement when activating a step
const checkPreFlightRequirement = useCallback((stepIndex: number) => {
  // Only check for hint-based scaffolds that have preFlightChecks
  if (!isHintScaffold(data)) return true

  const scaffoldData = data as ScaffoldData
  if (!scaffoldData.preFlightChecks?.length) return true

  const step = scaffoldData.steps[stepIndex]
  const preFlightCheck = scaffoldData.preFlightChecks.find(
    check => check.targetStepId === step.id && !passedPreFlightChecks.has(check.id)
  )

  if (preFlightCheck) {
    setCurrentPreFlightCheck(preFlightCheck)
    setShowPreFlightCheck(true)
    return false // Block step activation
  }

  return true // Allow step activation
}, [data, passedPreFlightChecks])
```

---

## Step 4: Modify Step Activation

Update the `onActivate` handler in the StepAccordion render (around line 820):

```tsx
// Change this line:
onActivate={() => setCurrentStep(index)}

// To this:
onActivate={() => {
  if (checkPreFlightRequirement(index)) {
    setCurrentStep(index)
  }
}}
```

---

## Step 5: Add Modal Render

Add the modal render at the end of the component, before the closing `</div>` (around line 1035):

```tsx
{/* Pre-Flight Check Modal */}
{showPreFlightCheck && currentPreFlightCheck && (
  <PreFlightCheckModal
    check={currentPreFlightCheck}
    problemText={data.problem}
    onComplete={handlePreFlightComplete}
    onSkip={handlePreFlightSkip}
    onClose={() => setShowPreFlightCheck(false)}
  />
)}
```

---

## Step 6: Update ScaffoldData Type

In `types/scaffold.ts`, add the optional `preFlightChecks` field:

```tsx
// In types/scaffold.ts, add import at top:
import type { PreFlightCheck } from './preFlightCheck'

// In ScaffoldData interface (around line 121):
export interface ScaffoldData {
  // ... existing fields ...
  sanityCheckMatrix?: SanityCheckMatrix
  preFlightChecks?: PreFlightCheck[]  // ADD THIS LINE
}
```

---

## Complete Diff

Here's the complete diff for `SolutionScaffold.tsx`:

```diff
--- a/components/SolutionScaffold.tsx
+++ b/components/SolutionScaffold.tsx
@@ -36,6 +36,8 @@ import { CONCEPT_NETWORK_DATA } from '@/lib/conceptNetworkData'
 import { useCircuitBreaker } from '@/lib/hooks/useCircuitBreaker'
 import DrillModal from './DrillModal'
 import CircuitBreakerWarning from './CircuitBreakerWarning'
+import PreFlightCheckModal from './PreFlightCheckModal'
+import type { PreFlightCheck, PreFlightValidation } from '@/types/preFlightCheck'
 import type { ErrorTag } from '@/types/circuitBreaker'

 interface SolutionScaffoldProps {
@@ -71,6 +73,11 @@ export default function SolutionScaffold({ data, onReset, onLoadNewProblem }: So
   const [showSubmissionCanvas, setShowSubmissionCanvas] = useState(false)
   const [solutionGradeResult, setSolutionGradeResult] = useState<GradeSolutionResponse | null>(null)
   const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null)
+
+  // Pre-Flight Check state
+  const [showPreFlightCheck, setShowPreFlightCheck] = useState(false)
+  const [currentPreFlightCheck, setCurrentPreFlightCheck] = useState<PreFlightCheck | null>(null)
+  const [passedPreFlightChecks, setPassedPreFlightChecks] = useState<Set<string>>(new Set())
   const stepRefs = useRef<Map<number, HTMLDivElement>>(new Map())

   // Micro-task mode state
@@ -636,6 +643,35 @@ export default function SolutionScaffold({ data, onReset, onLoadNewProblem }: So
     }
   }, [data.steps.length])

+  // Pre-Flight Check handlers
+  const handlePreFlightComplete = useCallback((passed: boolean, validation: PreFlightValidation) => {
+    if (passed && currentPreFlightCheck) {
+      setPassedPreFlightChecks(prev => new Set([...prev, currentPreFlightCheck.id]))
+    }
+    setShowPreFlightCheck(false)
+    setCurrentPreFlightCheck(null)
+  }, [currentPreFlightCheck])
+
+  const handlePreFlightSkip = useCallback(() => {
+    setShowPreFlightCheck(false)
+    setCurrentPreFlightCheck(null)
+  }, [])
+
+  const checkPreFlightRequirement = useCallback((stepIndex: number) => {
+    if (!isHintScaffold(data)) return true
+
+    const scaffoldData = data as ScaffoldData
+    if (!scaffoldData.preFlightChecks?.length) return true
+
+    const step = scaffoldData.steps[stepIndex]
+    const preFlightCheck = scaffoldData.preFlightChecks.find(
+      check => check.targetStepId === step.id && !passedPreFlightChecks.has(check.id)
+    )
+
+    if (preFlightCheck) {
+      setCurrentPreFlightCheck(preFlightCheck)
+      setShowPreFlightCheck(true)
+      return false
+    }
+
+    return true
+  }, [data, passedPreFlightChecks])
+
   // Handle sanity check solved
   const handleSanityCheckSolved = useCallback(() => {
     // Trigger celebration and allow proceeding to Mark as Solved
@@ -817,7 +853,11 @@ export default function SolutionScaffold({ data, onReset, onLoadNewProblem }: So
                       domain={data.domain}
                       subdomain={data.subdomain}
                       onAnswerChange={(answer) => handleStepAnswerChange(index, answer)}
                       onComplete={() => handleStepComplete(index)}
-                      onActivate={() => setCurrentStep(index)}
+                      onActivate={() => {
+                        if (checkPreFlightRequirement(index)) {
+                          setCurrentStep(index)
+                        }
+                      }}
                       onHintLevelChange={(level) => handleHintLevelChange(index, level)}
                     />
                   )}
@@ -1030,6 +1070,16 @@ export default function SolutionScaffold({ data, onReset, onLoadNewProblem }: So
           </div>
         </div>
       )}
+
+      {/* Pre-Flight Check Modal */}
+      {showPreFlightCheck && currentPreFlightCheck && (
+        <PreFlightCheckModal
+          check={currentPreFlightCheck}
+          problemText={data.problem}
+          onComplete={handlePreFlightComplete}
+          onSkip={handlePreFlightSkip}
+          onClose={() => setShowPreFlightCheck(false)}
+        />
+      )}
     </div>
   )
 }
```

---

## How It Works

1. **User clicks on a step** that has an associated pre-flight check
2. **`checkPreFlightRequirement()`** is called before activating the step
3. If a pre-flight check exists and hasn't been passed:
   - The modal opens with the check configuration
   - Step activation is blocked
4. **User completes the pre-flight check** in the modal
5. If passed:
   - Check ID is added to `passedPreFlightChecks` set
   - Modal closes
   - Step activates normally
6. If failed or skipped:
   - Modal provides guidance
   - User can retry or skip (if allowed)

---

## Backend Integration

The `preFlightChecks` array should be generated by the AI scaffold generator. Add this to the `/api/solve` route's prompt:

```typescript
// In lib/anthropic.ts, extend ScaffolderResponse:
preFlightChecks?: PreFlightCheck[]

// In the scaffold generation prompt, add:
For steps that use major physics formulas, include preFlightChecks that verify:
- Kinematic equations: constant acceleration
- Energy conservation: no non-conservative forces
- Momentum conservation: isolated system
- Newton's 2nd Law: inertial reference frame
```

---

## Feature Flag (Optional)

To gradually roll out, add a feature flag:

```typescript
// In lib/featureFlags.ts:
export const FEATURE_FLAGS = {
  // ... existing flags
  PRE_FLIGHT_CHECK: process.env.NEXT_PUBLIC_ENABLE_PREFLIGHT === 'true',
}

// In SolutionScaffold.tsx:
import { FEATURE_FLAGS } from '@/lib/featureFlags'

const checkPreFlightRequirement = useCallback((stepIndex: number) => {
  if (!FEATURE_FLAGS.PRE_FLIGHT_CHECK) return true  // Skip if disabled
  // ... rest of function
}, [data, passedPreFlightChecks])
```

---

## Summary

| Change Location | Lines Changed | Risk Level |
|-----------------|---------------|------------|
| Imports | +2 | None |
| State variables | +3 | None |
| Handler functions | +30 | Low |
| Step activation | +4 | Low |
| Modal render | +10 | None |
| **Total** | **~50** | **Low** |

The integration is designed to be:
- **Additive**: Only adds new code, minimal modification to existing logic
- **Guarded**: Pre-flight checks only trigger if `preFlightChecks` array exists
- **Backwards compatible**: Existing scaffolds without pre-flight checks work unchanged
