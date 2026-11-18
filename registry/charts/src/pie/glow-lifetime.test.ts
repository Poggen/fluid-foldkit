// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { constUndefined } from 'effect/Function'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { createPieEntranceRenderer } from './entrance-renderer'
import { buildPieDefinition, pieGeometry } from './definition'
import { buildPieCss, pieHoverVars } from './private/hover'
import { PieSlice } from './options'
import { Ring } from '../ring/options'
import { ringGeometry } from '../ring/geometry'
import { createRingVisual } from '../ring/visual'
import type { PieArcRow } from './arc'

it.each([null, 0])(
  'retains the initial Source SVG filter through focus changes (initial %s)',
  (initial) => {
    const element = document.createElement('div')
    element.dataset.bkmChart = 'pie'
    element.style.setProperty('--chart-1', 'red')
    document.body.append(element)

    const props = {
      data: [{ label: 'A', value: 1 }],
      size: 320,
      children: [PieSlice({ index: 0, animate: false })],
    }

    const geometry = pieGeometry(props, 320, 'glow-pie')
    const style = document.createElement('style')
    style.textContent = buildPieCss(0.4, geometry.rows)
    document.head.append(style)

    for (const [name, value] of Object.entries(
      pieHoverVars(geometry.rows, {
        outerRadius: geometry.outerRadius,
        isDonut: false,
        pathAt: geometry.pathAt,
      }).vars,
    )) {
      element.style.setProperty(name, value)
    }

    const entrance = createPieEntranceRenderer()
    entrance.configure(geometry, props, initial)
    const runtime = createChartRuntime<PieArcRow, number, number>()
    const surface = entrance.renderer.mount(element, constUndefined)
    surface.render(
      runtime.render(buildPieDefinition(props, 320, 'glow-pie'), {
        width: 320,
        height: 320,
      }),
      { ariaLabel: 'Pie' },
    )

    const ringProps = {
      data: [{ label: 'A', value: 1, maxValue: 2 }],
      size: 320,
      children: [Ring({ index: 0, animate: false })],
    }

    const rings = ringGeometry(ringProps, 320)
    const ring = createRingVisual(ringProps, { index: 0, animate: false }, initial)
    ring.configure(
      ringProps,
      { index: 0, animate: false },
      rings.rows.find((row) => row.kind === 'track'),
      rings.rows.find((row) => row.kind === 'progress'),
      rings.fit,
    )
    element.append(ring.element)

    const filter = () => {
      const path = element.querySelector('.bkm-pie-role0 path')

      if (path === null) {
        throw new TypeError('Missing real Pie visual')
      }

      return getComputedStyle(path).filter || 'none'
    }

    const expected = initial === null ? 'none' : 'drop-shadow(0 0 12px var(--chart-1))'

    try {
      for (const focus of [initial, 0, null]) {
        if (focus === null) {
          delete element.dataset.hover
        } else {
          element.dataset.hover = String(focus)
        }

        entrance.hover(focus)
        ring.hover(focus)
        expect(filter()).toBe(initial === null ? 'none' : 'drop-shadow(0 0 12px red)')
        expect(ring.element.style.filter).toBe(expected)
      }
    } finally {
      surface.destroy()
      runtime.destroy()
      ring.destroy()
      element.remove()
      style.remove()
    }
  },
)
