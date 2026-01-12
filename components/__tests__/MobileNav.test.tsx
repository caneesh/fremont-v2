import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileNav from '../MobileNav'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

describe('MobileNav', () => {
  it('opens menu and navigates to a route', () => {
    render(<MobileNav />)

    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }))
    expect(screen.getByText('Navigation')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Study Path' }))
    expect(push).toHaveBeenCalledWith('/study-path')
  })
})

