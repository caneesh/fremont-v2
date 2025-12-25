'use client'

interface KeyboardShortcutsHelpProps {
  isOpen: boolean
  onClose: () => void
}

const shortcuts = [
  { keys: ['Ctrl', 'Enter'], description: 'Submit problem' },
  { keys: ['N'], description: 'New problem' },
  { keys: ['H'], description: 'Go to history' },
  { keys: ['S'], description: 'Go to study path' },
  { keys: ['C'], description: 'Go to concept network' },
  { keys: ['?'], description: 'Show this help' },
  { keys: ['Esc'], description: 'Close dialogs' },
]

export default function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-4 space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-gray-700">{shortcut.description}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <span key={keyIndex}>
                    <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono text-gray-700 shadow-sm">
                      {key}
                    </kbd>
                    {keyIndex < shortcut.keys.length - 1 && (
                      <span className="mx-1 text-gray-400">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 rounded-b-xl border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  )
}
