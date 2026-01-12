import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Sidebar from '../Sidebar'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

describe('Sidebar', () => {
  it('highlights active route and navigates on click', () => {
    render(<Sidebar currentPath="/study-path" onLogout={() => {}} />)

    const dashboardButton = screen.getByRole('button', { name: 'Dashboard' })
    expect(dashboardButton.className).toMatch(/bg-accent\/10/)

    fireEvent.click(screen.getByRole('button', { name: 'Solve' }))
    expect(push).toHaveBeenCalledWith('/solve')
  })
})

