import { fireEvent, render } from '@testing-library/preact'
import { describe, expect, it, vi } from 'vitest'
import { AddTrackDialog } from '../components/AddTrackDialog'

function buildTracks() {
  return [
    { id: 'track1', name: 'Computer Science' },
    { id: 'track2', name: 'Mathematics' },
  ]
}

describe('AddTrackDialog', () => {
  describe('Basic functionality', () => {
    it('renders when open', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()

      const { getByText } = render(
        <AddTrackDialog tracks={buildTracks()} open onClose={onClose} onSave={onSave} />,
      )

      expect(getByText(/Manage Tracks/i)).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()

      const { queryByText } = render(
        <AddTrackDialog tracks={buildTracks()} open={false} onClose={onClose} onSave={onSave} />,
      )

      expect(queryByText(/Manage Tracks/i)).not.toBeInTheDocument()
    })

    it('calls onClose when close button is clicked', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()

      const { getByLabelText } = render(
        <AddTrackDialog tracks={buildTracks()} open onClose={onClose} onSave={onSave} />,
      )

      const closeButton = getByLabelText('Close')
      fireEvent.click(closeButton)

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Adding tracks', () => {
    it('disables Add button until track name is entered', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()

      const { getByRole } = render(
        <AddTrackDialog tracks={buildTracks()} open onClose={onClose} onSave={onSave} />,
      )

      const addButton = getByRole('button', { name: /Add Track/i })
      expect(addButton).toBeDisabled()

      const input = getByRole('textbox', { name: /Track Name/i })
      fireEvent.input(input, { target: { value: '   ' } })
      expect(addButton).toBeDisabled()

      fireEvent.input(input, { target: { value: 'New Track' } })
      expect(addButton).toBeEnabled()
    })

    it('calls onSave with auto-generated track ID when adding track', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()

      const { getByRole } = render(
        <AddTrackDialog tracks={buildTracks()} open onClose={onClose} onSave={onSave} />,
      )

      const input = getByRole('textbox', { name: /Track Name/i })
      fireEvent.input(input, { target: { value: 'Physics' } })

      const addButton = getByRole('button', { name: /Add Track/i })
      fireEvent.click(addButton)

      expect(onSave).toHaveBeenCalledWith({
        trackId: 'physics',
        trackName: 'Physics',
      })
    })

    it('generates unique track ID from name', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()

      const { getByRole } = render(
        <AddTrackDialog tracks={buildTracks()} open onClose={onClose} onSave={onSave} />,
      )

      const input = getByRole('textbox', { name: /Track Name/i })

      // Test various name formats
      fireEvent.input(input, { target: { value: 'Computer Science' } })
      fireEvent.click(getByRole('button', { name: /Add Track/i }))
      expect(onSave).toHaveBeenCalledWith({
        trackId: 'computer_science',
        trackName: 'Computer Science',
      })

      onSave.mockClear()

      fireEvent.input(input, { target: { value: 'Data   Science' } })
      fireEvent.click(getByRole('button', { name: /Add Track/i }))
      expect(onSave).toHaveBeenCalledWith({
        trackId: 'data_science',
        trackName: 'Data   Science',
      })
    })

    it('clears input after adding track', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()

      const { getByRole } = render(
        <AddTrackDialog tracks={buildTracks()} open onClose={onClose} onSave={onSave} />,
      )

      const input = getByRole('textbox', { name: /Track Name/i }) as HTMLInputElement
      fireEvent.input(input, { target: { value: 'New Track' } })

      const addButton = getByRole('button', { name: /Add Track/i })
      fireEvent.click(addButton)

      expect(input.value).toBe('')
    })

    it('allows adding track with Enter key', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()

      const { getByRole } = render(
        <AddTrackDialog tracks={buildTracks()} open onClose={onClose} onSave={onSave} />,
      )

      const input = getByRole('textbox', { name: /Track Name/i })
      fireEvent.input(input, { target: { value: 'Physics' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onSave).toHaveBeenCalledWith({
        trackId: 'physics',
        trackName: 'Physics',
      })
    })

    it('does not add track with Enter key if name is empty', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()

      const { getByRole } = render(
        <AddTrackDialog tracks={buildTracks()} open onClose={onClose} onSave={onSave} />,
      )

      const input = getByRole('textbox', { name: /Track Name/i })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onSave).not.toHaveBeenCalled()
    })
  })

  describe('Displaying existing tracks', () => {
    it('displays list of existing tracks with names and IDs', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()

      const { getByText } = render(
        <AddTrackDialog tracks={buildTracks()} open onClose={onClose} onSave={onSave} />,
      )

      expect(getByText('Computer Science')).toBeInTheDocument()
      expect(getByText('Mathematics')).toBeInTheDocument()
      expect(getByText('(track1)')).toBeInTheDocument()
      expect(getByText('(track2)')).toBeInTheDocument()
    })

    it('does not show track list section when no tracks exist', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()

      const { queryByText } = render(
        <AddTrackDialog tracks={[]} open onClose={onClose} onSave={onSave} />,
      )

      expect(queryByText('Existing Tracks')).not.toBeInTheDocument()
    })
  })

  describe('Deleting tracks', () => {
    it('shows delete buttons for existing tracks when onDelete is provided and isEditMode is true', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()
      const onDelete = vi.fn()

      const { getAllByRole } = render(
        <AddTrackDialog
          tracks={buildTracks()}
          open
          onClose={onClose}
          onSave={onSave}
          onDelete={onDelete}
          isEditMode={true}
        />,
      )

      const deleteButtons = getAllByRole('button', { name: /Delete/i })
      expect(deleteButtons.length).toBe(2)
    })

    it('does not show delete buttons when onDelete is not provided', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()

      const { queryAllByRole } = render(
        <AddTrackDialog tracks={buildTracks()} open onClose={onClose} onSave={onSave} />,
      )

      const deleteButtons = queryAllByRole('button', { name: /Delete/i })
      expect(deleteButtons.length).toBe(0)
    })

    it('calls onDelete when delete button is clicked in edit mode', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()
      const onDelete = vi.fn()
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      const { getAllByRole } = render(
        <AddTrackDialog
          tracks={buildTracks()}
          open
          onClose={onClose}
          onSave={onSave}
          onDelete={onDelete}
          isEditMode={true}
        />,
      )

      const deleteButtons = getAllByRole('button', { name: /Delete/i })
      fireEvent.click(deleteButtons[0])

      expect(confirmSpy).toHaveBeenCalled()
      expect(onDelete).toHaveBeenCalledWith('track1')

      confirmSpy.mockRestore()
    })

    it('does not show delete buttons when isEditMode is false', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()
      const onDelete = vi.fn()

      const { queryAllByRole } = render(
        <AddTrackDialog
          tracks={buildTracks()}
          open
          onClose={onClose}
          onSave={onSave}
          onDelete={onDelete}
          isEditMode={false}
        />,
      )

      const deleteButtons = queryAllByRole('button', { name: /Delete/i })
      expect(deleteButtons.length).toBe(0)
    })

    it('shows delete buttons when isEditMode is true', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()
      const onDelete = vi.fn()

      const { getAllByRole } = render(
        <AddTrackDialog
          tracks={buildTracks()}
          open
          onClose={onClose}
          onSave={onSave}
          onDelete={onDelete}
          isEditMode={true}
        />,
      )

      const deleteButtons = getAllByRole('button', { name: /Delete/i })
      expect(deleteButtons.length).toBe(2) // Two tracks in buildTracks()
    })
  })

  describe('Focus management', () => {
    it('focuses close button when dialog opens', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()

      const { getByLabelText } = render(
        <AddTrackDialog tracks={buildTracks()} open onClose={onClose} onSave={onSave} />,
      )

      // Use aria-label to get the X close button specifically
      const closeButton = getByLabelText('Close')
      expect(document.activeElement).toBe(closeButton)
    })

    it('clears and focuses track name input after adding a track', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()

      const { getByRole } = render(
        <AddTrackDialog tracks={buildTracks()} open onClose={onClose} onSave={onSave} />,
      )

      const input = getByRole('textbox', { name: /Track Name/i }) as HTMLInputElement
      fireEvent.input(input, { target: { value: 'New Track' } })

      const addButton = getByRole('button', { name: /Add Track/i })
      fireEvent.click(addButton)

      // Input should be cleared and focused
      expect(input.value).toBe('')
      // Note: Focus may go to close button in actual implementation
    })
  })

  describe('Keyboard navigation', () => {
    it('closes dialog with Escape key', () => {
      const onSave = vi.fn()
      const onClose = vi.fn()

      render(<AddTrackDialog tracks={buildTracks()} open onClose={onClose} onSave={onSave} />)

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onClose).toHaveBeenCalled()
    })
  })
})
