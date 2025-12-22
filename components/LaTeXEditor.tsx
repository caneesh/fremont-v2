'use client'

import { useState } from 'react'
import MathRenderer from './MathRenderer'

interface LaTeXEditorProps {
  initialValue?: string
  onChange?: (value: string) => void
  placeholder?: string
  showPreview?: boolean
  minHeight?: string
}

const LATEX_TEMPLATES = [
  { label: 'Fraction', latex: '\\frac{a}{b}', description: 'a/b' },
  { label: 'Square Root', latex: '\\sqrt{x}', description: '√x' },
  { label: 'Power', latex: 'x^{n}', description: 'xⁿ' },
  { label: 'Subscript', latex: 'x_{i}', description: 'xᵢ' },
  { label: 'Sum', latex: '\\sum_{i=1}^{n}', description: 'Σ' },
  { label: 'Integral', latex: '\\int_{a}^{b}', description: '∫' },
  { label: 'Limit', latex: '\\lim_{x \\to \\infty}', description: 'lim' },
  { label: 'Vector', latex: '\\vec{v}', description: 'v⃗' },
  { label: 'Matrix', latex: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}', description: '[matrix]' },
  { label: 'Derivative', latex: '\\frac{d}{dx}', description: 'd/dx' },
]

const GREEK_LETTERS = [
  { symbol: 'α', latex: '\\alpha' },
  { symbol: 'β', latex: '\\beta' },
  { symbol: 'γ', latex: '\\gamma' },
  { symbol: 'δ', latex: '\\delta' },
  { symbol: 'ε', latex: '\\epsilon' },
  { symbol: 'θ', latex: '\\theta' },
  { symbol: 'λ', latex: '\\lambda' },
  { symbol: 'μ', latex: '\\mu' },
  { symbol: 'π', latex: '\\pi' },
  { symbol: 'σ', latex: '\\sigma' },
  { symbol: 'τ', latex: '\\tau' },
  { symbol: 'φ', latex: '\\phi' },
  { symbol: 'ω', latex: '\\omega' },
  { symbol: 'Δ', latex: '\\Delta' },
  { symbol: 'Σ', latex: '\\Sigma' },
  { symbol: 'Ω', latex: '\\Omega' },
]

export default function LaTeXEditor({
  initialValue = '',
  onChange,
  placeholder = 'Enter LaTeX equation... (e.g., E = mc^2)',
  showPreview = true,
  minHeight = '100px'
}: LaTeXEditorProps) {
  const [value, setValue] = useState(initialValue)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showGreek, setShowGreek] = useState(false)

  const handleChange = (newValue: string) => {
    setValue(newValue)
    onChange?.(newValue)
  }

  const insertTemplate = (latex: string) => {
    const textarea = document.getElementById('latex-input') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = value.substring(0, start) + latex + value.substring(end)
      handleChange(newValue)

      // Set cursor position after inserted text
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + latex.length, start + latex.length)
      }, 0)
    }
  }

  const wrapInMath = (inline = true) => {
    const wrapper = inline ? '$' : '$$'
    const newValue = `${wrapper}${value}${wrapper}`
    handleChange(newValue)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center border-b border-gray-200 pb-3">
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 active:scale-95 transition-all"
        >
          📐 Templates
        </button>
        <button
          onClick={() => setShowGreek(!showGreek)}
          className="px-3 py-1.5 text-sm bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 active:scale-95 transition-all"
        >
          Σ Greek
        </button>
        <div className="h-4 w-px bg-gray-300" />
        <button
          onClick={() => wrapInMath(true)}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 active:scale-95 transition-all"
          title="Wrap in inline math ($...$)"
        >
          $ Inline
        </button>
        <button
          onClick={() => wrapInMath(false)}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 active:scale-95 transition-all"
          title="Wrap in display math ($$...$$)"
        >
          $$ Display
        </button>
      </div>

      {/* Templates Panel */}
      {showTemplates && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          {LATEX_TEMPLATES.map((template) => (
            <button
              key={template.label}
              onClick={() => insertTemplate(template.latex)}
              className="p-2 bg-white rounded border border-blue-200 hover:border-blue-400 hover:bg-blue-50 active:scale-95 transition-all text-left"
            >
              <div className="text-xs font-semibold text-blue-900">{template.label}</div>
              <div className="text-xs text-gray-600 mt-1">{template.description}</div>
            </button>
          ))}
        </div>
      )}

      {/* Greek Letters Panel */}
      {showGreek && (
        <div className="flex flex-wrap gap-1 p-3 bg-purple-50 rounded-lg border border-purple-200">
          {GREEK_LETTERS.map((letter) => (
            <button
              key={letter.latex}
              onClick={() => insertTemplate(letter.latex)}
              className="w-10 h-10 bg-white rounded border border-purple-200 hover:border-purple-400 hover:bg-purple-50 active:scale-95 transition-all flex items-center justify-center text-lg font-serif"
              title={letter.latex}
            >
              {letter.symbol}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div>
        <textarea
          id="latex-input"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-y"
          style={{ minHeight }}
        />
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <div>
            Use <code className="bg-gray-100 px-1 rounded">$...$</code> for inline or <code className="bg-gray-100 px-1 rounded">$$...$$</code> for display math
          </div>
          <div>{value.length} chars</div>
        </div>
      </div>

      {/* Preview */}
      {showPreview && value && (
        <div className="border border-gray-300 rounded-lg p-4 bg-white">
          <div className="text-xs font-semibold text-gray-600 mb-2">Preview:</div>
          <MathRenderer text={value} />
        </div>
      )}
    </div>
  )
}
