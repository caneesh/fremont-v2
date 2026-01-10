import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FeatureExplorerPage from '@/app/features/page'
import FeatureFlagsPage from '@/app/features/flags/page'
import DebugFeaturesPage from '@/app/debug/features/page'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/features',
  useSearchParams: () => new URLSearchParams(),
}))

describe('Feature pages', () => {
  beforeEach(() => {
    push.mockClear()
    localStorage.clear()
  })

  it('Feature Explorer renders and can search', () => {
    render(<FeatureExplorerPage />)

    expect(screen.getByRole('heading', { name: 'Feature Explorer', level: 1 })).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Search features...'), { target: { value: 'mistake' } })
    expect(screen.getByText('Mistake Notebook')).toBeInTheDocument()
  })

  it('Feature Explorer can toggle Routes Only filter', () => {
    render(<FeatureExplorerPage />)

    const button = screen.getByRole('button', { name: 'Routes Only' })
    fireEvent.click(button)
    expect(button.className).toMatch(/bg-accent/)
  })

  it('Feature Flags page renders and shows flags', () => {
    render(<FeatureFlagsPage />)

    expect(screen.getByRole('heading', { name: 'Feature Flags Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('DASHBOARD_V3')).toBeInTheDocument()
  })

  it('Debug Feature Flags can set and clear overrides', async () => {
    render(<DebugFeaturesPage />)

    expect(await screen.findByRole('heading', { name: 'Debug: Feature Flags' })).toBeInTheDocument()

    const onButtons = screen.getAllByRole('button', { name: 'ON' })
    fireEvent.click(onButtons[0])
    expect(screen.getByRole('button', { name: /Clear All Overrides/i })).toBeInTheDocument()

    const stored = localStorage.getItem('physiscaffold_feature_overrides')
    expect(stored).toBeTruthy()

    const clearButton = screen.getByRole('button', { name: /Clear All Overrides/i })
    fireEvent.click(clearButton)

    expect(localStorage.getItem('physiscaffold_feature_overrides')).toBe('{}')
    expect(screen.queryByRole('button', { name: /Clear All Overrides/i })).not.toBeInTheDocument()
  })
})
