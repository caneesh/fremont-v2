'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ProjectileParams, ProjectileResults } from '@/types/simulation'
import { calculateProjectile, defaultProjectileParams } from '@/lib/simulationService'

interface ProjectileSimulationProps {
  initialParams: Partial<ProjectileParams>
  expectedRange?: number
  expectedMaxHeight?: number
  onClose: () => void
}

export default function ProjectileSimulation({
  initialParams,
  expectedRange,
  expectedMaxHeight,
  onClose,
}: ProjectileSimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)

  const [params, setParams] = useState<ProjectileParams>({
    ...defaultProjectileParams,
    ...initialParams,
  })
  const [results, setResults] = useState<ProjectileResults | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [showMismatch, setShowMismatch] = useState(false)

  // Calculate results when params change
  useEffect(() => {
    const newResults = calculateProjectile(params)
    setResults(newResults)
    setCurrentTime(0)
    setIsPlaying(false)

    // Check for mismatch with expected values
    if (expectedRange !== undefined || expectedMaxHeight !== undefined) {
      const rangeMismatch = expectedRange !== undefined &&
        Math.abs(newResults.range - expectedRange) / expectedRange > 0.1
      const heightMismatch = expectedMaxHeight !== undefined &&
        Math.abs(newResults.maxHeight - expectedMaxHeight) / expectedMaxHeight > 0.1

      setShowMismatch(rangeMismatch || heightMismatch)
    }
  }, [params, expectedRange, expectedMaxHeight])

  // Draw the simulation
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !results) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const padding = 40

    // Clear canvas
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)

    // Calculate scale
    const maxX = Math.max(results.range * 1.1, 10)
    const maxY = Math.max(results.maxHeight * 1.2, 10)
    const scaleX = (width - 2 * padding) / maxX
    const scaleY = (height - 2 * padding) / maxY

    const toCanvasX = (x: number) => padding + x * scaleX
    const toCanvasY = (y: number) => height - padding - y * scaleY

    // Draw grid
    ctx.strokeStyle = '#2d2d44'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= maxX; x += maxX / 10) {
      ctx.moveTo(toCanvasX(x), padding)
      ctx.lineTo(toCanvasX(x), height - padding)
    }
    for (let y = 0; y <= maxY; y += maxY / 10) {
      ctx.moveTo(padding, toCanvasY(y))
      ctx.lineTo(width - padding, toCanvasY(y))
    }
    ctx.stroke()

    // Draw axes
    ctx.strokeStyle = '#6b7280'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.moveTo(padding, height - padding)
    ctx.lineTo(padding, padding)
    ctx.stroke()

    // Axis labels
    ctx.fillStyle = '#9ca3af'
    ctx.font = '12px sans-serif'
    ctx.fillText('Distance (m)', width / 2, height - 10)
    ctx.save()
    ctx.translate(15, height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('Height (m)', 0, 0)
    ctx.restore()

    // Draw trajectory path
    ctx.strokeStyle = '#60a5fa'
    ctx.lineWidth = 2
    ctx.beginPath()
    results.trajectory.forEach((point, i) => {
      if (i === 0) {
        ctx.moveTo(toCanvasX(point.x), toCanvasY(point.y))
      } else {
        ctx.lineTo(toCanvasX(point.x), toCanvasY(point.y))
      }
    })
    ctx.stroke()

    // Draw current position
    const currentPoint = results.trajectory.find(p => p.t >= currentTime) ||
      results.trajectory[results.trajectory.length - 1]

    if (currentPoint) {
      // Ball
      ctx.beginPath()
      ctx.arc(toCanvasX(currentPoint.x), toCanvasY(currentPoint.y), 8, 0, Math.PI * 2)
      ctx.fillStyle = '#f59e0b'
      ctx.fill()
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 2
      ctx.stroke()

      // Velocity vector
      const angleRad = (params.launchAngle * Math.PI) / 180
      const v0x = params.initialVelocity * Math.cos(angleRad)
      const v0y = params.initialVelocity * Math.sin(angleRad) - params.gravity * currentTime
      const vMag = Math.sqrt(v0x * v0x + v0y * v0y)
      const arrowLen = 30 * (vMag / params.initialVelocity)

      ctx.beginPath()
      ctx.moveTo(toCanvasX(currentPoint.x), toCanvasY(currentPoint.y))
      ctx.lineTo(
        toCanvasX(currentPoint.x) + arrowLen * (v0x / vMag),
        toCanvasY(currentPoint.y) - arrowLen * (v0y / vMag)
      )
      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Draw max height indicator
    ctx.setLineDash([5, 5])
    ctx.strokeStyle = '#8b5cf6'
    ctx.beginPath()
    ctx.moveTo(padding, toCanvasY(results.maxHeight))
    ctx.lineTo(width - padding, toCanvasY(results.maxHeight))
    ctx.stroke()
    ctx.setLineDash([])

    // Draw range indicator
    ctx.setLineDash([5, 5])
    ctx.strokeStyle = '#ec4899'
    ctx.beginPath()
    ctx.moveTo(toCanvasX(results.range), padding)
    ctx.lineTo(toCanvasX(results.range), height - padding)
    ctx.stroke()
    ctx.setLineDash([])

    // Labels
    ctx.fillStyle = '#8b5cf6'
    ctx.fillText(`Max Height: ${results.maxHeight.toFixed(1)}m`, toCanvasX(results.range / 2) - 50, toCanvasY(results.maxHeight) - 10)
    ctx.fillStyle = '#ec4899'
    ctx.fillText(`Range: ${results.range.toFixed(1)}m`, toCanvasX(results.range) + 5, height - padding - 20)
  }, [results, currentTime, params])

  // Animation loop
  useEffect(() => {
    if (isPlaying && results) {
      const startTime = Date.now() - currentTime * 1000
      const animate = () => {
        const elapsed = (Date.now() - startTime) / 1000
        if (elapsed >= results.timeOfFlight) {
          setCurrentTime(results.timeOfFlight)
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
    if (currentTime >= (results?.timeOfFlight || 0)) {
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
      <div className="bg-blue-600 dark:bg-blue-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg">Projectile Motion Simulation</h3>
              <p className="text-sm text-white/80">Explore how parameters affect the trajectory</p>
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
            className="p-3 bg-blue-600 dark:bg-accent text-white rounded-lg hover:bg-blue-700 dark:hover:bg-accent-strong transition-colors"
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
            t = {currentTime.toFixed(2)}s / {results?.timeOfFlight.toFixed(2)}s
          </div>
        </div>

        {/* Parameter Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Initial Velocity */}
          <div className="bg-gray-50 dark:bg-dark-card-soft rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
                Initial Velocity
              </label>
              <span className="text-sm font-mono text-blue-600 dark:text-accent">
                {params.initialVelocity.toFixed(1)} m/s
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={params.initialVelocity}
              onChange={(e) => setParams(p => ({ ...p, initialVelocity: parseFloat(e.target.value) }))}
              className="w-full accent-blue-600 dark:accent-accent"
            />
          </div>

          {/* Launch Angle */}
          <div className="bg-gray-50 dark:bg-dark-card-soft rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
                Launch Angle
              </label>
              <span className="text-sm font-mono text-purple-600 dark:text-purple-400">
                {params.launchAngle.toFixed(0)}°
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="85"
              step="1"
              value={params.launchAngle}
              onChange={(e) => setParams(p => ({ ...p, launchAngle: parseFloat(e.target.value) }))}
              className="w-full accent-purple-600"
            />
          </div>
        </div>

        {/* Results Display */}
        {results && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
              <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">Max Height</div>
              <div className="text-lg font-bold text-purple-700 dark:text-purple-300">{results.maxHeight.toFixed(1)}m</div>
            </div>
            <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3 text-center">
              <div className="text-xs text-pink-600 dark:text-pink-400 mb-1">Range</div>
              <div className="text-lg font-bold text-pink-700 dark:text-pink-300">{results.range.toFixed(1)}m</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <div className="text-xs text-green-600 dark:text-green-400 mb-1">Time of Flight</div>
              <div className="text-lg font-bold text-green-700 dark:text-green-300">{results.timeOfFlight.toFixed(2)}s</div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
              <div className="text-xs text-orange-600 dark:text-orange-400 mb-1">Final Velocity</div>
              <div className="text-lg font-bold text-orange-700 dark:text-orange-300">{results.finalVelocity.toFixed(1)}m/s</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
