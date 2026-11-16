import { expect, vi } from 'vitest'
import { it as effectIt } from '@effect/vitest'
import { Effect } from 'effect'
import { Window } from 'happy-dom'
import { gridMaskResource, sourceGridMasks } from '../src/cartesian/grid-mask'
import { scatterPaintResource } from '../src/scatter/paint'

effectIt.effect(
  'updates grid plot masks in the existing SVG owner and retires disabled resources without ID collisions',
  () =>
    Effect.sync(() => {
      const browser = new Window()
      vi.stubGlobal('document', browser.document)

      try {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        document.body.append(svg)
        const resource = gridMaskResource(svg)
        const plotMargin = { top: 17, right: 23, bottom: 31, left: 43 }

        const first = sourceGridMasks('a#b', 640, 320, plotMargin, {
          vertical: true,
          fadeVertical: true,
        })

        const other = sourceGridMasks('ab', 640, 320, plotMargin, {})
        expect(first[0]?.id).not.toBe(other[0]?.id)
        expect(first.every((mask) => /^[a-z0-9-]+$/u.test(mask.id))).toBe(true)
        resource.draw(first)
        const node = svg.querySelector('mask')
        expect(svg.querySelectorAll('mask')).toHaveLength(2)
        expect(node?.getAttribute('maskUnits')).toBe('objectBoundingBox')
        expect(node?.getAttribute('maskContentUnits')).toBe('userSpaceOnUse')
        expect(
          ['x', 'y', 'width', 'height'].every((name) => node?.hasAttribute(name) === false),
        ).toBe(true)
        expect(
          [...svg.querySelectorAll('linearGradient:first-child stop')]
            .slice(0, 4)
            .map((stop) => [stop.getAttribute('offset'), stop.getAttribute('stop-opacity')]),
        ).toEqual([
          ['0%', '0'],
          ['10%', '1'],
          ['90%', '1'],
          ['100%', '0'],
        ])
        resource.draw(sourceGridMasks('a#b', 80, 50, plotMargin, {}))
        expect(svg.querySelector('mask')).toBe(node)
        expect(svg.querySelectorAll('mask')).toHaveLength(1)
        expect(node?.querySelector('rect')?.getAttribute('width')).toBe('14')
        expect(node?.querySelector('rect')?.getAttribute('height')).toBe('2')
        resource.draw(sourceGridMasks('a#b', 40, 30, plotMargin, {}))
        expect(node?.querySelector('rect')?.getAttribute('width')).toBe('1')
        expect(node?.querySelector('rect')?.getAttribute('height')).toBe('1')
        resource.draw(sourceGridMasks('a#b', 40, 30, plotMargin, { fadeHorizontal: false }))
        expect(svg.querySelector('defs')).toBeNull()
        resource.draw(first)
        const scatter = scatterPaintResource(svg)
        scatter({
          rowIndices: [],
          css: '',
          entrance: [],
          gradients: [{ id: 'scatter-resource', from: 'var(--ink)', to: 'currentColor', y1: 24.5 }],
        })
        const gradient = svg.querySelector('#scatter-resource')
        expect(gradient?.getAttribute('gradientUnits')).toBe('objectBoundingBox')
        expect(gradient?.getAttribute('y1')).toBe('24.5')
        expect(gradient?.querySelector('stop')?.getAttribute('stop-color')).toBe('var(--ink)')
        scatter({
          rowIndices: [],
          css: '',
          entrance: [],
          gradients: [{ id: 'scatter-resource', from: 'blue', to: 'green', y1: 12.5 }],
        })
        expect(svg.querySelector('#scatter-resource')).toBe(gradient)
        expect(gradient?.getAttribute('y1')).toBe('12.5')
        expect(gradient?.querySelector('stop')?.getAttribute('stop-color')).toBe('blue')
        scatter()
        expect(svg.querySelector('#scatter-resource')).toBeNull()
        expect(svg.querySelectorAll('mask')).toHaveLength(2)
        svg.remove()
        expect(browser.document.querySelector('mask')).toBeNull()
      } finally {
        browser.close()
        vi.unstubAllGlobals()
      }
    }),
)
