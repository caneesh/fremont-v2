import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AuthGate from '../AuthGate'
import { ThemeProvider } from '@/lib/ThemeContext'
import { ToastProvider } from '@/components/ui/ToastProvider'

const push = vi.fn()
const replace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => '/study-path',
  useSearchParams: () => new URLSearchParams(),
}))

describe('AuthGate', () => {
  beforeEach(() => {
    push.mockClear()
    replace.mockClear()
    localStorage.clear()

    // ThemeProvider depends on matchMedia.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
  })

  const renderWithProviders = (ui: React.ReactNode) => {
    return render(
      <ThemeProvider>
        <ToastProvider>{ui}</ToastProvider>
      </ThemeProvider>
    )
  }

  it('shows login when no session exists', () => {
    renderWithProviders(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>
    )

    expect(screen.getByLabelText('Access Code')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Access PhysiScaffold' })).toBeInTheDocument()
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })

  it('rejects invalid access codes', () => {
    renderWithProviders(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>
    )

    fireEvent.change(screen.getByLabelText('Access Code'), { target: { value: 'NOT-A-REAL-CODE' } })
    fireEvent.click(screen.getByRole('button', { name: 'Access PhysiScaffold' }))

    expect(screen.getByText(/Invalid access code/i)).toBeInTheDocument()
    expect(localStorage.getItem('physiscaffold_session')).toBeNull()
  })

  it('accepts a valid access code and shows the welcome modal', () => {
    renderWithProviders(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>
    )

    fireEvent.change(screen.getByLabelText('Access Code'), { target: { value: 'PILOT-ALPHA-001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Access PhysiScaffold' }))

    expect(screen.getByText(/Welcome,\s*Pilot User 1/i)).toBeInTheDocument()
    expect(localStorage.getItem('physiscaffold_session')).toContain('PILOT-ALPHA-001')

    fireEvent.click(screen.getByRole('button', { name: 'Go to Study Dashboard' }))
    expect(push).toHaveBeenCalledWith('/study-path')
  })

  it('renders children when session exists', () => {
    localStorage.setItem(
      'physiscaffold_session',
      JSON.stringify({
        userId: 'user-001',
        code: 'PILOT-ALPHA-001',
        authenticatedAt: new Date().toISOString(),
      })
    )

    renderWithProviders(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>
    )

    expect(screen.getAllByText('Protected content').length).toBeGreaterThan(0)
  })
})
