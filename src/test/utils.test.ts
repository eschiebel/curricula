import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { showScreenreaderAlert } from '../utils'

describe('showScreenreaderAlert', () => {
  let liveRegion: HTMLDivElement

  beforeEach(() => {
    liveRegion = document.createElement('div')
    liveRegion.id = 'screenreader-alert'
    document.body.appendChild(liveRegion)
    vi.useFakeTimers()
  })

  afterEach(() => {
    if (document.getElementById('screenreader-alert')) {
      document.body.removeChild(liveRegion)
    }
    vi.useRealTimers()
  })

  // ── Case 1: valid input ────────────────────────────────────────────────

  it('appends a div containing the message text after a short delay', () => {
    showScreenreaderAlert('Hello, world!')
    vi.runAllTimers()
    const child = liveRegion.querySelector('div')
    expect(child).not.toBeNull()
    expect(child?.textContent).toBe('Hello, world!')
  })

  it('results in exactly one child node after a single call', () => {
    showScreenreaderAlert('Single message')
    vi.runAllTimers()
    expect(liveRegion.childNodes.length).toBe(1)
  })

  // ── Case 2: invalid input / error handling ─────────────────────────────

  it('does not throw when the #screenreader-alert element does not exist', () => {
    document.body.removeChild(liveRegion)
    expect(() => {
      showScreenreaderAlert('Missing element')
      vi.runAllTimers()
    }).not.toThrow()
    // Re-add so afterEach cleanup does not error
    document.body.appendChild(liveRegion)
  })

  // ── Case 3: edge cases ─────────────────────────────────────────────────

  it('handles an empty string message without error', () => {
    showScreenreaderAlert('')
    vi.runAllTimers()
    const child = liveRegion.querySelector('div')
    expect(child).not.toBeNull()
    expect(child?.textContent).toBe('')
  })

  it('clears existing children synchronously before scheduling the new message', () => {
    const old = document.createElement('div')
    old.textContent = 'stale message'
    liveRegion.appendChild(old)

    showScreenreaderAlert('fresh message')

    // Clearing happens synchronously; timeout has not fired yet
    expect(liveRegion.childNodes.length).toBe(0)

    vi.runAllTimers()
    expect(liveRegion.textContent).toBe('fresh message')
  })

  it('appends messages in call order when called in rapid succession', () => {
    showScreenreaderAlert('first')
    showScreenreaderAlert('second')
    vi.runAllTimers()
    const divs = liveRegion.querySelectorAll('div')
    expect(divs[divs.length - 1].textContent).toBe('second')
  })

  // ── Case 5: integration ────────────────────────────────────────────────

  it('creates a proper DOM node that is accessible via standard querySelector', () => {
    showScreenreaderAlert('Accessible message')
    vi.runAllTimers()
    const found = document.querySelector('#screenreader-alert div')
    expect(found).not.toBeNull()
    expect(found?.textContent).toBe('Accessible message')
  })
})
