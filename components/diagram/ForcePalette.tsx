'use client'

import type { ForceType } from '@/types/diagram'
import { FORCE_METADATA } from '@/types/diagram'

interface ForcePaletteProps {
  onForceAdd: (type: ForceType) => void
  placedForces: ForceType[]  // Track which forces are already placed
  availableForces?: ForceType[]
}

const DEFAULT_FORCES: ForceType[] = [
  'weight',
  'normal',
  'friction',
  'tension',
  'applied',
  'pseudo'
]

export default function ForcePalette({
  onForceAdd,
  placedForces,
  availableForces = DEFAULT_FORCES
}: ForcePaletteProps) {

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Forces
      </h3>

      <div className="space-y-2">
        {availableForces.map((type) => {
          const meta = FORCE_METADATA[type]
          const isPlaced = placedForces.includes(type)

          return (
            <button
              key={type}
              onClick={() => !isPlaced && onForceAdd(type)}
              disabled={isPlaced}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                isPlaced
                  ? 'bg-gray-100 dark:bg-gray-800 opacity-50 cursor-not-allowed'
                  : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-[1.02] cursor-pointer'
              }`}
            >
              {/* Force icon */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: meta.color }}
              >
                {meta.symbol}
              </div>

              {/* Force name */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {meta.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {isPlaced ? '✓ Added' : 'Click to add'}
                </div>
              </div>

              {/* Add icon */}
              {!isPlaced && (
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Click a force to add it to the diagram
        </p>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
          After adding:
        </p>
        <div className="space-y-1 text-xs text-gray-400 dark:text-gray-500">
          <div>← → keys to rotate</div>
          <div>Del to remove</div>
        </div>
      </div>
    </div>
  )
}
