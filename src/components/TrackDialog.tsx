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
    <div id="track-dialog" className="track-dialog" role="dialog" aria-label="Help">
      <div className="track-dialog-header">
        <h2 className="track-dialog-title">Help</h2>
        <button type="button" className="close-button" onClick={onClose} aria-label="Close">
          X
        </button>
      </div>

      <div className="track-dialog-tabs">
        <input type="radio" name="track-dialog-tabset" id="track-dialog-tab-info" defaultChecked />
        <label htmlFor="track-dialog-tab-info">General info</label>

        <input type="radio" name="track-dialog-tabset" id="track-dialog-tab-legend" />
        <label htmlFor="track-dialog-tab-legend">Track legend</label>

        <div className="track-dialog-tab-panels">
          <section className="track-dialog-panel">
            <div className="track-dialog-info">
              <div>
                Load a curriculum JSON to view and edit a curriculum. (The{' '}
                <span style={{ fontWeight: 'bold' }}>Load BSME</span> button loads a sample
                curriculum that is the Montana State University BS in Mechanical Engineering
                curriculum)
              </div>
              <div>
                Drag courses to move them between semesters, then use Save JSON to download changes.
              </div>
              <div>Use + and - buttons, or finger pinch gestures to zoom.</div>
            </div>

            <div className="legend">
              <h3>Legend</h3>
              <span className="legend-item">
                <span className="legend-line" />
                Prerequisite
              </span>
              <span className="legend-item">
                <span className="legend-line coreq" />
                Corequisite
              </span>
            </div>
          </section>

          <section className="track-dialog-panel">
            {!curriculum && (
              <div className="track-dialog-empty">Load a curriculum to see tracks.</div>
            )}

            {curriculum && trackInfo && (
              <div className="track-dialog-grid">
                {trackInfo.trackOrder.map((trackId) => {
                  const color = getTrackColor(trackInfo, trackId)
                  return (
                    <div
                      key={trackId}
                      className="track-dialog-row"
                      style={{ backgroundColor: color }}
                    >
                      <span
                        className="track-swatch"
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                      />
                      <span className="track-id">
                        {trackInfo.trackNameById[trackId] ?? trackId}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
