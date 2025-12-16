'use client'

import { useState } from 'react'
import type { Concept } from '@/types/scaffold'
import MathRenderer from './MathRenderer'

interface ConceptPanelProps {
  concepts: Concept[]
}

export default function ConceptPanel({ concepts }: ConceptPanelProps) {
  const [expandedConcept, setExpandedConcept] = useState<string | null>(null)

  const toggleConcept = (conceptId: string) => {
    setExpandedConcept(expandedConcept === conceptId ? null : conceptId)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        📚 Concept Inventory
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Click any concept to see its definition and relevant formulas.
      </p>

      <div className="space-y-2">
        {concepts.map((concept) => (
          <div
            key={concept.id}
            className="border border-gray-200 rounded-lg overflow-hidden hover:border-primary-400 transition-colors"
          >
            <button
              onClick={() => toggleConcept(concept.id)}
              className="w-full px-4 py-3 flex items-center justify-between text-left bg-gray-50 hover:bg-gray-100"
            >
              <span className="font-medium text-gray-900">{concept.name}</span>
              <svg
                className={`w-5 h-5 text-gray-600 transition-transform ${
                  expandedConcept === concept.id ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {expandedConcept === concept.id && (
              <div className="px-4 py-3 bg-white border-t border-gray-200">
                <div className="text-sm text-gray-700 mb-3">
                  <MathRenderer text={concept.definition} />
                </div>

                {concept.formula && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <p className="text-xs font-semibold text-blue-900 mb-2">
                      Formula:
                    </p>
                    <MathRenderer text={concept.formula} />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
