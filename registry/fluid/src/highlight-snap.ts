import type { MotionResource } from './motion-resource.js'
import { collectHoverItems, measureHoverLayout } from './hover-layout.js'
import { rectAt } from './lib/indexed-geometry.js'
export const highlightSnapResource: (snap: HighlightSnap) => MotionResource =
  function highlightSnapResource(snap: HighlightSnap) {
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
          const rect = rectAt(measured.itemRects, snap.index)
          const target =
            rect === undefined
              ? { opacity: 0 }
              : { x: rect.left, y: rect.top, width: rect.width, height: rect.height, opacity: 1 }
          for (const [key, value] of Object.entries(target)) visual.getValue(key, value).jump(value)
          visual.render()
        })
        return () => {
          disposed = true
        }
      },
    }
  }

export interface HighlightSnap {
  readonly originId: string
  readonly index: number
  readonly generation: number
}
