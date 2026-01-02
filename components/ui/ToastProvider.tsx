'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

type ToastVariant = 'info' | 'success' | 'warning' | 'error'

export interface ToastOptions {
  title?: string
  message: string
  variant?: ToastVariant
  durationMs?: number
  actionLabel?: string
  onAction?: () => void
}

interface Toast extends ToastOptions {
  id: string
}

export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
}

interface ConfirmState extends Required<Pick<ConfirmOptions, 'message'>> {
  title?: string
  confirmText: string
  cancelText: string
  destructive: boolean
  resolve: (value: boolean) => void
}

interface ToastContextValue {
  pushToast: (options: ToastOptions) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ToastContext = createContext<ToastContextValue | null>(null)

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const confirmStateRef = useRef<ConfirmState | null>(null)

  useEffect(() => {
    confirmStateRef.current = confirmState
  }, [confirmState])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const pushToast = useCallback((options: ToastOptions) => {
    const id = generateId('toast')
    const toast: Toast = {
      id,
      variant: options.variant ?? 'info',
      durationMs: options.durationMs ?? 4500,
      ...options,
    }

    setToasts(prev => [toast, ...prev].slice(0, 4))

    if ((toast.durationMs ?? 0) > 0) {
      window.setTimeout(() => {
        removeToast(id)
      }, toast.durationMs)
    }
  }, [removeToast])

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        title: options.title,
        message: options.message,
        confirmText: options.confirmText ?? 'Confirm',
        cancelText: options.cancelText ?? 'Cancel',
        destructive: options.destructive ?? false,
        resolve,
      })
    })
  }, [])

  const value = useMemo<ToastContextValue>(() => ({ pushToast, confirm }), [pushToast, confirm])

  const closeConfirm = useCallback((result: boolean) => {
    const current = confirmStateRef.current
    if (!current) return
    current.resolve(result)
    setConfirmState(null)
  }, [])

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast stack */}
      <div className="fixed top-4 right-4 z-[1000] w-[calc(100%-2rem)] max-w-sm space-y-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl border shadow-lg dark:shadow-dark-lg p-4 bg-white dark:bg-dark-card ${
              t.variant === 'success'
                ? 'border-green-200 dark:border-green-900/40'
                : t.variant === 'warning'
                ? 'border-amber-200 dark:border-amber-900/40'
                : t.variant === 'error'
                ? 'border-red-200 dark:border-red-900/40'
                : 'border-gray-200 dark:border-dark-border'
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                t.variant === 'success'
                  ? 'bg-green-500'
                  : t.variant === 'warning'
                  ? 'bg-amber-500'
                  : t.variant === 'error'
                  ? 'bg-red-500'
                  : 'bg-blue-500'
              }`} />
              <div className="flex-1 min-w-0">
                {t.title && (
                  <p className="text-sm font-semibold text-gray-900 dark:text-dark-text-primary">
                    {t.title}
                  </p>
                )}
                <p className="text-sm text-gray-700 dark:text-dark-text-secondary">
                  {t.message}
                </p>
                {(t.actionLabel && t.onAction) && (
                  <button
                    onClick={() => {
                      try {
                        t.onAction?.()
                      } finally {
                        removeToast(t.id)
                      }
                    }}
                    className="mt-2 text-sm font-medium text-accent hover:underline"
                  >
                    {t.actionLabel}
                  </button>
                )}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary"
                aria-label="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Confirm modal */}
      {confirmState && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/70"
            onClick={() => closeConfirm(false)}
          />
          <div className="relative w-full max-w-md rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-2xl dark:shadow-dark-lg">
            <div className="p-5">
              {confirmState.title && (
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                  {confirmState.title}
                </h3>
              )}
              <p className="mt-2 text-sm text-gray-700 dark:text-dark-text-secondary">
                {confirmState.message}
              </p>
            </div>
            <div className="px-5 pb-5 flex items-center justify-end gap-3">
              <button
                onClick={() => closeConfirm(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-dark-card-soft text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
              >
                {confirmState.cancelText}
              </button>
              <button
                onClick={() => closeConfirm(true)}
                className={`px-4 py-2 rounded-lg text-white transition-colors ${
                  confirmState.destructive
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-accent hover:bg-accent-strong'
                }`}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (ctx) {
    return {
      pushToast: ctx.pushToast,
      confirm: ctx.confirm,
    }
  }

  // Fallback for tests or edge usage outside the provider.
  return {
    pushToast: (options: ToastOptions) => {
      if (typeof window === 'undefined') return
      const title = options.title ? `${options.title}\n\n` : ''
      window.alert(`${title}${options.message}`)
    },
    confirm: async (options: ConfirmOptions) => {
      if (typeof window === 'undefined') return false
      const title = options.title ? `${options.title}\n\n` : ''
      return window.confirm(`${title}${options.message}`)
    },
  }
}
