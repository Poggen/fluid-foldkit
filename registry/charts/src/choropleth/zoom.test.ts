// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { identityMatrix, mountGeoZoom } from './zoom'
import type { TransformMatrix } from './zoom'

const mouse = (target: EventTarget, type: string, x: number, y: number) =>
  target.dispatchEvent(
    new MouseEvent(type, { clientX: x, clientY: y, view: window, bubbles: true }),
  )

const wheel = (deltaY: number) =>
  Object.assign(
    new MouseEvent('wheel', { clientX: 100, clientY: 80, bubbles: true, cancelable: true }),
    { deltaY },
  )

it('anchors mouse panning at the first move and releases a held drag on destroy', () => {
  const host = document.createElement('div')

  document.body.append(host)

  const observations: Array<TransformMatrix> = []

  const resource = mountGeoZoom({
    enabled: true,
    host,
    min: 0.5,
    max: 4,
    initial: { ...identityMatrix(), scaleX: 2, scaleY: 2, translateX: 10, translateY: 20 },
    holder: { projection: undefined, transform: { k: 2, x: 10, y: 20 } },
    observe: (matrix) => {
      observations.push(matrix)
    },
  })

  try {
    mouse(host, 'mousedown', 100, 100)
    mouse(window, 'mousemove', 120, 110)
    expect(resource.instance.transformMatrix).toMatchObject({ translateX: 10, translateY: 20 })
    mouse(window, 'mousemove', 150, 130)
    expect(observations.at(-1)).toMatchObject({ translateX: 40, translateY: 40 })
    resource.destroy()
    mouse(window, 'mousemove', 200, 180)
    expect(resource.instance.transformMatrix).toMatchObject({ translateX: 40, translateY: 40 })
  } finally {
    resource.destroy()
    host.remove()
  }
})

it.each([0.5, 0.5133420825004578])(
  'rejects a wheel step below the minimum from %s while still preventing scroll',
  (scale) => {
    const host = document.createElement('div')

    document.body.append(host)

    const states: Array<TransformMatrix> = []
    const bubbled: Array<Event> = []

    const observeWheel = (event: Event) => {
      bubbled.push(event)
    }

    document.addEventListener('wheel', observeWheel)

    const resource = mountGeoZoom({
      enabled: true,
      host,
      min: 0.5,
      max: 4,
      initial: { ...identityMatrix(), scaleX: scale, scaleY: scale },
      holder: { projection: undefined, transform: { k: scale, x: 0, y: 0 } },
      observe: (matrix) => {
        states.push(matrix)
      },
    })

    try {
      const out = wheel(120)
      host.dispatchEvent(out)
      expect(out.defaultPrevented).toBe(true)
      expect(bubbled).toEqual([out])
      expect(resource.instance.transformMatrix).toMatchObject({
        scaleX: scale,
        scaleY: scale,
        translateX: 0,
        translateY: 0,
      })
      host.dispatchEvent(wheel(-120))
      expect(states.at(-1)?.scaleX).toBeCloseTo(scale * 1.05)
      expect(resource.instance.transformMatrix.translateX).toBeCloseTo(-5)
      expect(resource.instance.transformMatrix.translateY).toBeCloseTo(-4)
    } finally {
      document.removeEventListener('wheel', observeWheel)
      resource.destroy()
      host.remove()
    }
  },
)
