// @vitest-environment happy-dom

import { expect, it } from 'vitest'
import { scaleLinear } from 'd3-scale'
import { mountChart } from '@tanstack/charts/dom'
import { dot } from '@tanstack/charts/dot'
import { defineChart } from '@tanstack/charts/scene'
import type { ChartFocusState, ChartHost, ChartPoint } from '@tanstack/charts'
import type { ChartSelectionSource } from '@tanstack/charts/types'
import { createKeyboardHold } from '../../kit/interaction/keyboard-hold'

it('restores keyboard inspection through stock controlled focus without pinning or changing activation', () => {
  const data = [
    { name: 'A', x: 40, y: 40 },
    { name: 'B', x: 120, y: 40 },
  ]

  type Datum = (typeof data)[number]

  const container = document.createElement('div')

  const stage = document.createElement('div')

  const outside = document.createElement('button')
  container.append(stage)
  document.body.append(container, outside)

  let host: ChartHost<Datum, number, number> | undefined

  const hold = createKeyboardHold(container, () => host?.interaction)

  const observed: Array<ChartPoint<Datum, number, number> | null> = []

  const painted: Array<ChartFocusState<Datum, number, number> | null> = []

  const selected: Array<ChartSelectionSource> = []

  try {
    host = mountChart(stage, {
      width: 200,
      height: 100,
      ariaLabel: 'Keyboard hold',
      definition: defineChart({
        margin: 0,
        // The stock nearest-point default is 48px. Keep this fixture's gap
        // outside the authored dot's 8px inspection radius.
        maxFocusDistance: 8,
        marks: [dot(data, { x: 'x', y: 'y', r: 8 })],
        scales: {
          x: { scale: scaleLinear, domain: [0, 200] },
          y: { scale: scaleLinear, domain: [0, 100] },
        },
        selection: { type: 'keyed', change: (_point, source) => selected.push(source) },
      }),
      onFocusChange: (point) => {
        hold.onFocus(point)
        observed.push(point)
      },
      onRender: ({ surface }) => {
        // Happy DOM has no layout; the real renderer still resolves points and owns focus.
        surface.element.getBoundingClientRect = () => new DOMRect(0, 0, 200, 100)

        const paint = surface.paintFocus
        surface.paintFocus = (...args) => {
          painted.push(args[0])

          return paint.call(surface, ...args)
        }
      },
    })

    const first = host.getScene().points.find((point) => point.datum.name === 'A')

    const second = host.getScene().points.find((point) => point.datum.name === 'B')
    expect(first).toBeDefined()

    if (first === undefined) {
      throw new Error('The real chart must expose point A')
    }

    if (second === undefined) {
      throw new Error('The real chart must expose point B')
    }

    hold.setKeyboardFocus(first)
    expect(painted.at(-1)).toMatchObject({ source: 'programmatic', pinned: false })
    expect(observed.at(-1)?.datum.name).toBe('A')

    stage.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerType: 'mouse',
        clientX: second.x,
        clientY: second.y,
      }),
    )
    expect(observed.at(-1)?.datum.name).toBe('B')
    expect(host.interaction.resolvePointer(195, 95)).toBeNull()
    stage.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerType: 'mouse',
        clientX: 195,
        clientY: 95,
      }),
    )
    expect(observed.at(-1)?.datum.name).toBe('A')
    expect(painted.at(-1)).toMatchObject({ source: 'programmatic', pinned: false })

    stage.dispatchEvent(new MouseEvent('mouseleave'))
    expect(observed.at(-1)?.datum.name).toBe('A')
    stage.dispatchEvent(new FocusEvent('focusout', { relatedTarget: outside, bubbles: true }))
    expect(observed.at(-1)).toBeNull()

    stage.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Home',
        bubbles: true,
        cancelable: true,
      }),
    )
    expect(painted.at(-1)).toMatchObject({ source: 'keyboard', pinned: false })
    stage.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    )
    expect(selected).toEqual(['keyboard'])
  } finally {
    hold.destroy()
    host?.destroy()
    container.remove()
    outside.remove()
  }
})
