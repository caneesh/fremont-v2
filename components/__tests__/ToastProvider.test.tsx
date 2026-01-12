import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ToastProvider, useToast } from '@/components/ui/ToastProvider'

function Harness() {
  const { pushToast, confirm } = useToast()
  return (
    <div>
      <button
        onClick={() => pushToast({ title: 'Hi', message: 'Toast message', durationMs: 1000 })}
      >
        toast
      </button>
      <button
        onClick={async () => {
          const result = await confirm({ title: 'Confirm', message: 'Are you sure?' })
          pushToast({ message: result ? 'confirmed' : 'canceled', durationMs: 0 })
        }}
      >
        confirm
      </button>
    </div>
  )
}

describe('ToastProvider', () => {
  it('renders and auto-dismisses toasts', async () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'toast' }))
    expect(screen.getByText('Toast message')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(1100)
    })

    expect(screen.queryByText('Toast message')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('shows confirm modal and resolves true/false', async () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'confirm' }))
    })
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    })
    expect(screen.getByText('confirmed')).toBeInTheDocument()
  })
})
