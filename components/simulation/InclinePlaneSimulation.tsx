'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { InclineParams, InclineResults } from '@/types/simulation'
import { calculateIncline, defaultInclineParams } from '@/lib/simulationService'

interface InclinePlaneSimulationProps {
  initialParams: Partial<InclineParams>
  expectedAcceleration?: number
  expectedFriction?: number
  onClose: () => void
}

export default function InclinePlaneSimulation({
  initialParams,
  expectedAcceleration,
  expectedFriction,
  onClose,
}: InclinePlaneSimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)

  const [params, setParams] = useState<InclineParams>({
    ...defaultInclineParams,
    ...initialParams,
  })
  const [results, setResults] = useState<InclineResults | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [showMismatch, setShowMismatch] = useState(false)

  // Calculate results when params change
  useEffect(() => {
    const newResults = calculateIncline(params)
    setResults(newResults)
    setCurrentTime(0)
    setIsPlaying(false)

    // Check for mismatch with expected values
    if (expectedAcceleration !== undefined || expectedFriction !== undefined) {
      const accelMismatch = expectedAcceleration !== undefined &&
        Math.abs(newResults.acceleration - expectedAcceleration) / Math.max(expectedAcceleration, 0.1) > 0.1
      const frictionMismatch = expectedFriction !== undefined &&
        Math.abs(newResults.frictionForce - expectedFriction) / Math.max(expectedFriction, 0.1) > 0.1

      setShowMismatch(accelMismatch || frictionMismatch)
    }
  }, [params, expectedAcceleration, expectedFriction])

  // Draw the simulation
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !results) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const padding = 50

    // Clear canvas
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)

    const angleRad = (params.angle * Math.PI) / 180
    const inclineLength = params.inclineLength

    // Calculate incline dimensions
    const inclineWidth = width - 2 * padding
    const inclineHeight = inclineWidth * Math.tan(angleRad) * 0.6
    const startX = padding
    const startY = height - padding
    const endX = startX + inclineWidth * 0.8
    const endY = startY - inclineHeight

    // Draw ground
    ctx.fillStyle = '#3d3d5c'
    ctx.fillRect(0, height - padding, width, padding)

    // Draw incline surface
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(endX, endY)
    ctx.lineTo(endX, startY)
    ctx.closePath()
    ctx.fillStyle = '#4a4a6a'
    ctx.fill()
    ctx.strokeStyle = '#6b7280'
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw friction indicator (rough texture)
    if (params.frictionCoeff > 0) {
      ctx.strokeStyle = '#8b7355'
      ctx.lineWidth = 1
      for (let i = 0; i < 20; i++) {
        const t = i / 20
        const x = startX + (endX - startX) * t
        const y = startY + (endY - startY) * t
        ctx.beginPath()
        ctx.moveTo(x - 3, y + 3)
        ctx.lineTo(x + 3, y - 3)
        ctx.stroke()
      }
    }

    // Calculate block position
    const currentPoint = results.trajectory.find(p => p.t >= currentTime) ||
      results.trajectory[results.trajectory.length - 1] ||
      { x: 0, y: 0, v: 0 }

    // Position along incline (0 to 1)
    const positionRatio = Math.min(
      Math.sqrt(currentPoint.x * currentPoint.x + currentPoint.y * currentPoint.y) / inclineLength,
      1
    )

    const blockX = startX + (endX - startX) * positionRatio
    const blockY = startY + (endY - startY) * positionRatio

    // Draw block
    const blockSize = 30
    ctx.save()
    ctx.translate(blockX, blockY)
    ctx.rotate(-angleRad)

    // Block shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.fillRect(-blockSize / 2 + 3, -blockSize + 3, blockSize, blockSize)

    // Block body
    ctx.fillStyle = '#f59e0b'
    ctx.fillRect(-blockSize / 2, -blockSize, blockSize, blockSize)
    ctx.strokeStyle = '#d97706'
    ctx.lineWidth = 2
    ctx.strokeRect(-blockSize / 2, -blockSize, blockSize, blockSize)

    // Mass label
    ctx.fillStyle = '#78350f'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${params.mass}kg`, 0, -blockSize / 2 + 4)

    ctx.restore()

    // Draw force vectors
    const vectorScale = 3
    const forceOriginX = blockX
    const forceOriginY = blockY - blockSize / 2

    // Weight (mg) - always down
    const weightMag = params.mass * params.gravity * vectorScale
    ctx.beginPath()
    ctx.moveTo(forceOriginX, forceOriginY)
    ctx.lineTo(forceOriginX, forceOriginY + weightMag)
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 3
    ctx.stroke()
    drawArrowHead(ctx, forceOriginX, forceOriginY + weightMag, Math.PI / 2, '#ef4444')

    // Normal force - perpendicular to surface
    const normalMag = results.normalForce * vectorScale
    ctx.beginPath()
    ctx.moveTo(forceOriginX, forceOriginY)
    ctx.lineTo(
      forceOriginX - normalMag * Math.sin(angleRad),
      forceOriginY - normalMag * Math.cos(angleRad)
    )
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 3
    ctx.stroke()
    drawArrowHead(ctx,
      forceOriginX - normalMag * Math.sin(angleRad),
      forceOriginY - normalMag * Math.cos(angleRad),
      -angleRad - Math.PI / 2, '#3b82f6')

    // Friction force - along surface (opposing motion)
    if (results.frictionForce > 0) {
      const frictionMag = results.frictionForce * vectorScale
      const frictionDir = currentPoint.v >= 0 ? 1 : -1 // Opposes motion
      ctx.beginPath()
      ctx.moveTo(forceOriginX, forceOriginY)
      ctx.lineTo(
        forceOriginX + frictionDir * frictionMag * Math.cos(angleRad),
        forceOriginY + frictionDir * frictionMag * Math.sin(angleRad)
      )
      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 3
      ctx.stroke()
      drawArrowHead(ctx,
        forceOriginX + frictionDir * frictionMag * Math.cos(angleRad),
        forceOriginY + frictionDir * frictionMag * Math.sin(angleRad),
        frictionDir > 0 ? -angleRad : Math.PI - angleRad, '#10b981')
    }

    // Labels
    ctx.fillStyle = '#9ca3af'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`θ = ${params.angle}°`, startX + 50, startY - 10)
    ctx.fillText(`μ = ${params.frictionCoeff.toFixed(2)}`, endX - 80, startY - 10)

    // Force legend
    ctx.font = '11px sans-serif'
    const legendY = 30
    ctx.fillStyle = '#ef4444'
    ctx.fillText('● Weight (mg)', padding, legendY)
    ctx.fillStyle = '#3b82f6'
    ctx.fillText('● Normal (N)', padding + 100, legendY)
    ctx.fillStyle = '#10b981'
    ctx.fillText('● Friction (f)', padding + 200, legendY)

    // Velocity indicator
    if (currentPoint.v !== undefined) {
      ctx.fillStyle = '#fbbf24'
      ctx.font = 'bold 14px sans-serif'
      ctx.fillText(`v = ${Math.abs(currentPoint.v).toFixed(2)} m/s`, width - padding - 100, legendY)
    }
  }, [results, currentTime, params])

  // Helper function to draw arrow heads
  function drawArrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string) {
    const headLen = 10
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - headLen * Math.cos(angle - Math.PI / 6), y - headLen * Math.sin(angle - Math.PI / 6))
    ctx.moveTo(x, y)
    ctx.lineTo(x - headLen * Math.cos(angle + Math.PI / 6), y - headLen * Math.sin(angle + Math.PI / 6))
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.stroke()
  }

  // Animation loop
  useEffect(() => {
    if (isPlaying && results) {
      const totalTime = results.timeToStop || 3
      const startTime = Date.now() - currentTime * 1000
      const animate = () => {
        const elapsed = (Date.now() - startTime) / 1000
        if (elapsed >= totalTime) {
          setCurrentTime(totalTime)
          setIsPlaying(false)
        } else {
          setCurrentTime(elapsed)
          animationRef.current = requestAnimationFrame(animate)
        }
      }
      animationRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, results, currentTime])

  // Draw on every frame
  useEffect(() => {
    draw()
  }, [draw])

  const handlePlay = () => {
    const totalTime = results?.timeToStop || 3
    if (currentTime >= totalTime) {
      setCurrentTime(0)
    }
    setIsPlaying(true)
  }

  const handlePause = () => setIsPlaying(false)

  const handleReset = () => {
    setCurrentTime(0)
    setIsPlaying(false)
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg border border-gray-200 dark:border-dark-border overflow-hidden">
      {/* Header */}
      <div className="bg-green-600 dark:bg-green-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19l-7-7 7-7m8 14l7-7-7-7" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg">Inclined Plane Simulation</h3>
              <p className="text-sm text-white/80">Explore forces and motion on an incline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mismatch Warning */}
      {showMismatch && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-500/30 p-3">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-medium">
              Simulation results don&apos;t match expected values - check your calculations!
            </span>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Canvas */}
        <div className="mb-4 rounded-lg overflow-hidden border border-gray-200 dark:border-dark-border">
          <canvas
            ref={canvasRef}
            width={600}
            height={350}
            className="w-full bg-gray-900"
          />
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={handleReset}
            className="p-2 bg-gray-100 dark:bg-dark-card-soft rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            className="p-3 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
          <div className="text-sm text-gray-600 dark:text-dark-text-secondary font-mono">
            t = {currentTime.toFixed(2)}s
          </div>
        </div>

        {/* Parameter Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Incline Angle */}
          <div className="bg-gray-50 dark:bg-dark-card-soft rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
                Incline Angle
              </label>
              <span className="text-sm font-mono text-green-600 dark:text-green-400">
                {params.angle.toFixed(0)}°
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              step="1"
              value={params.angle}
              onChange={(e) => setParams(p => ({ ...p, angle: parseFloat(e.target.value) }))}
              className="w-full accent-green-600"
            />
          </div>

          {/* Friction Coefficient */}
          <div className="bg-gray-50 dark:bg-dark-card-soft rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
                Friction Coefficient (μ)
              </label>
              <span className="text-sm font-mono text-teal-600 dark:text-teal-400">
                {params.frictionCoeff.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={params.frictionCoeff}
              onChange={(e) => setParams(p => ({ ...p, frictionCoeff: parseFloat(e.target.value) }))}
              className="w-full accent-teal-600"
            />
          </div>
        </div>

        {/* Results Display */}
        {results && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
              <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Normal Force</div>
              <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{results.normalForce.toFixed(1)}N</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <div className="text-xs text-green-600 dark:text-green-400 mb-1">Friction</div>
              <div className="text-lg font-bold text-green-700 dark:text-green-300">{results.frictionForce.toFixed(1)}N</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
              <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">Acceleration</div>
              <div className="text-lg font-bold text-purple-700 dark:text-purple-300">{results.acceleration.toFixed(2)}m/s²</div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
              <div className="text-xs text-orange-600 dark:text-orange-400 mb-1">Will Slide?</div>
              <div className={`text-lg font-bold ${results.willSlide ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {results.willSlide ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
