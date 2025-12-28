'use client'

import type { ObjectShape } from '@/types/diagram'

interface ObjectRendererProps {
  shape: ObjectShape
  x: number
  y: number
  size?: number
  rotation?: number  // For incline scenarios
}

export default function ObjectRenderer({
  shape,
  x,
  y,
  size = 60,
  rotation = 0
}: ObjectRendererProps) {
  const halfSize = size / 2

  if (shape === 'point') {
    return (
      <g transform={`translate(${x}, ${y})`}>
        {/* Point mass - filled circle */}
        <circle
          cx={0}
          cy={0}
          r={12}
          fill="#374151"
          stroke="#1f2937"
          strokeWidth={2}
        />
        {/* Label */}
        <text
          x={0}
          y={4}
          textAnchor="middle"
          fontSize={10}
          fill="white"
          fontWeight="bold"
        >
          m
        </text>
      </g>
    )
  }

  if (shape === 'sphere') {
    return (
      <g transform={`translate(${x}, ${y})`}>
        {/* Sphere with gradient */}
        <defs>
          <radialGradient id="sphereGradient" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#374151" />
          </radialGradient>
        </defs>
        <circle
          cx={0}
          cy={0}
          r={halfSize}
          fill="url(#sphereGradient)"
          stroke="#1f2937"
          strokeWidth={2}
        />
        {/* Label */}
        <text
          x={0}
          y={5}
          textAnchor="middle"
          fontSize={14}
          fill="white"
          fontWeight="bold"
        >
          m
        </text>
      </g>
    )
  }

  // Default: block
  return (
    <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
      {/* Block - rectangle with slight 3D effect */}
      <rect
        x={-halfSize}
        y={-halfSize}
        width={size}
        height={size}
        fill="#6b7280"
        stroke="#374151"
        strokeWidth={2}
        rx={4}
      />
      {/* Top face highlight */}
      <rect
        x={-halfSize + 4}
        y={-halfSize + 4}
        width={size - 8}
        height={4}
        fill="#9ca3af"
        rx={2}
      />
      {/* Label */}
      <text
        x={0}
        y={5}
        textAnchor="middle"
        fontSize={16}
        fill="white"
        fontWeight="bold"
      >
        m
      </text>
    </g>
  )
}
