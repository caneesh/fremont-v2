'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MathRenderer from '@/components/MathRenderer'
import LaTeXEditor from '@/components/LaTeXEditor'
import LaTeXHelp from '@/components/LaTeXHelp'
import MobileNav from '@/components/MobileNav'

const DEMO_EXAMPLES = [
  {
    title: 'Quadratic Formula',
    latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'
  },
  {
    title: 'Maxwell\'s Equations',
    latex: `\\begin{aligned}
\\nabla \\cdot \\vec{E} &= \\frac{\\rho}{\\epsilon_0} \\\\
\\nabla \\cdot \\vec{B} &= 0 \\\\
\\nabla \\times \\vec{E} &= -\\frac{\\partial \\vec{B}}{\\partial t} \\\\
\\nabla \\times \\vec{B} &= \\mu_0\\vec{J} + \\mu_0\\epsilon_0\\frac{\\partial \\vec{E}}{\\partial t}
\\end{aligned}`
  },
  {
    title: 'Schrödinger Equation',
    latex: 'i\\hbar\\frac{\\partial}{\\partial t}\\Psi(\\vec{r},t) = \\hat{H}\\Psi(\\vec{r},t)'
  },
  {
    title: 'Einstein Field Equations',
    latex: 'R_{\\mu\\nu} - \\frac{1}{2}Rg_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4}T_{\\mu\\nu}'
  },
  {
    title: 'Matrix Example',
    latex: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix} \\begin{bmatrix} x \\\\ y \\end{bmatrix} = \\begin{bmatrix} ax+by \\\\ cx+dy \\end{bmatrix}'
  },
]

export default function LaTeXDemoPage() {
  const router = useRouter()
  const [activeExample, setActiveExample] = useState(0)
  const [customLatex, setCustomLatex] = useState('')

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <MobileNav />
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <header className="mb-6 md:mb-8">
          <button
            onClick={() => router.push('/')}
            className="px-3 py-2 text-gray-700 hover:text-gray-900 flex items-center gap-2 mb-4 active:scale-95 transition-transform"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm sm:text-base">Back to Home</span>
          </button>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            LaTeX Math Rendering Demo
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Test and learn how to use mathematical notation in PhysiScaffold
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Examples & Editor */}
          <div className="space-y-6">
            {/* Demo Examples */}
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Example Equations</h2>

              {/* Example Selector */}
              <div className="flex flex-wrap gap-2 mb-4">
                {DEMO_EXAMPLES.map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveExample(idx)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      activeExample === idx
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              {/* Active Example */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">{DEMO_EXAMPLES[activeExample].title}</h3>

                {/* LaTeX Source */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs font-semibold text-gray-600 mb-2">LaTeX Source:</div>
                  <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-words">
                    {`$$${DEMO_EXAMPLES[activeExample].latex}$$`}
                  </pre>
                </div>

                {/* Rendered Output */}
                <div className="bg-white rounded-lg p-4 border border-gray-300">
                  <div className="text-xs font-semibold text-gray-600 mb-2">Rendered:</div>
                  <MathRenderer text={`$$${DEMO_EXAMPLES[activeExample].latex}$$`} />
                </div>
              </div>
            </div>

            {/* Custom Editor */}
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Try It Yourself</h2>
              <LaTeXEditor
                initialValue={customLatex}
                onChange={setCustomLatex}
                placeholder="Enter your LaTeX equation..."
                showPreview={true}
                minHeight="120px"
              />
            </div>
          </div>

          {/* Right Column - Help */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Quick Reference</h2>
              <LaTeXHelp />
            </div>

            {/* Features */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow-lg p-4 sm:p-6 border-2 border-blue-200">
              <h2 className="text-lg font-bold text-gray-900 mb-3">✨ Enhanced Features</h2>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span><strong>Copy Button:</strong> Hover over equations to copy LaTeX source</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span><strong>Error Handling:</strong> Clear error messages for invalid LaTeX</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span><strong>Mobile Optimized:</strong> Responsive rendering on all devices</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span><strong>Templates:</strong> Quick insert for common patterns</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span><strong>Greek Letters:</strong> One-click insertion of symbols</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span><strong>Live Preview:</strong> See your equation as you type</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
