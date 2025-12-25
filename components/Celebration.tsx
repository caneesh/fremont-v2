'use client'

import { useEffect, useState } from 'react'

interface CelebrationProps {
  show: boolean
  onComplete?: () => void
}

interface Particle {
  id: number
  x: number
  color: string
  delay: number
  duration: number
}

export default function Celebration({ show, onComplete }: CelebrationProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)

      // Generate confetti particles
      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
      const newParticles: Particle[] = []

      for (let i = 0; i < 50; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          color: colors[Math.floor(Math.random() * colors.length)],
          delay: Math.random() * 0.5,
          duration: 2 + Math.random() * 2,
        })
      }

      setParticles(newParticles)

      // Auto-hide after animation
      const timer = setTimeout(() => {
        setIsVisible(false)
        onComplete?.()
      }, 4000)

      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Confetti particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-3 h-3 rounded-sm animate-confetti"
          style={{
            left: `${particle.x}%`,
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        />
      ))}

      {/* Success message */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="animate-bounce-in bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm mx-4 border-4 border-green-400">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Problem Solved!
          </h2>
          <p className="text-gray-600">
            Great work! Keep up the momentum.
          </p>
        </div>
      </div>
    </div>
  )
}
