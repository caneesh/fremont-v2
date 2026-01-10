import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProblemInput from '../ProblemInput'

describe('ProblemInput', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('loads a sample problem and submits it', () => {
    const onSubmit = vi.fn()

    render(<ProblemInput onSubmit={onSubmit} isLoading={false} error={null} />)

    fireEvent.click(screen.getByRole('button', { name: /Bead on a Rotating Hoop/i }))

    const textarea = screen.getByLabelText('Problem Statement') as HTMLTextAreaElement
    expect(textarea.value).toMatch(/frictionless circular hoop/i)

    fireEvent.click(screen.getByRole('button', { name: 'Generate Solution Scaffold' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const [problem, diagramImage, density, includeFinalAnswer] = onSubmit.mock.calls[0]
    expect(problem).toMatch(/frictionless circular hoop/i)
    expect(diagramImage).toBeNull()
    expect(density).toBe(3)
    expect(includeFinalAnswer).toBe(false)
  })

  it('shows a validation error when the problem is too short', () => {
    const onSubmit = vi.fn()

    render(<ProblemInput onSubmit={onSubmit} isLoading={false} error={null} />)

    fireEvent.change(screen.getByLabelText('Problem Statement'), { target: { value: 'Too short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Generate Solution Scaffold' }))

    expect(screen.getByText(/Problem is too short/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('scan mode uploads an image and populates extracted text', async () => {
    // Seed auth session (ProblemInput includes Authorization header)
    localStorage.setItem(
      'physiscaffold_session',
      JSON.stringify({
        userId: 'user-001',
        code: 'PILOT-ALPHA-001',
        authenticatedAt: new Date().toISOString(),
      })
    )

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ extractedText: 'A block slides down an incline. Find acceleration.' }),
    })
    vi.stubGlobal('fetch', fetchMock as any)

    class MockFileReader {
      onload: ((event: any) => void) | null = null
      onerror: (() => void) | null = null
      readAsDataURL() {
        this.onload?.({ target: { result: 'data:image/png;base64,AAAA' } })
      }
    }
    vi.stubGlobal('FileReader', MockFileReader as any)

    const onSubmit = vi.fn()
    const { container } = render(<ProblemInput onSubmit={onSubmit} isLoading={false} error={null} />)

    fireEvent.click(screen.getByRole('button', { name: 'Scan' }))

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement | null
    expect(fileInput).toBeTruthy()

    const file = new File(['fake'], 'problem.png', { type: 'image/png' })
    fireEvent.change(fileInput!, { target: { files: [file] } })

    expect(await screen.findByText('Problem extracted successfully!')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/extract-problem',
      expect.objectContaining({ method: 'POST' })
    )

    fireEvent.click(screen.getByRole('button', { name: /Edit Text/i }))

    const extractedTextarea = screen.getByLabelText('Problem Statement') as HTMLTextAreaElement
    expect(extractedTextarea.value).toMatch(/block slides down an incline/i)
  })
})
