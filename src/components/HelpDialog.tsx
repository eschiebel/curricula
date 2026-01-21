import type { JSX } from 'preact'
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { Curriculum } from './CurriculumGraph'
import { getCurriculumTrackInfo, getTrackColor } from './CurriculumGraph'

const tabOrder = ['info', 'legend', 'tracks', 'a11y'] as const
type TabId = (typeof tabOrder)[number]

export interface HelpDialogProps {
  curriculum: Curriculum | null
  open: boolean
  onClose: () => void
}

export function HelpDialog(props: HelpDialogProps) {
  const { curriculum, open, onClose } = props

  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const [activeTab, setActiveTab] = useState<TabId>('info')

  const tabButtonRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    info: null,
    legend: null,
    tracks: null,
    a11y: null,
  })

  const trackInfo = useMemo(() => {
    if (!curriculum) return null
    return getCurriculumTrackInfo(curriculum)
  }, [curriculum])

  useEffect(() => {
    if (!open) return
    closeButtonRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    setActiveTab('info')
  }, [open])

  const focusAndActivateTab = useCallback((tabId: TabId) => {
    tabButtonRefs.current[tabId]?.focus()
    setActiveTab(tabId)
  }, [])

  const onTabKeyDown = useCallback(
    (currentTab: TabId) => (event: JSX.TargetedKeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        const index = tabOrder.indexOf(currentTab)
        const nextTab = tabOrder[(index + 1) % tabOrder.length]
        focusAndActivateTab(nextTab)
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        const index = tabOrder.indexOf(currentTab)
        const nextTab = tabOrder[(index - 1 + tabOrder.length) % tabOrder.length]
        focusAndActivateTab(nextTab)
      }
    },
    [focusAndActivateTab],
  )

  if (!open) return null

  const renderGeneralInfo = () => {
    return (
      <div className="help-dialog-info">
        <div>
          Load a curriculum JSON to view and edit a curriculum. (The{' '}
          <span style={{ fontWeight: 'bold' }}>Load BSME</span> button loads a sample curriculum
          that is the '25-'26 Montana State University B.S. in Mechanical Engineering curriculum)
        </div>
        <ul style={{ paddingLeft: '1em' }}>
          <li>
            Drag courses to move them between semesters, then use Save JSON to download changes.
          </li>
          <li>Use + and - buttons to zoom.</li>
          <li>Use the arrow buttons to pan.</li>
          <li>The Reset button resets zoom abnd pan.</li>
        </ul>
      </div>
    )
  }

  const renderCurriculumLegend = () => {
    return (
      <div className="legend">
        <div className="nodes">
          <span className="legend-item">
            <span className="legend-node">box with a solid border</span>
            Course
          </span>
          <span className="legend-item">
            <span className="legend-node moved">box with a dashed border</span>
            Course has been moved
          </span>
          <span className="legend-item">
            <span className="legend-node selected">box with a thick orange border</span>
            Course is selected
          </span>
          <span className="legend-item">
            <span className="legend-node violation">
              box with a thick red border and a crosshatched background
            </span>
            Course violates pre or corequisites
          </span>
        </div>

        <div className="edges">
          <span className="legend-item">
            <svg
              width="33"
              height="6.6"
              viewBox="0 0 100 20"
              xmlns="http://www.w3.org/2000/svg"
              stroke="#2c3e50"
              fill="#2c3e50"
              strokeWidth="3"
            >
              <title>arrow with solid line</title>
              <line x1="0" y1="10" x2="90" y2="10" />
              <polygon points="90,5 100,10 90,15" />
            </svg>
            Prerequisite
          </span>
          <span className="legend-item">
            <svg
              width="33"
              height="6.6"
              viewBox="0 0 100 20"
              xmlns="http://www.w3.org/2000/svg"
              stroke="#2c3e50"
              fill="#2c3e50"
              strokeWidth="3"
            >
              <title>arrow with dotted line</title>
              <line x1="0" y1="10" x2="90" y2="10" strokeDasharray="4,4" />
              <polygon points="90,5 100,10 90,15" />
            </svg>
            Corequisite
          </span>
          <span className="legend-item">
            <svg
              width="33"
              height="6.6"
              viewBox="0 0 100 20"
              xmlns="http://www.w3.org/2000/svg"
              stroke="#c0392b"
              fill="#c0392b"
              strokeWidth="3"
            >
              <title>red arrow with tick mark</title>
              <line x1="0" y1="10" x2="90" y2="10" />
              <polygon points="90,5 100,10 90,15" />
              <line x1="80" y1="5" x2="80" y2="15" />
            </svg>
            Violation
          </span>
        </div>
      </div>
    )
  }

  const renderTrackLegend = () => {
    if (!(curriculum && trackInfo)) {
      return <div className="help-dialog-empty">Load a curriculum to see tracks.</div>
    }

    return (
      <div className="help-dialog-grid">
        {trackInfo.trackOrder.map((trackId) => {
          const color = getTrackColor(trackInfo, trackId)
          return (
            <div key={trackId} className="help-dialog-row" style={{ backgroundColor: color }}>
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
    )
  }

  const renderA11yHelp = () => {
    return (
      <div className="help-dialog-a11y">
        <p>Use the tab key to navigate between semesters.</p>
        <p>Use the up and down arrow keys to navigate between courses within a semester.</p>
        <p>Use shift-right or left arrow keys to move a course to the next or previous semester.</p>
      </div>
    )
  }

  return (
    <div id="help-dialog" className="help-dialog" role="dialog" aria-label="Help">
      <div className="help-dialog-header">
        <h2 className="help-dialog-title">Help</h2>
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

      <div className="help-dialog-tabs" role="tablist" aria-label="Help">
        <button
          ref={(el) => {
            tabButtonRefs.current.info = el
          }}
          type="button"
          id="help-dialog-tab-info"
          role="tab"
          aria-selected={activeTab === 'info'}
          aria-controls="help-dialog-panel-info"
          tabIndex={activeTab === 'info' ? 0 : -1}
          onKeyDown={onTabKeyDown('info')}
          onClick={() => focusAndActivateTab('info')}
        >
          General
        </button>

        <button
          ref={(el) => {
            tabButtonRefs.current.legend = el
          }}
          type="button"
          id="help-dialog-tab-legend"
          role="tab"
          aria-selected={activeTab === 'legend'}
          aria-controls="help-dialog-panel-legend"
          tabIndex={activeTab === 'legend' ? 0 : -1}
          onKeyDown={onTabKeyDown('legend')}
          onClick={() => focusAndActivateTab('legend')}
        >
          Legend
        </button>

        <button
          ref={(el) => {
            tabButtonRefs.current.tracks = el
          }}
          type="button"
          id="help-dialog-tab-tracks"
          role="tab"
          aria-selected={activeTab === 'tracks'}
          aria-controls="help-dialog-panel-tracks"
          tabIndex={activeTab === 'tracks' ? 0 : -1}
          onKeyDown={onTabKeyDown('tracks')}
          onClick={() => focusAndActivateTab('tracks')}
        >
          Tracks
        </button>

        <button
          ref={(el) => {
            tabButtonRefs.current.a11y = el
          }}
          type="button"
          id="help-dialog-tab-a11y"
          role="tab"
          aria-selected={activeTab === 'a11y'}
          aria-controls="help-dialog-panel-a11y"
          tabIndex={activeTab === 'a11y' ? 0 : -1}
          onKeyDown={onTabKeyDown('a11y')}
          onClick={() => focusAndActivateTab('a11y')}
        >
          Accessibility
        </button>

        <div className="help-dialog-tab-panels">
          <section
            id="help-dialog-panel-info"
            className="help-dialog-panel"
            role="tabpanel"
            tabIndex={activeTab === 'info' ? 0 : -1}
            aria-labelledby="help-dialog-tab-info"
            aria-hidden={activeTab !== 'info'}
          >
            {renderGeneralInfo()}
          </section>

          <section
            id="help-dialog-panel-legend"
            className="help-dialog-panel"
            role="tabpanel"
            tabIndex={activeTab === 'legend' ? 0 : -1}
            aria-labelledby="help-dialog-tab-legend"
            aria-hidden={activeTab !== 'legend'}
          >
            {renderCurriculumLegend()}
          </section>

          <section
            id="help-dialog-panel-tracks"
            className="help-dialog-panel"
            role="tabpanel"
            tabIndex={activeTab === 'tracks' ? 0 : -1}
            aria-labelledby="help-dialog-tab-tracks"
            aria-hidden={activeTab !== 'tracks'}
          >
            {renderTrackLegend()}
          </section>

          <section
            id="help-dialog-panel-a11y"
            className="help-dialog-panel"
            role="tabpanel"
            tabIndex={activeTab === 'a11y' ? 0 : -1}
            aria-labelledby="help-dialog-tab-a11y"
            aria-hidden={activeTab !== 'a11y'}
          >
            {renderA11yHelp()}
          </section>
        </div>
      </div>
    </div>
  )
}
