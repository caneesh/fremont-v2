'use client'

import { useState } from 'react'
import type { ScaffoldData } from '@/types/scaffold'
import StepAccordion from './StepAccordion'
import ConceptPanel from './ConceptPanel'
import SanityCheckStep from './SanityCheckStep'

interface SolutionScaffoldProps {
  data: ScaffoldData
  onReset: () => void
}

export default function SolutionScaffold({ data, onReset }: SolutionScaffoldProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  const handleStepComplete = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId])
    }
    if (stepId < data.steps.length - 1) {
      setCurrentStep(stepId + 1)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with problem statement */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-2">
              {data.domain} → {data.subdomain}
            </span>
            <h2 className="text-2xl font-semibold text-gray-900">Problem Statement</h2>
          </div>
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:border-gray-400"
          >
            ← New Problem
          </button>
        </div>
        <p className="text-gray-800 leading-relaxed text-lg">
          {data.problem}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main solving area - Steps */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Solution Roadmap
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Work through each step. Click to expand and see hints. The framework guides you - you provide the reasoning.
            </p>

            <div className="space-y-3">
              {data.steps.map((step, index) => (
                <StepAccordion
                  key={step.id}
                  step={step}
                  stepNumber={index + 1}
                  isActive={currentStep === index}
                  isCompleted={completedSteps.includes(index)}
                  isLocked={index > 0 && !completedSteps.includes(index - 1)}
                  concepts={data.concepts}
                  onComplete={() => handleStepComplete(index)}
                  onActivate={() => setCurrentStep(index)}
                />
              ))}
            </div>
          </div>

          {/* Sanity Check - only show after all steps completed */}
          {completedSteps.length === data.steps.length && (
            <SanityCheckStep sanityCheck={data.sanityCheck} />
          )}
        </div>

        {/* Right sidebar - Concept panel */}
        <div className="lg:col-span-1">
          <ConceptPanel concepts={data.concepts} />
        </div>
      </div>
    </div>
  )
}
