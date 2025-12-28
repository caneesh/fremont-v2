'use client'

import { useState, useRef, useCallback } from 'react'
import type { DiagramStepData, PlacedForce, ForceType } from '@/types/diagram'
import { FORCE_METADATA, snapToDirection } from '@/types/diagram'
import ObjectRenderer from './ObjectRenderer'
import SurfaceRenderer from './SurfaceRenderer'
import ForceArrow from './ForceArrow'
import ForcePalette from './ForcePalette'

interface FBDCanvasProps {
  scenario: DiagramStepData
  placedForces: PlacedForce[]
  onPlacedForcesChange: (forces: PlacedForce[]) => void
  isCompleted?: boolean
}

export default function FBDCanvas({
  scenario,
  placedForces,
  onPlacedForcesChange,
  isCompleted = false
}: FBDCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedForceId, setSelectedForceId] = useState<string | null>(null)
  const [draggedType, setDraggedType] = useState<ForceType | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const canvasWidth = 400
  const canvasHeight = 300

  // Calculate object position based on scenario
  const getObjectPosition = () => {
    const centerX = canvasWidth / 2
    const centerY = canvasHeight / 2

    switch (scenario.scenarioType) {
      case 'incline': {
        // Position on incline surface
        const angleRad = ((scenario.surfaceAngle ?? 30) * Math.PI) / 180
        const offsetX = -20 * Math.cos(angleRad)
        const offsetY = -20 * Math.sin(angleRad) - 30
        return { x: centerX + offsetX, y: centerY + offsetY }
      }
      case 'hanging':
        return { x: centerX, y: centerY + 20 }
      case 'pulley':
        return { x: centerX + 100, y: centerY + 60 }
      case 'rotating':
        return { x: centerX, y: centerY }
      default:
        return { x: centerX, y: centerY }
    }
  }

  const objectPos = getObjectPosition()

  // Handle dropping a force from palette
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const forceType = e.dataTransfer.getData('forceType') as ForceType
    if (!forceType || !svgRef.current) return

    const rect = svgRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    const meta = FORCE_METADATA[forceType]
    const defaultAngle = forceType === 'weight' ? 270 : // Down
                         forceType === 'normal' ? 90 :  // Up
                         0                              // Right

    const newForce: PlacedForce = {
      id: `force-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: forceType,
      label: meta.defaultLabel,
      x: Math.max(10, Math.min(90, x)),
      y: Math.max(10, Math.min(90, y)),
      angle: defaultAngle
    }

    onPlacedForcesChange([...placedForces, newForce])
    setSelectedForceId(newForce.id)
    setDraggedType(null)
  }, [placedForces, onPlacedForcesChange])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  // Force manipulation handlers
  const handleForceSelect = useCallback((id: string) => {
    setSelectedForceId(id)
  }, [])

  const handleForceDrag = useCallback((id: string, x: number, y: number) => {
    onPlacedForcesChange(
      placedForces.map(f =>
        f.id === id ? { ...f, x, y } : f
      )
    )
  }, [placedForces, onPlacedForcesChange])

  const handleForceRotate = useCallback((id: string, angle: number) => {
    onPlacedForcesChange(
      placedForces.map(f =>
        f.id === id ? { ...f, angle: snapToDirection(angle) } : f
      )
    )
  }, [placedForces, onPlacedForcesChange])

  const handleForceLabel = useCallback((id: string, label: string) => {
    onPlacedForcesChange(
      placedForces.map(f =>
        f.id === id ? { ...f, label } : f
      )
    )
  }, [placedForces, onPlacedForcesChange])

  const handleForceDelete = useCallback((id: string) => {
    onPlacedForcesChange(placedForces.filter(f => f.id !== id))
    if (selectedForceId === id) {
      setSelectedForceId(null)
    }
  }, [placedForces, onPlacedForcesChange, selectedForceId])

  // Click on canvas background to deselect
  const handleCanvasClick = useCallback(() => {
    setSelectedForceId(null)
  }, [])

  return (
    <div className="flex gap-4">
      {/* Force Palette */}
      {!isCompleted && (
        <div className="w-40 flex-shrink-0">
          <ForcePalette onDragStart={setDraggedType} />
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1">
        <div
          className={`relative rounded-xl border-2 transition-colors ${
            isDragOver
              ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
          } ${isCompleted ? 'opacity-75' : ''}`}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            className="w-full aspect-[4/3]"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleCanvasClick}
          >
            {/* Grid pattern (subtle) */}
            <defs>
              <pattern
                id="grid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  className="text-gray-200 dark:text-gray-700"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Surface */}
            <SurfaceRenderer
              scenarioType={scenario.scenarioType}
              surfaceAngle={scenario.surfaceAngle}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
            />

            {/* Object */}
            <ObjectRenderer
              shape={scenario.objectShape}
              x={objectPos.x}
              y={objectPos.y}
              rotation={scenario.scenarioType === 'incline' ? scenario.surfaceAngle : 0}
            />

            {/* Placed Forces */}
            <g>
              {placedForces.map((force) => (
                <ForceArrow
                  key={force.id}
                  force={{
                    ...force,
                    // Convert percentage to actual coordinates for rendering
                    x: (force.x / 100) * canvasWidth,
                    y: (force.y / 100) * canvasHeight
                  }}
                  isSelected={selectedForceId === force.id && !isCompleted}
                  onSelect={() => handleForceSelect(force.id)}
                  onDrag={(x, y) => handleForceDrag(force.id, x, y)}
                  onRotate={(angle) => handleForceRotate(force.id, angle)}
                  onLabelChange={(label) => handleForceLabel(force.id, label)}
                  onDelete={() => handleForceDelete(force.id)}
                  containerRef={svgRef}
                />
              ))}
            </g>

            {/* Drop indicator */}
            {isDragOver && draggedType && (
              <g opacity={0.5}>
                <text
                  x={canvasWidth / 2}
                  y={canvasHeight / 2}
                  textAnchor="middle"
                  fontSize={16}
                  fill="#6366f1"
                >
                  Drop {FORCE_METADATA[draggedType].name} here
                </text>
              </g>
            )}
          </svg>

          {/* Completed overlay */}
          {isCompleted && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-500/10 rounded-xl">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Diagram Complete
              </div>
            </div>
          )}
        </div>

        {/* Force count indicator */}
        {!isCompleted && (
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
            {placedForces.length} force{placedForces.length !== 1 ? 's' : ''} placed
            {scenario.requiredForces.length > 0 && (
              <span> · {scenario.requiredForces.length} required</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
