// oxlint-disable no-comments/no-comments -- Vitest requires this DOM environment metadata, not application prose.

// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom

// oxlint-enable no-comments/no-comments -- Resume comment policy after the required test metadata.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { observeCalendarExits } from '../src/calendar-view/exits.js'
import { EXIT_COMPLETE_EVENT } from '../src/motion-target.js'
import { Observation } from '../src/calendar-view/state.js'

const complete = (node: HTMLElement) => node.dispatchEvent(new Event(EXIT_COMPLETE_EVENT))

const fixture = () => {
  const element = document.createElement('div')
  document.body.append(element)
  const observations: Array<Observation> = []

  const exits = observeCalendarExits(element, window, (value) => {
    observations.push(value)
  })

  element.addEventListener(EXIT_COMPLETE_EVENT, exits.exited, true)

  const panel = (key: string) => {
    const node = document.createElement('div')
    node.dataset.calendarPanel = key
    node.dataset.calendarPresent = 'false'
    element.append(node)

    return node
  }

  return { element, observations, exits, panel }
}

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('Calendar presence retirement', () => {
  it('does not postpone committed-end cleanup when a later replacement creates a ghost', () => {
    vi.useFakeTimers()
    const { element, exits, observations } = fixture()
    element.dataset.calendarCommittedEnd = 'true'
    element.dataset.calendarCommittedEndGeneration = '1'
    exits.scan()
    vi.advanceTimersByTime(80)
    element.dataset.calendarGhost = 'true'
    element.dataset.calendarGhostGeneration = '1'
    exits.scan()
    vi.advanceTimersByTime(140)
    expect(observations).toEqual([Observation.cases.CommittedEndSettled.make({ generation: 1 })])
    vi.advanceTimersByTime(80)
    expect(observations).toEqual([
      Observation.cases.CommittedEndSettled.make({ generation: 1 }),
      Observation.cases.GhostSettled.make({ generation: 1 }),
    ])
    exits.dispose()
  })

  it('restarts only the replaced decoration and cancels both clocks on disposal', () => {
    vi.useFakeTimers()
    const { element, exits, observations } = fixture()
    element.dataset.calendarCommittedEnd = 'true'
    element.dataset.calendarCommittedEndGeneration = '1'
    element.dataset.calendarGhost = 'true'
    element.dataset.calendarGhostGeneration = '1'
    exits.scan()
    vi.advanceTimersByTime(80)
    element.dataset.calendarGhostGeneration = '2'
    exits.scan()
    vi.advanceTimersByTime(140)
    expect(observations).toEqual([Observation.cases.CommittedEndSettled.make({ generation: 1 })])
    element.dataset.calendarCommittedEndGeneration = '2'
    exits.scan()
    exits.dispose()
    vi.advanceTimersByTime(1000)
    expect(observations).toHaveLength(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('waits for caption and weeks completion, without scheduling a retirement cap', () => {
    vi.useFakeTimers()
    const { exits, panel, observations } = fixture()
    const timer = vi.spyOn(window, 'setTimeout')
    const weeks = panel('0-0-November')
    const caption = panel('0-0-November')
    exits.scan()
    expect(timer).not.toHaveBeenCalled()
    vi.advanceTimersByTime(5000)
    expect(observations).toEqual([])
    complete(weeks)
    expect(observations).toEqual([])
    complete(caption)
    expect(observations).toEqual([Observation.cases.PanelExited.make({ key: '0-0-November' })])
    exits.dispose()
  })

  it('ignores reopened and disposed owners and keeps later occurrence keys distinct', () => {
    const { exits, panel, observations } = fixture()
    const old = panel('0-0-November')
    const reopened = panel('2-0-November')
    reopened.dataset.calendarPresent = 'true'
    complete(reopened)
    complete(old)
    expect(observations).toEqual([Observation.cases.PanelExited.make({ key: '0-0-November' })])
    exits.dispose()
    reopened.dataset.calendarPresent = 'false'
    complete(reopened)
    expect(observations).toHaveLength(1)
  })

  it('waits for both overlay layers and rejects an interrupted generation', () => {
    const { element, exits, observations } = fixture()
    const layers = [document.createElement('div'), document.createElement('div')]

    for (const layer of layers) {
      layer.dataset.calendarOverlay = 'hover-1'
      layer.dataset.calendarOverlayGeneration = '1'
      layer.dataset.calendarOverlayPresent = 'false'
      element.append(layer)
    }

    const [fill, ring] = layers

    if (!fill || !ring) {
      throw new Error('Missing overlay layers')
    }

    complete(fill)

    for (const layer of layers) {
      layer.dataset.calendarOverlayGeneration = '2'
      layer.dataset.calendarOverlayPresent = 'true'
    }

    complete(ring)
    expect(observations).toEqual([])

    for (const layer of layers) {
      layer.dataset.calendarOverlayGeneration = '3'
      layer.dataset.calendarOverlayPresent = 'false'
    }

    complete(ring)
    expect(observations).toEqual([])
    complete(fill)
    expect(observations).toEqual([
      Observation.cases.OverlayExited.make({ key: 'hover-1', generation: 3 }),
    ])
    exits.dispose()
  })
})
