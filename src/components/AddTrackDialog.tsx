import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import type { JSX } from 'preact'
import type { TrackDefinition } from './CurriculumGraph'

export interface AddTrackDialogProps {
  tracks: TrackDefinition[]
  open: boolean
  onClose: () => void
  onSave: (args: { trackId: string; trackName: string }) => void
  onDelete?: (trackId: string) => void
  isEditMode?: boolean
}

export function AddTrackDialog(props: AddTrackDialogProps) {
  const { tracks, open, onClose, onSave, onDelete, isEditMode } = props

  const dialogRef = useRef<HTMLDivElement>(null)
  const trackIdInputRef = useRef<HTMLInputElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const saveButtonRef = useRef<HTMLButtonElement>(null)
  const [trackName, setTrackName] = useState<string>('')

  useEffect(() => {
    if (!open) return
    setTrackName('')
  }, [open])

  useEffect(() => {
    if (!open) return
    closeButtonRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key === 'Tab') {
        if (!dialogRef.current) return

        const focusableElements = dialogRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
        )
        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  const handleSave = useCallback(() => {
    const trimmedTrackName = trackName.trim()

    if (trimmedTrackName.length === 0) return

    // Generate track ID from track name
    const trackId = trimmedTrackName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')

    onSave({ trackId, trackName: trimmedTrackName })
    setTrackName('')
  }, [trackName, onSave])

  const handleTrackNameKeyDown = useCallback(
    (event: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        handleSave()
      }
    },
    [handleSave],
  )

  const handleDeleteTrack = useCallback(
    (id: string) => {
      if (!onDelete) return
      const confirmed = window.confirm(
        `Are you sure you want to delete track "${id}"? This will fail if any courses use this track.`,
      )
      if (confirmed) {
        onDelete(id)
      }
    },
    [onDelete],
  )

  if (!open) return null

  const canSave = trackName.trim().length > 0

  const trackList = Array.isArray(tracks)
    ? tracks.flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return []

        if ('id' in entry && 'name' in entry) {
          const maybeId = (entry as { id?: unknown }).id
          const maybeName = (entry as { name?: unknown }).name
          if (typeof maybeId === 'string' && typeof maybeName === 'string') {
            return [{ id: maybeId, name: maybeName }]
          }
          return []
        }

        return Object.entries(entry as Record<string, unknown>)
          .filter(([k, v]) => typeof k === 'string' && typeof v === 'string')
          .map(([k, v]) => ({ id: k, name: v as string }))
      })
    : []

  return (
    <div ref={dialogRef} className="add-semester-dialog" role="dialog" aria-label="Add Track">
      <div className="add-semester-dialog-header">
        <h2 className="add-semester-dialog-title">Manage Tracks</h2>
        <button
          ref={closeButtonRef}
          type="button"
          className="close-button"
          onClick={onClose}
          aria-label="Close"
        >
          X
        </button>
      </div>

      <div className="add-semester-dialog-body">
        <div className="add-track-dialog-form">
          <h3 style={{ marginTop: 0, fontSize: '14px' }}>Add New Track</h3>
          <div className="add-course-dialog-field">
            <label htmlFor="track-name-input">
              Track Name<sup aria-hidden="true">*</sup>
            </label>
            <input
              ref={trackIdInputRef}
              id="track-name-input"
              type="text"
              required={true}
              value={trackName}
              onInput={(e) => setTrackName((e.currentTarget as HTMLInputElement).value)}
              onKeyDown={handleTrackNameKeyDown}
              placeholder="e.g., Core Engineering"
            />
          </div>

          <button
            ref={saveButtonRef}
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            style={{ marginTop: '8px' }}
          >
            Add Track
          </button>
        </div>

        {trackList.length > 0 && (
          <div className="track-list" style={{ marginTop: '16px' }}>
            <h3 style={{ fontSize: '14px' }}>Existing Tracks</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {trackList.map((track) => (
                <li
                  key={track.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px',
                    borderBottom: '1px solid #e0e0e0',
                  }}
                >
                  <div>
                    <strong>{track.name}</strong>
                  </div>
                  {onDelete && isEditMode && (
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDeleteTrack(track.id)}
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="add-semester-dialog-actions" style={{ marginTop: '16px' }}>
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
