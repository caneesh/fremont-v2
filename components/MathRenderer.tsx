'use client'

import { useState } from 'react'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

interface MathRendererProps {
  text: string
  className?: string
  enableCopy?: boolean
  showErrors?: boolean
}

export default function MathRenderer({
  text,
  className = '',
  enableCopy = true,
  showErrors = true
}: MathRendererProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyToClipboard = async (latex: string, index: number) => {
    try {
      await navigator.clipboard.writeText(latex)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Enhanced regex to handle more LaTeX patterns
  // Supports: $$...$$ (display), $...$ (inline), \[...\] (display), \(...\) (inline)
  const mathRegex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^\$\n]+?\$|\\\([\s\S]+?\\\))/g

  const renderMathBlock = (latex: string, key: number, isDisplay: boolean) => {
    try {
      const Component = isDisplay ? BlockMath : InlineMath
      const isCopied = copiedIndex === key

      return (
        <span
          key={`math-${key}`}
          className={`relative group ${isDisplay ? 'block my-4' : 'inline-block mx-1'}`}
        >
          <div className={`
            ${isDisplay ? 'bg-slate-50 rounded-lg p-4 overflow-x-auto' : ''}
            ${isDisplay ? 'border border-slate-200' : ''}
          `}>
            <Component math={latex} />
          </div>

          {/* Copy button for display math */}
          {enableCopy && isDisplay && (
            <button
              onClick={() => copyToClipboard(latex, key)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 active:scale-95 shadow-sm"
              title="Copy LaTeX"
            >
              {isCopied ? (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </span>
              )}
            </button>
          )}
        </span>
      )
    } catch (error) {
      if (showErrors) {
        return (
          <span
            key={`math-error-${key}`}
            className={`
              ${isDisplay ? 'block my-4 p-4' : 'inline-block mx-1 px-2 py-1'}
              bg-red-50 border border-red-200 rounded text-red-700 text-sm
            `}
          >
            <span className="font-semibold">LaTeX Error: </span>
            <code className="bg-red-100 px-1 rounded">{latex}</code>
          </span>
        )
      }
      return <span key={`math-error-${key}`}>{isDisplay ? `$$${latex}$$` : `$${latex}$`}</span>
    }
  }

  const renderText = (text: string) => {
    const parts: JSX.Element[] = []
    let currentIndex = 0
    let key = 0
    let match

    const regex = new RegExp(mathRegex)

    while ((match = regex.exec(text)) !== null) {
      // Add text before the math
      if (match.index > currentIndex) {
        const textContent = text.slice(currentIndex, match.index)
        parts.push(
          <span key={`text-${key++}`} className="whitespace-pre-wrap">
            {textContent}
          </span>
        )
      }

      // Determine math type and extract LaTeX
      const mathText = match[0]
      let latex: string
      let isDisplay: boolean

      if (mathText.startsWith('$$') && mathText.endsWith('$$')) {
        latex = mathText.slice(2, -2).trim()
        isDisplay = true
      } else if (mathText.startsWith('\\[') && mathText.endsWith('\\]')) {
        latex = mathText.slice(2, -2).trim()
        isDisplay = true
      } else if (mathText.startsWith('$') && mathText.endsWith('$')) {
        latex = mathText.slice(1, -1).trim()
        isDisplay = false
      } else if (mathText.startsWith('\\(') && mathText.endsWith('\\)')) {
        latex = mathText.slice(2, -2).trim()
        isDisplay = false
      } else {
        currentIndex = match.index + mathText.length
        continue
      }

      parts.push(renderMathBlock(latex, key++, isDisplay))
      currentIndex = match.index + mathText.length
    }

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(
        <span key={`text-${key++}`} className="whitespace-pre-wrap">
          {text.slice(currentIndex)}
        </span>
      )
    }

    return parts.length > 0 ? parts : [<span key="empty">{text}</span>]
  }

  return (
    <div className={`text-gray-800 leading-relaxed ${className}`}>
      {renderText(text)}
    </div>
  )
}
