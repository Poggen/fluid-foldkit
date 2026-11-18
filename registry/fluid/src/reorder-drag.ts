import { Schema } from 'effect'
import { drag } from 'motion-dom'
import type { HTMLVisualElement, PanInfo } from 'motion-dom'
import type { ReorderAxis, ReorderBox } from './reorder-order.js'

export interface ReorderDragOwner {
  readonly axis: () => ReorderAxis
  readonly enabled: () => boolean
  readonly measure: (box: ReorderBox) => void
  readonly move: (offset: number, info: PanInfo) => void
  readonly end: () => void
}

export function mountReorderDrag(visual: HTMLVisualElement, owner: ReorderDragOwner) {
  const element = visual.current

  if (element === null) {
    throw new Error('Reorder drag requires its mounted visual')
  }

  const x = visual.getValue('x', 0)
  const y = visual.getValue('y', 0)
  const z = visual.getValue('zIndex', 'unset')
  let releaseDrag: (() => void) | undefined
  let mountedAxis: ReorderAxis | undefined
  let disposed = false

  const read: (axis: ReorderAxis) => number = (axis: ReorderAxis) => {
    const value: unknown = (axis === 'x' ? x : y).get()

    return Schema.is(Schema.Finite)(value) ? value : 0
  }

  const updateZ = () => {
    z.set(read('x') !== 0 || read('y') !== 0 ? 1 : 'unset')
  }

  const releaseX = x.on('change', updateZ)
  const releaseY = y.on('change', updateZ)
  const releaseMeasure = visual.on('LayoutMeasure', owner.measure)

  const suspend = () => {
    releaseDrag?.()
    releaseDrag = undefined
    mountedAxis = undefined
    x.jump(0)
    y.jump(0)
    owner.end()
  }

  const synchronize = () => {
    if (disposed) {
      return
    }

    if (!owner.enabled()) {
      if (releaseDrag !== undefined) {
        suspend()
      }

      return
    }

    const axis = owner.axis()

    if (releaseDrag !== undefined && mountedAxis === axis) {
      return
    }

    releaseDrag?.()
    mountedAxis = axis
    releaseDrag = drag(element, {
      axis,
      snapToOrigin: true,
      onMove(_event, info) {
        if (!disposed && owner.enabled()) {
          owner.move(read(axis), info)
        }
      },
      onEnd() {
        if (!disposed) {
          owner.end()
        }
      },
    })
  }

  const release = () => {
    if (disposed) {
      return
    }

    disposed = true
    suspend()
    releaseX()
    releaseY()
    releaseMeasure()
  }

  synchronize()

  return { release, suspend, synchronize }
}
