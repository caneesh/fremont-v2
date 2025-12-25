'use client'

import { useEffect, useCallback } from 'react'

interface ShortcutConfig {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[], enabled: boolean = true) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Exception: Allow Ctrl+Enter in textareas
      if (!(event.ctrlKey && event.key === 'Enter')) {
        return
      }
    }

    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
      const ctrlMatch = !!shortcut.ctrlKey === event.ctrlKey
      const shiftMatch = !!shortcut.shiftKey === event.shiftKey
      const altMatch = !!shortcut.altKey === event.altKey

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault()
        shortcut.action()
        return
      }
    }
  }, [shortcuts])

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])
}

export const SHORTCUTS = {
  SUBMIT: { key: 'Enter', ctrlKey: true, description: 'Submit problem' },
  NEW_PROBLEM: { key: 'n', description: 'New problem' },
  SHOW_SHORTCUTS: { key: '?', shiftKey: true, description: 'Show shortcuts' },
  HISTORY: { key: 'h', description: 'Go to history' },
  STUDY_PATH: { key: 's', description: 'Go to study path' },
  NETWORK: { key: 'c', description: 'Go to concept network' },
}
