'use client'

/**
 * Demo Page for Question Scaffolding Engine
 *
 * Showcases the QuestionResolver component with:
 * - Example physics problems to try
 * - Template browser showing available patterns
 * - Live resolution with progress tracking
 */

import { useState } from 'react'
import QuestionResolver from '@/components/QuestionResolver'

// =============================================================================
// Example Problems
// =============================================================================

interface ExampleProblem {
  title: string
  statement: string
  choices?: string[]
  topic: string
  subtopic: string
}

const EXAMPLE_PROBLEMS: ExampleProblem[] = [
  {
    title: 'Inclined Plane (Frictionless)',
    statement: 'A 5 kg block is placed on a frictionless inclined plane that makes an angle of 30° with the horizontal. Starting from rest, the block slides down 10 m along the incline. Find the acceleration and the final velocity of the block. Take g = 10 m/s².',
    topic: 'mechanics',
    subtopic: 'inclined_plane',
  },
  {
    title: 'Inclined Plane with Friction',
    statement: 'A 2 kg block slides down a rough incline of angle 45°. The coefficient of kinetic friction between the block and the incline is 0.3. Find the acceleration of the block. (g = 10 m/s²)',
    topic: 'mechanics',
    subtopic: 'inclined_plane_friction',
  },
  {
    title: 'Projectile Motion',
    statement: 'A ball is thrown from ground level at an angle of 60° above the horizontal with an initial speed of 20 m/s. Find (a) the maximum height reached, (b) the time of flight, and (c) the horizontal range. (g = 10 m/s²)',
    topic: 'mechanics',
    subtopic: 'projectile',
  },
  {
    title: 'Circular Motion',
    statement: 'A car of mass 1000 kg travels around a circular track of radius 50 m at a constant speed of 20 m/s. Find the centripetal force acting on the car.',
    topic: 'mechanics',
    subtopic: 'circular_motion',
  },
  {
    title: 'Ideal Gas Law',
    statement: 'A container holds 2 moles of an ideal gas at pressure 2 atm and temperature 300 K. If the temperature is increased to 450 K while keeping the volume constant, find the new pressure.',
    topic: 'thermodynamics',
    subtopic: 'ideal_gas',
  },
  {
    title: 'Electric Field',
    statement: 'Two point charges, +4 μC and -2 μC, are placed 30 cm apart. Find the electric field at a point midway between them.',
    topic: 'electromagnetism',
    subtopic: 'coulomb_field',
  },
  {
    title: 'Thin Lens',
    statement: 'An object is placed 30 cm from a converging lens of focal length 20 cm. Find the image distance and the magnification.',
    topic: 'optics',
    subtopic: 'lenses',
  },
  {
    title: 'Photoelectric Effect',
    statement: 'Light of wavelength 400 nm falls on a metal surface with work function 2.0 eV. Find the maximum kinetic energy of the emitted photoelectrons. (h = 6.63 × 10⁻³⁴ J·s, c = 3 × 10⁸ m/s, 1 eV = 1.6 × 10⁻¹⁹ J)',
    topic: 'modern',
    subtopic: 'photoelectric',
  },
]

// Template info for display
const TEMPLATE_INFO = [
  { id: 'mechanics/incline_frictionless', name: 'Frictionless Incline', topic: 'Mechanics', steps: 5 },
  { id: 'mechanics/incline_with_friction', name: 'Incline with Friction', topic: 'Mechanics', steps: 6 },
  { id: 'mechanics/newton_2d_block', name: 'Newton\'s Laws 2D', topic: 'Mechanics', steps: 5 },
  { id: 'mechanics/projectile_motion', name: 'Projectile Motion', topic: 'Mechanics', steps: 5 },
  { id: 'mechanics/circular_motion', name: 'Circular Motion', topic: 'Mechanics', steps: 5 },
  { id: 'mechanics/work_energy', name: 'Work-Energy Theorem', topic: 'Mechanics', steps: 5 },
  { id: 'mechanics/momentum_collision', name: 'Momentum & Collisions', topic: 'Mechanics', steps: 5 },
  { id: 'mechanics/pulley_system', name: 'Pulley Systems', topic: 'Mechanics', steps: 5 },
  { id: 'mechanics/shm', name: 'Simple Harmonic Motion', topic: 'Mechanics', steps: 5 },
  { id: 'thermodynamics/ideal_gas', name: 'Ideal Gas Law', topic: 'Thermodynamics', steps: 5 },
  { id: 'thermodynamics/first_law', name: 'First Law', topic: 'Thermodynamics', steps: 5 },
  { id: 'thermodynamics/heat_engine', name: 'Heat Engines', topic: 'Thermodynamics', steps: 5 },
  { id: 'thermodynamics/calorimetry', name: 'Calorimetry', topic: 'Thermodynamics', steps: 5 },
  { id: 'electromagnetism/coulomb_field', name: 'Coulomb\'s Law & Fields', topic: 'E&M', steps: 5 },
  { id: 'electromagnetism/gauss_law', name: 'Gauss\'s Law', topic: 'E&M', steps: 5 },
  { id: 'electromagnetism/capacitors', name: 'Capacitors', topic: 'E&M', steps: 5 },
  { id: 'electromagnetism/dc_circuits', name: 'DC Circuits', topic: 'E&M', steps: 5 },
  { id: 'electromagnetism/magnetic_force', name: 'Magnetic Forces', topic: 'E&M', steps: 5 },
  { id: 'electromagnetism/em_induction', name: 'EM Induction', topic: 'E&M', steps: 5 },
  { id: 'optics/mirrors', name: 'Mirrors', topic: 'Optics', steps: 5 },
  { id: 'optics/lenses', name: 'Lenses', topic: 'Optics', steps: 5 },
  { id: 'optics/interference', name: 'Interference', topic: 'Optics', steps: 5 },
  { id: 'waves/standing_waves', name: 'Standing Waves', topic: 'Waves', steps: 5 },
  { id: 'waves/doppler', name: 'Doppler Effect', topic: 'Waves', steps: 5 },
  { id: 'modern/photoelectric', name: 'Photoelectric Effect', topic: 'Modern', steps: 5 },
  { id: 'modern/bohr_model', name: 'Bohr Model', topic: 'Modern', steps: 5 },
  { id: 'modern/nuclear_decay', name: 'Nuclear Decay', topic: 'Modern', steps: 5 },
]

