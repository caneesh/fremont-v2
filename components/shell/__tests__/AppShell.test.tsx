import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const sidebarSpy = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => '/solve',
}))

vi.mock('../Sidebar', () => ({
  default: (props: any) => {
    sidebarSpy(props)
    return <div data-testid="sidebar" />
  },
}))

vi.mock('../TopBar', () => ({ default: () => <div data-testid="topbar" /> }))
vi.mock('../BottomNavV2', () => ({ default: () => <div data-testid="bottomnav" /> }))
vi.mock('../MoreMenu', () => ({ default: () => <div data-testid="moremenu" /> }))

describe('AppShell', () => {
  beforeEach(() => {
    sidebarSpy.mockClear()
  })

  it('collapses sidebar on /solve', async () => {
    const { default: AppShell } = await import('../AppShell')

    render(
      <AppShell userName="Tester" onLogout={() => {}}>
        <div>content</div>
      </AppShell>
    )

    expect(screen.getAllByText('content').length).toBeGreaterThan(0)
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(sidebarSpy).toHaveBeenCalled()
    expect(sidebarSpy.mock.calls[0][0].collapsed).toBe(true)
  })
})

