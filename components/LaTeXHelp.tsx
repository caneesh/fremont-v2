'use client'

import { useState } from 'react'
import MathRenderer from './MathRenderer'

const COMMON_PHYSICS_EQUATIONS = [
  {
    category: 'Mechanics',
    equations: [
      { name: 'Force', latex: 'F = ma', description: 'Newton\'s Second Law' },
      { name: 'Kinetic Energy', latex: 'KE = \\frac{1}{2}mv^2', description: 'Energy of motion' },
      { name: 'Momentum', latex: 'p = mv', description: 'Linear momentum' },
      { name: 'Work', latex: 'W = F \\cdot d = Fd\\cos\\theta', description: 'Work done by force' },
    ]
  },
  {
    category: 'Electromagnetism',
    equations: [
      { name: 'Coulomb\'s Law', latex: 'F = k\\frac{q_1 q_2}{r^2}', description: 'Force between charges' },
      { name: 'Ohm\'s Law', latex: 'V = IR', description: 'Voltage-current relationship' },
      { name: 'Electric Field', latex: 'E = \\frac{F}{q} = \\frac{kQ}{r^2}', description: 'Field strength' },
      { name: 'Magnetic Force', latex: 'F = qvB\\sin\\theta', description: 'Lorentz force' },
    ]
  },
  {
    category: 'Thermodynamics',
    equations: [
      { name: 'First Law', latex: '\\Delta U = Q - W', description: 'Energy conservation' },
      { name: 'Ideal Gas', latex: 'PV = nRT', description: 'Gas equation of state' },
      { name: 'Entropy', latex: '\\Delta S = \\frac{Q}{T}', description: 'Change in entropy' },
    ]
  },
  {
    category: 'Waves & Optics',
    equations: [
      { name: 'Wave Speed', latex: 'v = f\\lambda', description: 'Velocity-frequency relation' },
      { name: 'Lens Formula', latex: '\\frac{1}{f} = \\frac{1}{v} - \\frac{1}{u}', description: 'Thin lens equation' },
      { name: 'Snell\'s Law', latex: 'n_1\\sin\\theta_1 = n_2\\sin\\theta_2', description: 'Refraction' },
    ]
  },
]

const LATEX_SYNTAX = [
  {
    category: 'Basic',
    items: [
      { syntax: '$x$', example: '$x$', description: 'Inline math' },
      { syntax: '$$x$$', example: '$$E = mc^2$$', description: 'Display math' },
      { syntax: 'x^2', example: '$x^2$', description: 'Superscript' },
      { syntax: 'x_i', example: '$x_i$', description: 'Subscript' },
    ]
  },
  {
    category: 'Fractions & Roots',
    items: [
      { syntax: '\\frac{a}{b}', example: '$\\frac{a}{b}$', description: 'Fraction' },
      { syntax: '\\sqrt{x}', example: '$\\sqrt{x}$', description: 'Square root' },
      { syntax: '\\sqrt[n]{x}', example: '$\\sqrt[3]{x}$', description: 'nth root' },
    ]
  },
  {
    category: 'Symbols',
    items: [
      { syntax: '\\alpha, \\beta, \\gamma', example: '$\\alpha, \\beta, \\gamma$', description: 'Greek letters' },
      { syntax: '\\leq, \\geq, \\neq', example: '$\\leq, \\geq, \\neq$', description: 'Comparisons' },
      { syntax: '\\pm, \\times, \\div', example: '$\\pm, \\times, \\div$', description: 'Operators' },
      { syntax: '\\infty, \\partial, \\nabla', example: '$\\infty, \\partial, \\nabla$', description: 'Special' },
    ]
  },
  {
    category: 'Calculus',
    items: [
      { syntax: '\\int_a^b f(x)dx', example: '$\\int_0^\\infty e^{-x}dx$', description: 'Integral' },
      { syntax: '\\frac{d}{dx}', example: '$\\frac{d}{dx}f(x)$', description: 'Derivative' },
      { syntax: '\\lim_{x\\to a}', example: '$\\lim_{x\\to 0}\\frac{\\sin x}{x}$', description: 'Limit' },
      { syntax: '\\sum_{i=1}^{n}', example: '$\\sum_{i=1}^{n} i$', description: 'Sum' },
    ]
  },
]

export default function LaTeXHelp() {
  const [activeTab, setActiveTab] = useState<'equations' | 'syntax'>('syntax')

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Tabs */}
      <div className="border-b border-gray-200 flex">
        <button
          onClick={() => setActiveTab('syntax')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'syntax'
              ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          LaTeX Syntax
        </button>
        <button
          onClick={() => setActiveTab('equations')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'equations'
              ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Physics Equations
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {activeTab === 'syntax' && (
          <div className="space-y-6">
            {LATEX_SYNTAX.map((section) => (
              <div key={section.category}>
                <h3 className="text-sm font-bold text-gray-900 mb-3">{section.category}</h3>
                <div className="space-y-2">
                  {section.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 bg-gray-50 rounded text-sm">
                      <div className="font-mono text-xs text-gray-700 bg-white px-2 py-1 rounded border border-gray-200 overflow-x-auto">
                        {item.syntax}
                      </div>
                      <div className="flex items-center justify-center bg-white px-2 py-1 rounded border border-gray-200">
                        <MathRenderer text={item.example} enableCopy={false} />
                      </div>
                      <div className="text-gray-600 flex items-center sm:justify-end">
                        {item.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'equations' && (
          <div className="space-y-6">
            {COMMON_PHYSICS_EQUATIONS.map((section) => (
              <div key={section.category}>
                <h3 className="text-sm font-bold text-gray-900 mb-3">{section.category}</h3>
                <div className="space-y-3">
                  {section.equations.map((eq, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
                      <div className="font-semibold text-sm text-gray-900 mb-1">{eq.name}</div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <MathRenderer text={`$${eq.latex}$`} />
                        </div>
                        <div className="text-xs text-gray-600">{eq.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
