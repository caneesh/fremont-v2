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

  const canvasWidth = 400
  const canvasHeight = 300

  // Debug logging
  console.log('[FBDCanvas] scenario:', {
    scenarioType: scenario.scenarioType,
    objectShape: scenario.objectShape,
    surfaceAngle: scenario.surfaceAngle,
    requiredForces: scenario.requiredForces?.length
  })

  // Calculate object position based on scenario
  const getObjectPosition = () => {
    const centerX = canvasWidth / 2
    const centerY = canvasHeight / 2

    switch (scenario.scenarioType) {
      case 'incline': {
        // Position block on the incline surface
        // Match the surface calculation from SurfaceRenderer
        const angle = scenario.surfaceAngle ?? 30
        const angleRad = (angle * Math.PI) / 180
        const surfaceLength = 200
        const surfaceBase = surfaceLength * Math.cos(angleRad)
        const surfaceHeight = surfaceLength * Math.sin(angleRad)

        // Surface hypotenuse goes from (startX, startY) to (endX, endY)
        const startX = centerX - surfaceBase / 2
        const startY = centerY + 60

        // Position block at ~40% up the incline from the bottom
        const t = 0.4
        const surfaceX = startX + t * surfaceBase
        const surfaceY = startY - t * surfaceHeight

        // Block is rotated to align with incline (rotation = -angle in SVG)
        // Need to offset perpendicular to surface so block sits ON TOP of it
        // Perpendicular direction (up from surface): (-sin(θ), -cos(θ)) in SVG coords
        const blockHalfSize = 30

        // Offset perpendicular to surface by halfSize so bottom edge touches surface
        const offsetX = -blockHalfSize * Math.sin(angleRad)
        const offsetY = -blockHalfSize * Math.cos(angleRad)

        console.log('[FBDCanvas] incline calc:', {
          angle,
          surfacePoint: { x: surfaceX, y: surfaceY },
          offset: { x: offsetX, y: offsetY },
          blockCenter: { x: surfaceX + offsetX, y: surfaceY + offsetY }
        })

        return {
          x: surfaceX + offsetX,
          y: surfaceY + offsetY
        }
      }
      case 'hanging':
        return { x: centerX, y: centerY + 20 }
      case 'pulley':
        return { x: centerX + 100, y: centerY + 60 }
      case 'rotating':
        return { x: centerX, y: centerY }
      default:
        // Horizontal surface - place block just above the surface
        return { x: centerX, y: centerY + 60 - 30 }
    }
  }

  const objectPos = getObjectPosition()
  console.log('[FBDCanvas] objectPos:', objectPos)

  // Get smart default angle based on force type and scenario
  const getDefaultAngle = useCallback((forceType: ForceType): number => {
    const surfaceAngle = scenario.surfaceAngle ?? 0

    switch (forceType) {
      case 'weight':
        return 270 // Always down
      case 'normal':
        // Perpendicular to surface (surface angle + 90°)
        return scenario.scenarioType === 'incline'
          ? (surfaceAngle + 90) % 360
          : 90 // Straight up for horizontal
      case 'friction':
        // Along surface (could be either direction, default to up-slope)
        return scenario.scenarioType === 'incline'
          ? (surfaceAngle + 180) % 360 // Points up the slope
          : 180 // Left for horizontal
      case 'tension':
        return 90 // Up by default
      case 'applied':
        return 0 // Right by default
      default:
        return 0
    }
  }, [scenario])

  // Handle adding a force via click - AUTO-SNAP TO OBJECT CENTER
  const handleForceAdd = useCallback((forceType: ForceType) => {
    // Check if this force type is already placed
    const existingForce = placedForces.find(f => f.type === forceType)
    if (existingForce) {
      setSelectedForceId(existingForce.id)
      return
    }

    const meta = FORCE_METADATA[forceType]

    // Place at object center
    const centerX = (objectPos.x / canvasWidth) * 100
    const centerY = (objectPos.y / canvasHeight) * 100

    const newForce: PlacedForce = {
      id: `force-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: forceType,
      label: meta.defaultLabel,
      x: centerX,
      y: centerY,
      angle: getDefaultAngle(forceType)
    }

    onPlacedForcesChange([...placedForces, newForce])
    setSelectedForceId(newForce.id)
  }, [placedForces, onPlacedForcesChange, objectPos, canvasWidth, canvasHeight, getDefaultAngle])

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
        <div className="w-48 flex-shrink-0">
          <ForcePalette
            onForceAdd={handleForceAdd}
            placedForces={placedForces.map(f => f.type)}
          />
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 min-w-0">
        <div
          className={`relative rounded-xl border-2 transition-colors border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-hidden ${isCompleted ? 'opacity-75' : ''}`}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            className="w-full h-auto"
            style={{ aspectRatio: '4/3' }}
            preserveAspectRatio="xMidYMid meet"
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

            {/* Debug: show surface point (green) and block center (red) */}
            {scenario.scenarioType === 'incline' && (() => {
              const angle = scenario.surfaceAngle ?? 30
              const angleRad = (angle * Math.PI) / 180
              const surfaceLength = 200
              const surfaceBase = surfaceLength * Math.cos(angleRad)
              const surfaceHeight = surfaceLength * Math.sin(angleRad)
              const startX = canvasWidth / 2 - surfaceBase / 2
              const startY = canvasHeight / 2 + 60
              const t = 0.4
              const surfaceX = startX + t * surfaceBase
              const surfaceY = startY - t * surfaceHeight
              return (
                <>
                  <circle cx={surfaceX} cy={surfaceY} r={4} fill="lime" stroke="black" />
                  <circle cx={objectPos.x} cy={objectPos.y} r={4} fill="red" stroke="black" />
                </>
              )
            })()}

            {/* Object */}
            <ObjectRenderer
              shape={scenario.objectShape || 'block'}
              x={objectPos.x}
              y={objectPos.y}
              rotation={scenario.scenarioType === 'incline' ? -(scenario.surfaceAngle ?? 0) : 0}
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
