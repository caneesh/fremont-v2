'use client'

import { useState, useCallback } from 'react'
import type { Track } from '@prisma/client'
import type {
  TrackGateState,
  SituationExplanationGate,
  DiagramDescriptionGate,
  ModelSelectionGate,
  PhysicsPrinciple,
} from '@/types/trackGates'
import { PHYSICS_PRINCIPLES } from '@/types/trackGates'

interface TrackGatePanelProps {
  gateState: TrackGateState
  onGateUpdate: (state: TrackGateState) => void
  problemText: string
}

/**
 * Track Gate Panel
 *
 * Displays prerequisite gates based on user's track:
 * - F1: Situation explanation + Diagram description
 * - F2: Model selection (principle + knowns/unknowns)
 */
export default function TrackGatePanel({
  gateState,
  onGateUpdate,
  problemText,
}: TrackGatePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Check if all gates are complete
  const allGatesComplete =
    (gateState.track === 'foundation1' &&
      gateState.situationExplanation?.isComplete &&
      gateState.diagramDescription?.isComplete) ||
    (gateState.track === 'foundation2' && gateState.modelSelection?.isComplete)

  if (gateState.track === 'intermediate' || gateState.track === 'competitive') {
    return null // No gates for advanced tracks
  }

  return (
    <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800 mb-4 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              allGatesComplete
                ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                : 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
            }`}
          >
            {allGatesComplete ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">
              {gateState.track === 'foundation1' ? 'Before You Solve' : 'Model Selection'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-muted">
              {allGatesComplete
                ? 'Ready to proceed to solution steps'
                : gateState.track === 'foundation1'
                ? 'Describe the situation before using equations'
                : 'Identify the physics principle first'}
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {gateState.track === 'foundation1' && (
            <>
              <F1SituationGate
                gate={gateState.situationExplanation!}
                problemText={problemText}
                onUpdate={(gate) =>
                  onGateUpdate({ ...gateState, situationExplanation: gate })
                }
              />
              <F1DiagramGate
                gate={gateState.diagramDescription!}
                onUpdate={(gate) =>
                  onGateUpdate({ ...gateState, diagramDescription: gate })
                }
              />
            </>
          )}

          {gateState.track === 'foundation2' && (
            <F2ModelSelectionGate
              gate={gateState.modelSelection!}
              problemText={problemText}
              onUpdate={(gate) =>
                onGateUpdate({ ...gateState, modelSelection: gate })
              }
            />
          )}
        </div>
      )}
    </div>
  )
}

/**
 * F1 Gate: Explain the situation in words
 */
function F1SituationGate({
  gate,
  problemText,
  onUpdate,
}: {
  gate: SituationExplanationGate
  problemText: string
  onUpdate: (gate: SituationExplanationGate) => void
}) {
  const [text, setText] = useState(gate.explanation)
  const charCount = text.length
  const isValid = charCount >= gate.minLength

  const handleSubmit = useCallback(() => {
    if (isValid) {
      onUpdate({
        ...gate,
        explanation: text,
        isComplete: true,
        completedAt: Date.now(),
      })
    }
  }, [gate, text, isValid, onUpdate])

  if (gate.isComplete) {
    return (
      <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium text-sm">Situation Explained</span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 italic">&quot;{gate.explanation}&quot;</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center">1</span>
          Explain the situation in your own words
        </span>
        <span className="text-xs text-gray-500 dark:text-dark-text-muted block mt-1">
          What&apos;s happening physically? What objects are involved? Don&apos;t use equations yet.
        </span>
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="In this problem, there is a... which is... The forces involved are..."
        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        rows={3}
      />
      <div className="flex items-center justify-between">
        <span className={`text-xs ${isValid ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-dark-text-muted'}`}>
          {charCount}/{gate.minLength} characters {isValid && '(ready!)'}
        </span>
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isValid
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          Done
        </button>
      </div>
    </div>
  )
}

/**
 * F1 Gate: Describe the diagram
 */
