'use client'

import { useState } from 'react'
import type { ForceType } from '@/types/diagram'
import { FORCE_METADATA } from '@/types/diagram'
import { DraggableForceIcon } from './ForceArrow'

interface ForcePaletteProps {
  onDragStart: (type: ForceType) => void
  availableForces?: ForceType[]  // If not specified, show all
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
  onDragStart,
  availableForces = DEFAULT_FORCES
}: ForcePaletteProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = (type: ForceType) => {
    setIsDragging(true)
    onDragStart(type)
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
        </svg>
        Forces
      </h3>

      <div className="space-y-2">
        {availableForces.map((type) => (
          <DraggableForceIcon
            key={type}
            type={type}
            onDragStart={handleDragStart}
          />
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Drag forces onto the object
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Double-click to edit labels
        </p>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
          Keyboard shortcuts:
        </p>
        <div className="grid grid-cols-2 gap-1 text-xs text-gray-400 dark:text-gray-500">
          <span>← → Rotate</span>
          <span>Del Remove</span>
        </div>
      </div>
    </div>
  )
}
