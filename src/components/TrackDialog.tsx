import { useMemo } from 'preact/hooks'
import type { Curriculum } from './CurriculumGraph'
import { getCurriculumTrackInfo, getTrackColor } from './CurriculumGraph'

export interface TrackDialogProps {
  curriculum: Curriculum | null
  open: boolean
  onClose: () => void
}

export function TrackDialog(props: TrackDialogProps) {
  const { curriculum, open, onClose } = props

  const trackInfo = useMemo(() => {
    if (!curriculum) return null
    return getCurriculumTrackInfo(curriculum)
  }, [curriculum])

  if (!open) return null

  return (
    <div id="track-dialog" className="track-dialog" role="dialog" aria-label="Track legend">
      <div className="track-dialog-header">
        <div className="track-dialog-title">Track legend</div>
        <button
          type="button"
          className="secondary"
          onClick={onClose}
          aria-label="Close track legend"
        >
          Close
        </button>
      </div>

      {!curriculum && <div className="track-dialog-empty">Load a curriculum to see tracks.</div>}

      {curriculum && trackInfo && (
        <div className="track-dialog-grid">
          {trackInfo.trackOrder.map((trackId) => {
            const color = getTrackColor(trackInfo, trackId)
            return (
              <div key={trackId} className="track-dialog-row" style={{ backgroundColor: color }}>
                <span
                  className="track-swatch"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="track-id">{trackInfo.trackNameById[trackId] ?? trackId}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
