import { fireEvent, render, waitFor } from '@testing-library/preact'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const curriculumViewMocks = vi.hoisted(() => {
  return {
    panBy: vi.fn<(dx: number, dy: number) => void>(),
    resetViewport: vi.fn<() => void>(),
    zoomBy: vi.fn<(delta: number) => void>(),
  }
})

vi.mock('../components/CurriculumView', () => {
  return {
    __mocks: curriculumViewMocks,
    CurriculumView: (props: {
      onCourseMoved?: (courseId: string, newSemesterId: string) => void
      onRegisterResetViewport?: (reset: (() => void) | null) => void
      onRegisterPanBy?: (panBy: ((dx: number, dy: number) => void) | null) => void
      onRegisterZoomBy?: (zoomBy: ((delta: number) => void) | null) => void
    }) => (
      <div>
        <button
          type="button"
          onClick={() => {
            props.onRegisterResetViewport?.(curriculumViewMocks.resetViewport)
            props.onRegisterPanBy?.(curriculumViewMocks.panBy)
            props.onRegisterZoomBy?.(curriculumViewMocks.zoomBy)
            props.onCourseMoved?.('C1', 's1')
          }}
        >
          Simulate move
        </button>
      </div>
    ),
  }
})

describe('CurriculumApp', () => {
  beforeEach(() => {
    curriculumViewMocks.panBy.mockClear()
    curriculumViewMocks.resetViewport.mockClear()
    curriculumViewMocks.zoomBy.mockClear()
  })

  function buildCurriculumJson() {
    return JSON.stringify({
      curriculumId: 'mechanical-engineering-bs',
      name: 'MSU B.S. in Mechanical Engineering',
      totalCredits: 0,
      semesters: [{ id: 's1', name: 'Semester 1', order: 1 }],
      courses: [
        {
          id: 'C1',
          name: 'Course 1',
          credits: 3,
          semesterId: 's1',
          prerequisiteIds: [],
          corequisiteIds: [],
          trackId: 't1',
        },
      ],
      tracks: [{ id: 't1', name: 'Track One' }],
    })
  }

  it('defaults the Save prompt filename to the last loaded filename (Load BSME)', async () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('bs-me.json')

    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    const curriculumJson = buildCurriculumJson()

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(curriculumJson, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const { CurriculumApp } = await import('../components/CurriculumApp')

    const { getByRole, getByText } = render(<CurriculumApp />)

    fireEvent.click(getByRole('button', { name: 'Load BSME' }))

    await waitFor(() => {
      expect(getByText('Loaded bs-me.json.')).toBeInTheDocument()
    })

    fireEvent.click(getByRole('button', { name: 'Simulate move' }))

    const saveButton = getByRole('button', { name: 'Save' })
    await waitFor(() => {
      expect(saveButton).toBeEnabled()
    })

    fireEvent.click(saveButton)

    expect(promptSpy).toHaveBeenCalledWith('Save curriculum as:', 'bs-me.json')

    fetchSpy.mockRestore()
    promptSpy.mockRestore()
    createObjectURLSpy.mockRestore()
    revokeObjectURLSpy.mockRestore()
  })

  it('disables Save until a course has been moved', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(buildCurriculumJson(), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const { CurriculumApp } = await import('../components/CurriculumApp')
    const { getByRole, getByText } = render(<CurriculumApp />)

    fireEvent.click(getByRole('button', { name: 'Load BSME' }))
    await waitFor(() => {
      expect(getByText('Loaded bs-me.json.')).toBeInTheDocument()
    })

    expect(getByRole('button', { name: 'Save' })).toBeDisabled()

    fireEvent.click(getByRole('button', { name: 'Simulate move' }))
    await waitFor(() => {
      expect(getByRole('button', { name: 'Save' })).toBeEnabled()
    })

    fetchSpy.mockRestore()
  })

  it('cancels save when prompt is dismissed', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(buildCurriculumJson(), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null)
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')

    const { CurriculumApp } = await import('../components/CurriculumApp')
    const { getByRole, getByText } = render(<CurriculumApp />)

    fireEvent.click(getByRole('button', { name: 'Load BSME' }))
    await waitFor(() => {
      expect(getByText('Loaded bs-me.json.')).toBeInTheDocument()
    })

    fireEvent.click(getByRole('button', { name: 'Simulate move' }))
    const saveButton = getByRole('button', { name: 'Save' })
    await waitFor(() => {
      expect(saveButton).toBeEnabled()
    })

    fireEvent.click(saveButton)

    expect(promptSpy).toHaveBeenCalledWith('Save curriculum as:', 'bs-me.json')
    expect(createObjectURLSpy).not.toHaveBeenCalled()
    expect(getByText('Save canceled.')).toBeInTheDocument()

    fetchSpy.mockRestore()
    promptSpy.mockRestore()
    createObjectURLSpy.mockRestore()
  })

  it('sanitizes the requested save filename and appends .json when missing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(buildCurriculumJson(), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('foo/bar')
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    const originalCreateElement = document.createElement.bind(document)
    let lastAnchor: Element | null = null
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((
      tagName: string,
    ) => {
      const el = originalCreateElement(tagName) as HTMLElement
      if (tagName.toLowerCase() === 'a') {
        lastAnchor = el
        ;(el as HTMLAnchorElement).click = vi.fn()
      }
      return el
    }) as unknown as typeof document.createElement)

    const { CurriculumApp } = await import('../components/CurriculumApp')
    const { getByRole, getByText } = render(<CurriculumApp />)

    fireEvent.click(getByRole('button', { name: 'Load BSME' }))
    await waitFor(() => {
      expect(getByText('Loaded bs-me.json.')).toBeInTheDocument()
    })

    fireEvent.click(getByRole('button', { name: 'Simulate move' }))
    const saveButton = getByRole('button', { name: 'Save' })
    await waitFor(() => {
      expect(saveButton).toBeEnabled()
    })

    fireEvent.click(saveButton)
    const anchor = lastAnchor
    if (anchor == null) {
      throw new Error('Expected a download anchor element to be created')
    }
    expect((anchor as HTMLAnchorElement).getAttribute('download')).toBe('foo-bar.json')

    fetchSpy.mockRestore()
    promptSpy.mockRestore()
    createObjectURLSpy.mockRestore()
    revokeObjectURLSpy.mockRestore()
    createElementSpy.mockRestore()
  })

  it('defaults Save prompt filename to the filename loaded via file input', async () => {
    const originalFileReader = globalThis.FileReader

    class MockFileReader {
      result: string | ArrayBuffer | null = null
      onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null

      readAsText(_file: Blob) {
        // jsdom's File isn't an extension of a real Blob, so we fake it
        Promise.resolve(buildCurriculumJson())
          .then((text) => {
            this.result = text
            this.onload?.call(
              this as unknown as FileReader,
              new ProgressEvent('load') as unknown as ProgressEvent<FileReader>,
            )
          })
          .catch(() => {})
      }
    }

    const globalWithFileReader = globalThis as unknown as { FileReader: typeof FileReader }
    globalWithFileReader.FileReader = MockFileReader as unknown as typeof FileReader

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('my-upload.json')
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    const { CurriculumApp } = await import('../components/CurriculumApp')
    const { container, getByRole, getByText } = render(<CurriculumApp />)

    const input = container.querySelector('#file-input') as HTMLInputElement
    const file = new File([buildCurriculumJson()], 'my-upload.json', { type: 'application/json' })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(getByText('Loaded my-upload.json.')).toBeInTheDocument()
    })

    fireEvent.click(getByRole('button', { name: 'Simulate move' }))
    const saveButton = getByRole('button', { name: 'Save' })
    await waitFor(() => {
      expect(saveButton).toBeEnabled()
    })

    fireEvent.click(saveButton)
    expect(promptSpy).toHaveBeenCalledWith('Save curriculum as:', 'my-upload.json')

    promptSpy.mockRestore()
    createObjectURLSpy.mockRestore()
    revokeObjectURLSpy.mockRestore()
    globalThis.FileReader = originalFileReader
  })

  it('returns focus to the help button when the dialog is closed', async () => {
    const { CurriculumApp } = await import('../components/CurriculumApp')
    const { getByRole, queryByRole } = render(<CurriculumApp />)

    const helpButton = getByRole('button', { name: 'Help' })
    fireEvent.click(helpButton)

    await waitFor(() => {
      expect(getByRole('dialog', { name: 'Help' })).toBeInTheDocument()
    })

    fireEvent.click(getByRole('button', { name: 'Close' }))

    await waitFor(() => {
      expect(queryByRole('dialog', { name: 'Help' })).toBeNull()
      expect(document.activeElement).toBe(helpButton)
    })
  })

  it('wires pan controls to CurriculumView onRegisterPanBy', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(buildCurriculumJson(), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const { CurriculumApp } = await import('../components/CurriculumApp')
    const { getByRole, getByText } = render(<CurriculumApp />)

    fireEvent.click(getByRole('button', { name: 'Load BSME' }))
    await waitFor(() => {
      expect(getByText('Loaded bs-me.json.')).toBeInTheDocument()
    })

    fireEvent.click(getByRole('button', { name: 'Simulate move' }))

    fireEvent.click(getByRole('button', { name: 'Pan up' }))
    expect(curriculumViewMocks.panBy).toHaveBeenCalledWith(0, 80)

    fireEvent.click(getByRole('button', { name: 'Pan left' }))
    expect(curriculumViewMocks.panBy).toHaveBeenCalledWith(80, 0)

    fireEvent.click(getByRole('button', { name: 'Pan right' }))
    expect(curriculumViewMocks.panBy).toHaveBeenCalledWith(-80, 0)

    fireEvent.click(getByRole('button', { name: 'Pan down' }))
    expect(curriculumViewMocks.panBy).toHaveBeenCalledWith(0, -80)

    fetchSpy.mockRestore()
  })

  it('wires Reset button to CurriculumView onRegisterResetViewport', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(buildCurriculumJson(), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const { CurriculumApp } = await import('../components/CurriculumApp')
    const { getByRole, getByText } = render(<CurriculumApp />)

    fireEvent.click(getByRole('button', { name: 'Load BSME' }))
    await waitFor(() => {
      expect(getByText('Loaded bs-me.json.')).toBeInTheDocument()
    })

    fireEvent.click(getByRole('button', { name: 'Simulate move' }))
    fireEvent.click(getByRole('button', { name: 'Reset' }))

    expect(curriculumViewMocks.resetViewport).toHaveBeenCalledTimes(1)

    fetchSpy.mockRestore()
  })

  it('wires zoom controls to CurriculumView onRegisterZoomBy', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(buildCurriculumJson(), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const { CurriculumApp } = await import('../components/CurriculumApp')
    const { getByRole, getByText } = render(<CurriculumApp />)

    fireEvent.click(getByRole('button', { name: 'Load BSME' }))
    await waitFor(() => {
      expect(getByText('Loaded bs-me.json.')).toBeInTheDocument()
    })

    fireEvent.click(getByRole('button', { name: 'Simulate move' }))

    fireEvent.click(getByRole('button', { name: '+' }))
    expect(curriculumViewMocks.zoomBy).toHaveBeenCalledWith(0.1)

    fireEvent.click(getByRole('button', { name: '-' }))
    expect(curriculumViewMocks.zoomBy).toHaveBeenCalledWith(-0.1)

    fetchSpy.mockRestore()
  })
})
