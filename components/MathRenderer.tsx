'use client'

import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

interface MathRendererProps {
  text: string
  className?: string
}

export default function MathRenderer({ text, className = '' }: MathRendererProps) {
  // Split text into parts: regular text and LaTeX expressions
  // Supports both inline $...$ and display $$...$$ math
  const renderText = (text: string) => {
    const parts: JSX.Element[] = []
    let currentIndex = 0
    let key = 0

    // Regex to match $$...$$ (display math) or $...$ (inline math)
    const mathRegex = /(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g
    let match

    while ((match = mathRegex.exec(text)) !== null) {
      // Add text before the math
      if (match.index > currentIndex) {
        parts.push(
          <span key={`text-${key++}`}>
            {text.slice(currentIndex, match.index)}
          </span>
        )
      }

      // Add the math
      const mathText = match[0]
      if (mathText.startsWith('$$') && mathText.endsWith('$$')) {
        // Display math
        const latex = mathText.slice(2, -2).trim()
        parts.push(
          <span key={`math-${key++}`} className="block my-4">
            <BlockMath math={latex} />
          </span>
        )
      } else if (mathText.startsWith('$') && mathText.endsWith('$')) {
        // Inline math
        const latex = mathText.slice(1, -1).trim()
        parts.push(
          <span key={`math-${key++}`} className="inline-block mx-1">
            <InlineMath math={latex} />
          </span>
        )
      }

      currentIndex = match.index + mathText.length
    }

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(
        <span key={`text-${key++}`}>
          {text.slice(currentIndex)}
        </span>
      )
    }

    return parts
  }

  return (
    <div className={`text-gray-800 leading-relaxed ${className}`}>
      {renderText(text)}
    </div>
  )
}
