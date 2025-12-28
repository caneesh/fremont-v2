'use client'

import { useState, useRef, useEffect } from 'react'
import type { PlacedForce, ForceType } from '@/types/diagram'
import { FORCE_METADATA, snapToDirection, SNAP_ANGLES } from '@/types/diagram'

interface ForceArrowProps {
  force: PlacedForce
  isSelected: boolean
  onSelect: () => void
  onDrag: (x: number, y: number) => void
  onRotate: (angle: number) => void
  onLabelChange: (label: string) => void
  onDelete: () => void
  containerRef: React.RefObject<SVGSVGElement>
}

export default function ForceArrow({
  force,
  isSelected,
  onSelect,
  onDrag,
  onRotate,
  onLabelChange,
  onDelete,
  containerRef
}: ForceArrowProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(force.label)
  const inputRef = useRef<HTMLInputElement>(null)
  const groupRef = useRef<SVGGElement>(null)

  const meta = FORCE_METADATA[force.type]
  const arrowLength = 50
  const arrowHeadSize = 12

  // Handle drag
  useEffect(() => {
    if (!isDragging || !containerRef.current) return

    const handleMouseMove = (e: MouseEvent) => {
      const svg = containerRef.current
      if (!svg) return

      const rect = svg.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      onDrag(Math.max(5, Math.min(95, x)), Math.max(5, Math.min(95, y)))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, containerRef, onDrag])

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Keyboard handler for rotation and deletion
  useEffect(() => {
    if (!isSelected) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        onDelete()
      } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        e.preventDefault()
        const currentIndex = SNAP_ANGLES.indexOf(force.angle)
        const newIndex = (currentIndex + 1) % SNAP_ANGLES.length
        onRotate(SNAP_ANGLES[newIndex])
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        e.preventDefault()
        const currentIndex = SNAP_ANGLES.indexOf(force.angle)
        const newIndex = (currentIndex - 1 + SNAP_ANGLES.length) % SNAP_ANGLES.length
        onRotate(SNAP_ANGLES[newIndex])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSelected, isEditing, force.angle, onDelete, onRotate])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect()
    setIsDragging(true)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setEditLabel(force.label)
  }

  const handleLabelSubmit = () => {
    setIsEditing(false)
    if (editLabel.trim()) {
      onLabelChange(editLabel.trim())
    } else {
      setEditLabel(force.label)
    }
  }

  const handleRotateClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const currentIndex = SNAP_ANGLES.indexOf(force.angle)
    const newIndex = (currentIndex + 1) % SNAP_ANGLES.length
    onRotate(SNAP_ANGLES[newIndex])
  }

  // Calculate arrow path based on angle
  const angleRad = (force.angle * Math.PI) / 180
  const endX = arrowLength * Math.cos(angleRad)
  const endY = -arrowLength * Math.sin(angleRad) // SVG Y is inverted

  // Arrow head points
  const headAngle1 = angleRad + (Math.PI * 5) / 6
  const headAngle2 = angleRad - (Math.PI * 5) / 6
  const headX1 = endX + arrowHeadSize * Math.cos(headAngle1)
  const headY1 = -arrowLength * Math.sin(angleRad) + arrowHeadSize * -Math.sin(headAngle1)
  const headX2 = endX + arrowHeadSize * Math.cos(headAngle2)
  const headY2 = -arrowLength * Math.sin(angleRad) + arrowHeadSize * -Math.sin(headAngle2)

  // Label position (offset from arrow tip)
  const labelOffset = 20
  const labelX = endX + labelOffset * Math.cos(angleRad)
  const labelY = endY - labelOffset * Math.sin(angleRad)

  return (
    <g
      ref={groupRef}
      transform={`translate(${force.x}%, ${force.y}%)`}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Hit area (larger than visible arrow) */}
      <circle
        cx={endX / 2}
        cy={endY / 2}
        r={30}
        fill="transparent"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      />

      {/* Arrow shaft */}
      <line
        x1={0}
        y1={0}
        x2={endX}
        y2={endY}
        stroke={meta.color}
        strokeWidth={isSelected ? 4 : 3}
        strokeLinecap="round"
      />

      {/* Arrow head */}
      <polygon
        points={`${endX},${endY} ${headX1},${headY1} ${headX2},${headY2}`}
        fill={meta.color}
      />

      {/* Origin circle */}
      <circle
        cx={0}
        cy={0}
        r={5}
        fill={meta.color}
      />

      {/* Label */}
      {!isEditing ? (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={14}
          fontWeight="bold"
          fill={meta.color}
          style={{ userSelect: 'none' }}
          onDoubleClick={handleDoubleClick}
        >
          {force.label}
        </text>
      ) : (
        <foreignObject
          x={labelX - 30}
          y={labelY - 12}
          width={60}
          height={24}
        >
          <input
            ref={inputRef}
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={handleLabelSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLabelSubmit()
              if (e.key === 'Escape') {
                setIsEditing(false)
                setEditLabel(force.label)
              }
            }}
            className="w-full h-full text-center text-sm font-bold border border-gray-300 rounded px-1"
            style={{ color: meta.color }}
          />
        </foreignObject>
      )}

      {/* Selection indicator & controls */}
      {isSelected && !isEditing && (
        <>
          {/* Selection ring */}
          <circle
            cx={0}
            cy={0}
            r={arrowLength + 10}
            fill="none"
            stroke="#6366f1"
            strokeWidth={2}
            strokeDasharray="4 4"
            opacity={0.5}
          />

          {/* Rotate button */}
          <g
            onClick={handleRotateClick}
            style={{ cursor: 'pointer' }}
            transform={`translate(${-25}, ${-25})`}
          >
            <circle r={12} fill="white" stroke="#6366f1" strokeWidth={2} />
            <path
              d="M -4 0 A 4 4 0 1 1 4 0"
              fill="none"
              stroke="#6366f1"
              strokeWidth={2}
            />
            <path d="M 4 -3 L 4 2 L 7 0 Z" fill="#6366f1" />
          </g>

          {/* Delete button */}
          <g
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            style={{ cursor: 'pointer' }}
            transform={`translate(${25}, ${-25})`}
          >
            <circle r={12} fill="white" stroke="#ef4444" strokeWidth={2} />
            <path
              d="M -4 -4 L 4 4 M -4 4 L 4 -4"
              stroke="#ef4444"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </g>
        </>
      )}
    </g>
  )
}

// Draggable palette item (for use in ForcePalette)
export function DraggableForceIcon({
  type,
  onDragStart
}: {
  type: ForceType
  onDragStart: (type: ForceType) => void
}) {
  const meta = FORCE_METADATA[type]

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('forceType', type)
        e.dataTransfer.effectAllowed = 'copy'
        onDragStart(type)
      }}
      className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-grab active:cursor-grabbing transition-colors"
      title={meta.description}
    >
      <div
        className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm"
        style={{ backgroundColor: meta.color }}
      >
        {meta.symbol}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {meta.name}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {meta.defaultLabel}
        </div>
      </div>
    </div>
  )
}
