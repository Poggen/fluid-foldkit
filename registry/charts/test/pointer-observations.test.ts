// @vitest-environment happy-dom

import { DateTime, Option } from 'effect'
import { afterEach, expect, test, vi } from 'vitest'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { motion } from '@tanstack/charts/motion'
import { buildTimeSeriesDefinition } from '../src/cartesian/definition'
import type { CartesianSnapshot } from '../src/cartesian/definition'
import { Line } from '../src/cartesian/layers'
import { nativeObservations } from '../src/cartesian/native-resource'
import { pointerObservations } from '../src/cartesian/pointer-observations'
import { initialInteraction } from '../src/cartesian/state'

const rows = [0, 1000].map((time) => ({
  date: DateTime.toDateUtc(DateTime.makeUnsafe(time)),
  value: time,
}))

const cleanups: Array<() => void> = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup()
  }

  vi.restoreAllMocks()
})

const chart = () => {
  const element = document.createElement('div')
  document.body.append(element)
  let snapshot: CartesianSnapshot<(typeof rows)[number]> | undefined
  const state = { ...initialInteraction(), revealReady: true }

  const host = mountChartRenderer(element, {
    definition: buildTimeSeriesDefinition(rows, {
      id: 'pointer-observations',
      x: (row) => row.date,
      children: [Line({ dataKey: 'value' })],
      animationDuration: 0,
      onBuilt: (value) => {
        snapshot = value
      },
    }),
    renderer: motion<(typeof rows)[number], Date, number>({ initial: false }),
    ariaLabel: 'Pointer observations',
    idPrefix: 'pointer-observations',
    width: 640,
    height: 320,
  })

  vi.spyOn(host.interaction, 'clientToScene').mockImplementation((x, y) => ({ x, y }))
  const observe = nativeObservations(element)
  const drag = vi.fn(observe.drag)

  const listen = () =>
    pointerObservations(
      element,
      host,
      () => snapshot,
      () => state,
      { ...observe, drag },
      () => rows,
    )

  let release = listen()
  cleanups.push(() => {
    release()
    host.destroy()
    element.remove()
  })

  return {
    element,
    state,
    drag,
    dispose: () => {
      release()
    },
    remount: () => {
      release()
      release = listen()
    },
  }
}

const pointer = (target: EventTarget, type: string, options: PointerEventInit = {}) => {
  target.dispatchEvent(
    new PointerEvent(type, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
      clientX: 100,
      clientY: 100,
      bubbles: true,
      ...options,
    }),
  )
}

test('unrelated releases, cancellation, leaves and pressed moves publish no observations', () => {
  const charts = [chart(), chart()]
  pointer(window, 'pointerup')
  pointer(window, 'pointercancel')

  for (const current of charts) {
    pointer(current.element, 'pointerleave')
    pointer(current.element, 'pointermove')
    expect(current.drag).not.toHaveBeenCalled()
  }
})

test('fast down and outside release publish ordered start and end before model publication', () => {
  const current = chart()
  const other = chart()
  pointer(current.element, 'pointerdown')
  expect(Option.isNone(current.state.dragAnchor)).toBe(true)
  pointer(window, 'pointerup', { buttons: 0, clientX: 900, clientY: 900 })
  pointer(window, 'pointerup', { buttons: 0 })
  expect(current.drag.mock.calls).toEqual([
    ['start', 60, 0],
    ['end', 0, 0],
  ])
  expect(other.drag).not.toHaveBeenCalled()
})

test.each(['pointerup', 'pointercancel', 'pointerleave'])(
  'only the active pointer can finish a drag with %s',
  (event) => {
    const current = chart()
    pointer(current.element, 'pointerdown', { pointerId: 7, pointerType: 'pen' })
    pointer(current.element, 'pointerdown', { pointerId: 8 })
    pointer(current.element, 'pointermove', { pointerId: 8, clientX: 300 })
    const target = event === 'pointerleave' ? current.element : window
    pointer(target, event, { pointerId: 8, pointerType: 'touch', buttons: 0 })
    pointer(current.element, 'pointermove', { pointerId: 7, pointerType: 'pen', clientX: 300 })
    current.state.revealReady = false
    pointer(target, event, { pointerId: 7, pointerType: 'pen', buttons: 0, clientX: 900 })
    pointer(current.element, 'pointermove', { pointerId: 7, pointerType: 'pen' })
    expect(current.drag.mock.calls).toEqual([
      ['start', 60, 0],
      ['move', 260, 0],
      ['end', 0, 0],
    ])
  },
)

test('touch, secondary buttons, unrevealed plots and outside downs never start drags', () => {
  const current = chart()
  pointer(current.element, 'pointerdown', { pointerType: 'touch' })
  pointer(current.element, 'pointerdown', { button: 2 })
  pointer(current.element, 'pointerdown', { clientX: 0 })
  current.state.revealReady = false
  pointer(current.element, 'pointerdown')
  pointer(window, 'pointerup', { buttons: 0 })
  expect(current.drag).not.toHaveBeenCalled()
})

test('disposal removes active listeners and remount starts with no gesture', () => {
  const current = chart()
  pointer(current.element, 'pointerdown')
  current.dispose()
  pointer(window, 'pointercancel')
  pointer(current.element, 'pointermove')
  current.remount()
  pointer(window, 'pointerup')
  expect(current.drag.mock.calls).toEqual([['start', 60, 0]])
  pointer(current.element, 'pointerdown', { pointerId: 2 })
  pointer(window, 'pointerup', { pointerId: 2, buttons: 0 })
  expect(current.drag.mock.calls).toEqual([
    ['start', 60, 0],
    ['start', 60, 0],
    ['end', 0, 0],
  ])
})

test('owns the gesture before a synchronous start observer releases it', () => {
  const current = chart()

  current.element.addEventListener(
    'drag-observed',
    () => {
      pointer(window, 'pointerup', { buttons: 0 })
    },
    { once: true },
  )
  pointer(current.element, 'pointerdown')
  expect(current.drag.mock.calls).toEqual([
    ['start', 60, 0],
    ['end', 0, 0],
  ])
})
