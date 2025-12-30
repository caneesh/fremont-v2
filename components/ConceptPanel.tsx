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
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-md p-6 sticky top-6 border border-transparent dark:border-dark-border">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
        📚 Concept Inventory
      </h3>
      <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
        Click any concept to see its definition and relevant formulas.
      </p>

      <div className="space-y-2">
        {concepts.map((concept) => (
          <div
            key={concept.id}
            className="border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden hover:border-primary-400 dark:hover:border-accent transition-colors"
          >
            <button
              onClick={() => toggleConcept(concept.id)}
              className="w-full px-4 py-3 flex items-center justify-between text-left bg-gray-50 dark:bg-dark-card-soft hover:bg-gray-100 dark:hover:bg-dark-border"
            >
              <span className="font-medium text-gray-900 dark:text-dark-text-primary">{concept.name}</span>
              <svg
                className={`w-5 h-5 text-gray-600 dark:text-dark-text-muted transition-transform ${
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
              <div className="px-4 py-3 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-600">
                <div className="text-sm text-gray-700 dark:text-slate-200 mb-3">
                  <MathRenderer text={concept.definition} />
                </div>

                {concept.formula && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-100 dark:border-blue-700">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-2">
                      Formula:
                    </p>
                    <div className="text-gray-900 dark:text-slate-100">
                      <MathRenderer text={concept.formula} />
                    </div>
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
