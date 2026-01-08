'use client'

/**
 * CodeEditor Component
 *
 * Simple code editor with syntax highlighting styling.
 * Uses a textarea with monospace font and code-friendly styling.
 */

import { useRef, useCallback } from 'react'

interface CodeEditorProps {
  code: string
  onChange: (code: string) => void
  language?: string
  readOnly?: boolean
}

export function CodeEditor({
  code,
  onChange,
  language = 'javascript',
  readOnly = false,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Handle tab key for indentation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        const textarea = e.currentTarget
        const start = textarea.selectionStart
        const end = textarea.selectionEnd

        // Insert tab at cursor position
        const newValue =
          code.substring(0, start) + '  ' + code.substring(end)
        onChange(newValue)

        // Restore cursor position
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2
        })
      }
    },
    [code, onChange]
  )

  return (
    <div className="relative">
      {/* Language badge */}
      <div className="absolute right-2 top-2 z-10">
        <span className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
          {language}
        </span>
      </div>

      {/* Editor */}
      <textarea
        ref={textareaRef}
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        readOnly={readOnly}
        spellCheck={false}
        className={`
          h-80 w-full resize-none rounded-lg border
          bg-gray-900 p-4 font-mono text-sm text-gray-100
          ${
            readOnly
              ? 'cursor-not-allowed border-gray-700 opacity-75'
              : 'border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
          }
        `}
        style={{
          tabSize: 2,
          lineHeight: '1.6',
        }}
      />

      {/* Read-only overlay indicator */}
      {readOnly && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          <span className="rounded-lg bg-black/50 px-3 py-1.5 text-sm text-white">
            Read-only (understand the code first)
          </span>
        </div>
      )}

      {/* Line count indicator */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-500">
        {code.split('\n').length} lines
      </div>
    </div>
  )
}