function F1DiagramGate({
  gate,
  onUpdate,
}: {
  gate: DiagramDescriptionGate
  onUpdate: (gate: DiagramDescriptionGate) => void
}) {
  const [text, setText] = useState(gate.description)
  const charCount = text.length
  const isValid = charCount >= gate.minLength

  const handleSubmit = useCallback(() => {
    if (isValid) {
      onUpdate({
        ...gate,
        description: text,
        isComplete: true,
        completedAt: Date.now(),
      })
    }
  }, [gate, text, isValid, onUpdate])

  if (gate.isComplete) {
    return (
      <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium text-sm">Diagram Described</span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 italic">&quot;{gate.description}&quot;</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center">2</span>
          Describe what you would draw
        </span>
        <span className="text-xs text-gray-500 dark:text-dark-text-muted block mt-1">
          Sketch it mentally: What arrows, labels, or reference points would you include?
        </span>
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="I would draw... with arrows showing... labeled as..."
        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        rows={2}
      />
      <div className="flex items-center justify-between">
        <span className={`text-xs ${isValid ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-dark-text-muted'}`}>
          {charCount}/{gate.minLength} characters {isValid && '(ready!)'}
        </span>
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isValid
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          Done
        </button>
      </div>
    </div>
  )
}

/**
 * F2 Gate: Model selection
 */
function F2ModelSelectionGate({
  gate,
  problemText,
  onUpdate,
}: {
  gate: ModelSelectionGate
  problemText: string
  onUpdate: (gate: ModelSelectionGate) => void
}) {
  const [principle, setPrinciple] = useState<PhysicsPrinciple | null>(gate.principle as PhysicsPrinciple | null)
  const [knownsText, setKnownsText] = useState(gate.knowns.join(', '))
  const [unknownsText, setUnknownsText] = useState(gate.unknowns.join(', '))

  const isValid = principle !== null && knownsText.trim().length > 0 && unknownsText.trim().length > 0

  const handleSubmit = useCallback(() => {
    if (isValid) {
      onUpdate({
        ...gate,
        principle,
        knowns: knownsText.split(',').map((s) => s.trim()).filter(Boolean),
        unknowns: unknownsText.split(',').map((s) => s.trim()).filter(Boolean),
        isComplete: true,
        completedAt: Date.now(),
      })
    }
  }, [gate, principle, knownsText, unknownsText, isValid, onUpdate])

  if (gate.isComplete) {
    const selectedPrinciple = PHYSICS_PRINCIPLES.find((p) => p.id === gate.principle)
    return (
      <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium text-sm">Model Selected</span>
        </div>
        <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
          <p><span className="font-medium">Principle:</span> {selectedPrinciple?.label}</p>
          <p><span className="font-medium">Knowns:</span> {gate.knowns.join(', ')}</p>
          <p><span className="font-medium">Unknowns:</span> {gate.unknowns.join(', ')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Principle Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
          What physics principle applies here?
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PHYSICS_PRINCIPLES.slice(0, 6).map((p) => (
            <button
              key={p.id}
              onClick={() => setPrinciple(p.id)}
              className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                principle === p.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-700 dark:text-dark-text-primary hover:border-indigo-300 dark:hover:border-indigo-600'
              }`}
            >
              <div className="font-medium">{p.label}</div>
              <div className={`text-xs ${principle === p.id ? 'text-indigo-200' : 'text-gray-500 dark:text-dark-text-muted'}`}>
                {p.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Knowns */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          What quantities are given? (knowns)
        </label>
        <input
          type="text"
          value={knownsText}
          onChange={(e) => setKnownsText(e.target.value)}
          placeholder="e.g., mass = 5 kg, velocity = 10 m/s"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Unknowns */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          What are you solving for? (unknowns)
        </label>
        <input
          type="text"
          value={unknownsText}
          onChange={(e) => setUnknownsText(e.target.value)}
          placeholder="e.g., acceleration, final velocity"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isValid
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          Confirm Model
        </button>
      </div>
    </div>
  )
}

/**
 * Compact gate warning shown when trying to access locked steps
 */
export function TrackGateWarning({
  track,
  message,
  onScrollToGates,
}: {
  track: Track
  message: string
  onScrollToGates: () => void
}) {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm text-amber-800 dark:text-amber-200">{message}</p>
          <button
            onClick={onScrollToGates}
            className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline"
          >
            Go to prerequisite steps
          </button>
        </div>
      </div>
    </div>
  )
}
