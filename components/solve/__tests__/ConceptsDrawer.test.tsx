import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConceptsDrawer from '../ConceptsDrawer'
import type { Concept } from '@/types/scaffold'

// Mock MathRenderer to avoid KaTeX issues in tests
vi.mock('../../MathRenderer', () => ({
  default: ({ text }: { text: string }) => <span>{text}</span>,
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

const mockConcepts: Concept[] = [
  {
    id: 'concept-1',
    name: 'Newton\'s Second Law',
    definition: 'F = ma, the relationship between force, mass, and acceleration.',
    formula: 'F = ma',
  },
  {
    id: 'concept-2',
    name: 'Conservation of Energy',
    definition: 'Energy cannot be created or destroyed, only transformed.',
    formula: 'E_total = KE + PE',
  },
]

describe('ConceptsDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders collapsed button with concept count', () => {
    render(<ConceptsDrawer concepts={mockConcepts} />)

    const toggleButton = screen.getByTestId('concepts-drawer-toggle')
    expect(toggleButton).toBeDefined()
    expect(toggleButton.textContent).toContain('Concepts (2)')
  })

  it('opens drawer when toggle button is clicked', async () => {
    render(<ConceptsDrawer concepts={mockConcepts} />)

    const toggleButton = screen.getByTestId('concepts-drawer-toggle')
    fireEvent.click(toggleButton)

    const panel = screen.getByTestId('concepts-drawer-panel')
    expect(panel).toBeDefined()
    expect(panel.textContent).toContain('Concept Inventory')
  })

  it('displays all concepts in the drawer', () => {
    render(<ConceptsDrawer concepts={mockConcepts} forceOpen={true} />)

    expect(screen.getByText('Newton\'s Second Law')).toBeDefined()
    expect(screen.getByText('Conservation of Energy')).toBeDefined()
  })

  it('expands concept to show definition when clicked', () => {
    render(<ConceptsDrawer concepts={mockConcepts} forceOpen={true} />)

    const conceptButton = screen.getByText('Newton\'s Second Law')
    fireEvent.click(conceptButton)

    expect(screen.getByText(/F = ma, the relationship/)).toBeDefined()
  })

  it('shows formula when concept is expanded', () => {
    render(<ConceptsDrawer concepts={mockConcepts} forceOpen={true} />)

    const conceptButton = screen.getByText('Newton\'s Second Law')
    fireEvent.click(conceptButton)

    expect(screen.getByText('Formula:')).toBeDefined()
    expect(screen.getByText('F = ma')).toBeDefined()
  })

  it('persists drawer state to localStorage', () => {
    render(<ConceptsDrawer concepts={mockConcepts} />)

    const toggleButton = screen.getByTestId('concepts-drawer-toggle')
    fireEvent.click(toggleButton)

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'solve_concepts_drawer_open',
      'true'
    )
  })

  it('loads persisted drawer state on mount', () => {
    localStorageMock.getItem.mockReturnValue('true')

    render(<ConceptsDrawer concepts={mockConcepts} />)

    // Drawer should be open based on localStorage
    const panel = screen.getByTestId('concepts-drawer-panel')
    expect(panel.classList.contains('translate-x-full')).toBe(false)
  })

  it('calls onToggle callback when drawer state changes', () => {
    const onToggle = vi.fn()
    render(<ConceptsDrawer concepts={mockConcepts} onToggle={onToggle} />)

    const toggleButton = screen.getByTestId('concepts-drawer-toggle')
    fireEvent.click(toggleButton)

    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it('closes drawer when close button is clicked', () => {
    render(<ConceptsDrawer concepts={mockConcepts} forceOpen={true} />)

    // Get the close button inside the panel (the X button, not the toggle button)
    const panel = screen.getByTestId('concepts-drawer-panel')
    const closeButton = panel.querySelector('button[aria-label="Close concepts drawer"]')
    expect(closeButton).toBeDefined()

    if (closeButton) {
      fireEvent.click(closeButton)
    }

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'solve_concepts_drawer_open',
      'false'
    )
  })

  it('closes drawer when backdrop is clicked', () => {
    render(<ConceptsDrawer concepts={mockConcepts} forceOpen={true} />)

    const backdrop = document.querySelector('[aria-hidden="true"]')
    expect(backdrop).toBeDefined()

    if (backdrop) {
      fireEvent.click(backdrop)
    }

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'solve_concepts_drawer_open',
      'false'
    )
  })

  it('respects forceOpen prop', () => {
    const { rerender } = render(
      <ConceptsDrawer concepts={mockConcepts} forceOpen={false} />
    )

    // Initially closed
    expect(
      screen.getByTestId('concepts-drawer-panel').classList.contains('translate-x-full')
    ).toBe(true)

    // Force open
    rerender(<ConceptsDrawer concepts={mockConcepts} forceOpen={true} />)

    expect(
      screen.getByTestId('concepts-drawer-panel').classList.contains('translate-x-0')
    ).toBe(true)
  })
})
