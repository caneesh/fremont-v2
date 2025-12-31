'use client'

import type { ScenarioType } from '@/types/diagram'

interface SurfaceRendererProps {
  scenarioType: ScenarioType
  surfaceAngle?: number  // Degrees from horizontal
  canvasWidth: number
  canvasHeight: number
}

export default function SurfaceRenderer({
  scenarioType,
  surfaceAngle = 0,
  canvasWidth,
  canvasHeight
}: SurfaceRendererProps) {
  // Guard against invalid dimensions
  const safeWidth = canvasWidth && !isNaN(canvasWidth) ? canvasWidth : 400
  const safeHeight = canvasHeight && !isNaN(canvasHeight) ? canvasHeight : 300

  const centerX = safeWidth / 2
  const centerY = safeHeight / 2

  if (scenarioType === 'hanging') {
    // Ceiling/support for hanging objects
    return (
      <g>
        {/* Ceiling */}
        <rect
          x={centerX - 80}
          y={40}
          width={160}
          height={8}
          fill="#4b5563"
          stroke="#374151"
          strokeWidth={1}
        />
        {/* Hatch pattern for ceiling */}
        <g stroke="#374151" strokeWidth={1}>
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={i}
              x1={centerX - 75 + i * 20}
              y1={40}
              x2={centerX - 85 + i * 20}
              y2={30}
            />
          ))}
        </g>
        {/* String/rope anchor point */}
        <circle
          cx={centerX}
          cy={48}
          r={4}
          fill="#374151"
        />
      </g>
    )
  }

  if (scenarioType === 'pulley') {
    // Pulley system
    return (
      <g>
        {/* Support structure */}
        <rect
          x={centerX + 60}
          y={40}
          width={80}
          height={8}
          fill="#4b5563"
          stroke="#374151"
          strokeWidth={1}
        />
        {/* Pulley wheel */}
        <circle
          cx={centerX + 100}
          cy={70}
          r={20}
          fill="#9ca3af"
          stroke="#374151"
          strokeWidth={2}
        />
        <circle
          cx={centerX + 100}
          cy={70}
          r={6}
          fill="#4b5563"
        />
        {/* Rope guide */}
        <path
          d={`M ${centerX + 100} 90 L ${centerX + 100} ${centerY + 30}`}
          stroke="#78716c"
          strokeWidth={2}
          strokeDasharray="4 2"
        />
      </g>
    )
  }

  if (scenarioType === 'rotating') {
    // Rotating reference frame indicator
    return (
      <g>
        {/* Rotation axis indicator */}
        <circle
          cx={centerX}
          cy={centerY}
          r={100}
          fill="none"
          stroke="#6366f1"
          strokeWidth={1}
          strokeDasharray="8 4"
          opacity={0.5}
        />
        {/* Rotation arrow */}
        <path
          d={`M ${centerX + 90} ${centerY - 40} A 80 80 0 0 1 ${centerX + 40} ${centerY - 90}`}
          fill="none"
          stroke="#6366f1"
          strokeWidth={2}
          markerEnd="url(#rotationArrow)"
        />
        <defs>
          <marker
            id="rotationArrow"
            markerWidth={10}
            markerHeight={10}
            refX={5}
            refY={5}
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
          </marker>
        </defs>
        {/* Label */}
        <text
          x={centerX + 60}
          y={centerY - 95}
          fontSize={14}
          fill="#6366f1"
          fontStyle="italic"
        >
          ω
        </text>
      </g>
    )
  }

  if (scenarioType === 'incline') {
    // Inclined surface - guard against NaN/undefined
    const angle = (typeof surfaceAngle === 'number' && !isNaN(surfaceAngle)) ? surfaceAngle : 30
    const angleRad = (angle * Math.PI) / 180
    const surfaceLength = 200
    const surfaceHeight = surfaceLength * Math.sin(angleRad)
    const surfaceBase = surfaceLength * Math.cos(angleRad)

    // Position incline so object sits nicely
    const startX = centerX - surfaceBase / 2
    const startY = centerY + 60
    const endX = centerX + surfaceBase / 2
    const endY = startY - surfaceHeight

    return (
      <g>
        {/* Incline surface */}
        <polygon
          points={`${startX},${startY} ${endX},${endY} ${endX},${startY}`}
          fill="#d1d5db"
          stroke="#6b7280"
          strokeWidth={2}
        />
        {/* Ground line */}
        <line
          x1={startX - 20}
          y1={startY}
          x2={startX + surfaceBase + 40}
          y2={startY}
          stroke="#374151"
          strokeWidth={3}
        />
        {/* Angle arc */}
        <path
          d={`M ${startX + 40} ${startY} A 40 40 0 0 0 ${startX + 40 * Math.cos(angleRad)} ${startY - 40 * Math.sin(angleRad)}`}
          fill="none"
          stroke="#6366f1"
          strokeWidth={1.5}
        />
        {/* Angle label */}
        <text
          x={startX + 50}
          y={startY - 10}
          fontSize={12}
          fill="#6366f1"
        >
          {surfaceAngle}°
        </text>
        {/* Hatch marks on ground */}
        <g stroke="#374151" strokeWidth={1}>
          {Array.from({ length: 6 }).map((_, i) => (
            <line
              key={i}
              x1={startX - 10 + i * 25}
              y1={startY}
              x2={startX - 20 + i * 25}
              y2={startY + 10}
            />
          ))}
        </g>
      </g>
    )
  }

  if (scenarioType === 'wedge' || scenarioType === 'block-on-wedge') {
    // Block on accelerating wedge - two-body system
    const angle = (typeof surfaceAngle === 'number' && !isNaN(surfaceAngle)) ? surfaceAngle : 30
    const angleRad = (angle * Math.PI) / 180

    // Wedge dimensions
    const wedgeBase = 160
    const wedgeHeight = wedgeBase * Math.tan(angleRad)

    // Position wedge
    const wedgeLeft = centerX - wedgeBase / 2 - 20
    const wedgeBottom = centerY + 80
    const wedgeRight = wedgeLeft + wedgeBase
    const wedgeTop = wedgeBottom - wedgeHeight

    // Block on wedge (smaller block sitting on the inclined surface)
    const blockSize = 35
    const blockCenterOnSlope = 0.5 // Position along slope (0-1)
    const blockX = wedgeLeft + blockCenterOnSlope * wedgeBase
    const blockY = wedgeBottom - blockCenterOnSlope * wedgeHeight

    return (
      <g>
        {/* Frictionless ground indicator */}
        <line
          x1={wedgeLeft - 40}
          y1={wedgeBottom}
          x2={wedgeRight + 60}
          y2={wedgeBottom}
          stroke="#374151"
          strokeWidth={3}
        />
        {/* Rollers under wedge to indicate frictionless */}
        <g fill="#9ca3af" stroke="#6b7280">
          <circle cx={wedgeLeft + 20} cy={wedgeBottom + 8} r={6} />
          <circle cx={wedgeRight - 20} cy={wedgeBottom + 8} r={6} />
          <circle cx={centerX - 10} cy={wedgeBottom + 8} r={6} />
        </g>

        {/* Wedge (mass M) */}
        <polygon
          points={`${wedgeLeft},${wedgeBottom} ${wedgeRight},${wedgeBottom} ${wedgeRight},${wedgeTop}`}
          fill="#a8a29e"
          stroke="#57534e"
          strokeWidth={2}
        />
        {/* Wedge label */}
        <text
          x={wedgeRight - 30}
          y={wedgeBottom - 15}
          fontSize={14}
          fontWeight="bold"
          fill="#44403c"
        >
          M
        </text>

        {/* Block on wedge (mass m) */}
        <g transform={`translate(${blockX}, ${blockY}) rotate(${-angle})`}>
          <rect
            x={-blockSize / 2}
            y={-blockSize}
            width={blockSize}
            height={blockSize}
            fill="#60a5fa"
            stroke="#2563eb"
            strokeWidth={2}
            rx={3}
          />
          <text
            x={0}
            y={-blockSize / 2 + 5}
            fontSize={14}
            fontWeight="bold"
            fill="#1e40af"
            textAnchor="middle"
          >
            m
          </text>
        </g>

        {/* Angle arc at base of wedge */}
        <path
          d={`M ${wedgeRight - 35} ${wedgeBottom} A 35 35 0 0 0 ${wedgeRight - 35 * Math.cos(angleRad)} ${wedgeBottom - 35 * Math.sin(angleRad)}`}
          fill="none"
          stroke="#6366f1"
          strokeWidth={1.5}
        />
        {/* Angle label α */}
        <text
          x={wedgeRight - 50}
          y={wedgeBottom - 12}
          fontSize={14}
          fill="#6366f1"
          fontStyle="italic"
        >
          α
        </text>

        {/* Acceleration arrow (indicating wedge is accelerating) */}
        <g>
          <line
            x1={wedgeLeft - 30}
            y1={wedgeBottom - wedgeHeight / 2}
            x2={wedgeLeft - 70}
            y2={wedgeBottom - wedgeHeight / 2}
            stroke="#dc2626"
            strokeWidth={2.5}
            markerEnd="url(#accelArrow)"
          />
          <defs>
            <marker
              id="accelArrow"
              markerWidth={10}
              markerHeight={10}
              refX={0}
              refY={5}
              orient="auto"
            >
              <path d="M 10 0 L 0 5 L 10 10 z" fill="#dc2626" />
            </marker>
          </defs>
          <text
            x={wedgeLeft - 55}
            y={wedgeBottom - wedgeHeight / 2 - 10}
            fontSize={12}
            fontWeight="bold"
            fill="#dc2626"
          >
            a
          </text>
        </g>

        {/* "Frictionless" labels */}
        <text
          x={centerX}
          y={wedgeBottom + 28}
          fontSize={10}
          fill="#6b7280"
          textAnchor="middle"
          fontStyle="italic"
        >
          frictionless surface
        </text>
      </g>
    )
  }

  // Default: horizontal surface
  return (
    <g>
      {/* Horizontal surface */}
      <line
        x1={centerX - 120}
        y1={centerY + 60}
        x2={centerX + 120}
        y2={centerY + 60}
        stroke="#374151"
        strokeWidth={3}
      />
      {/* Hatch marks */}
      <g stroke="#374151" strokeWidth={1}>
        {Array.from({ length: 10 }).map((_, i) => (
          <line
            key={i}
            x1={centerX - 110 + i * 24}
            y1={centerY + 60}
            x2={centerX - 120 + i * 24}
            y2={centerY + 70}
          />
        ))}
      </g>
    </g>
  )
}
