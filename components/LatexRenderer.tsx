'use client'

import MathRenderer from './MathRenderer'

interface LatexRendererProps {
  content: string
  className?: string
}

/**
 * Alias for MathRenderer with 'content' prop for compatibility
 */
export default function LatexRenderer({ content, className }: LatexRendererProps) {
  return <MathRenderer text={content} className={className} />
}
