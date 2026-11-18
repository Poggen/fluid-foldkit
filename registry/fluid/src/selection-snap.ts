import { Schema } from 'effect'
import type { MotionResource } from './motion-resource.js'
import { IndexedGeometry } from './lib/indexed-geometry.js'
import { collectHoverItems, measureHoverLayout } from './hover-layout.js'
import { rectAt } from './lib/indexed-geometry.js'

export const selectionSnapResource: (snap: SelectionSnap) => MotionResource =
  function selectionSnapResource(snap: SelectionSnap) {
    return {
      key: snap,
      mount: (visual) => {
        let disposed = false
        queueMicrotask(() => {
          const element = visual.current
          if (disposed || !(element instanceof HTMLElement) || !element.isConnected) return
          const origin = element.ownerDocument.getElementById(snap.originId)
          if (origin === null) return
          const measured = measureHoverLayout(origin, collectHoverItems(origin), () => '', origin)
          const start = rectAt(measured.itemRects, snap.start)
          const end = rectAt(measured.itemRects, snap.end)
          const target =
            start === undefined || end === undefined
              ? { opacity: 0 }
              : {
                  top: start.top,
                  left: Math.min(start.left, end.left),
                  width: Math.max(start.width, end.width),
                  height: end.top + end.height - start.top,
                  opacity: 1,
                }
          for (const [key, value] of Object.entries(target)) visual.getValue(key, value).jump(value)
          visual.render()
          element.dispatchEvent(
            new CustomEvent(SELECTION_SNAP_EVENT, {
              detail: {
                generation: snap.generation,
                itemRects: measured.itemRects,
              },
            }),
          )
        })
        return () => {
          disposed = true
        }
      },
    }
  }

export const SELECTION_SNAP_EVENT = 'fluid-selection-snap-measured'
export const SelectionSnapGeometry = Schema.Struct({
  generation: Schema.Natural,
  itemRects: IndexedGeometry,
})
export interface SelectionSnap {
  readonly originId: string
  readonly generation: number
  readonly start: number
  readonly end: number
}