// =============================================================================
// Component
// =============================================================================

export default function QuestionEngineDemoPage() {
  const [selectedExample, setSelectedExample] = useState<ExampleProblem | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [resolvedCount, setResolvedCount] = useState(0)

  const handleSelectExample = (example: ExampleProblem) => {
    setSelectedExample(example)
    // Scroll to resolver
    setTimeout(() => {
      document.getElementById('resolver')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Question Scaffolding Engine
          </h1>
          <p className="mt-2 text-gray-600">
            AI-powered physics problem scaffolding with intelligent caching and template-based generation
          </p>
          <div className="mt-4 flex gap-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
              {TEMPLATE_INFO.length} Templates
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
              {EXAMPLE_PROBLEMS.length} Examples
            </span>
            {resolvedCount > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                {resolvedCount} Resolved
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Example Problems Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>Try an Example Problem</span>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-sm font-normal text-blue-600 hover:underline ml-auto"
            >
              {showTemplates ? 'Hide Templates' : 'View All Templates'}
            </button>
          </h2>

          {/* Template Browser */}
          {showTemplates && (
            <div className="mb-6 p-4 bg-white rounded-lg border shadow-sm">
              <h3 className="font-medium mb-3">Available Templates by Topic</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {TEMPLATE_INFO.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                  >
                    <span>{template.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-200 rounded">
                      {template.topic}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Example Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {EXAMPLE_PROBLEMS.map((example, index) => (
              <button
                key={index}
                onClick={() => handleSelectExample(example)}
                className={`p-4 text-left rounded-lg border transition-all hover:shadow-md ${
                  selectedExample === example
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {example.topic}
                </div>
                <div className="font-medium mt-1">{example.title}</div>
                <div className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {example.statement.slice(0, 80)}...
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Resolver Section */}
        <section id="resolver" className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">
            {selectedExample ? `Resolve: ${selectedExample.title}` : 'Question Resolver'}
          </h2>

          <QuestionResolver
            key={selectedExample?.statement || 'default'}
            initialStatement={selectedExample?.statement || ''}
            initialTopic={selectedExample?.topic || ''}
            initialSubtopic={selectedExample?.subtopic || ''}
            onResolved={() => setResolvedCount((c) => c + 1)}
            onError={(err) => console.error('Resolution error:', err)}
          />
        </section>

        {/* How It Works */}
        <section className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-medium mb-2">Fingerprint</h3>
              <p className="text-sm text-gray-600">
                Your problem is analyzed using LLM-free heuristics to extract topic, subtopic, and key physics concepts.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-green-600">2</span>
              </div>
              <h3 className="font-medium mb-2">Cache Check</h3>
              <p className="text-sm text-gray-600">
                We search for exact matches or similar problems in our cache. Cache hits return instantly without using LLM.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="font-medium mb-2">Generate</h3>
              <p className="text-sm text-gray-600">
                If no cache hit, AI generates a scaffold using a fixed template. The AI can only fill slots, not modify structure.
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <h2 className="text-xl font-semibold mb-4">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <div className="font-medium">Template Enforcement</div>
                <div className="text-sm opacity-90">LLM cannot add, remove, or reorder steps</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div>
                <div className="font-medium">Intelligent Caching</div>
                <div className="text-sm opacity-90">Content-addressed storage with similarity matching</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div>
                <div className="font-medium">Rate Limiting</div>
                <div className="text-sm opacity-90">IP-based limits and user quotas for cost control</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <div>
                <div className="font-medium">Zod Validation</div>
                <div className="text-sm opacity-90">Strict schema validation for all responses</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
          Question Scaffolding Engine v1 - IIT-JEE Physics Problem Solver
        </div>
      </footer>
    </div>
  )
}
