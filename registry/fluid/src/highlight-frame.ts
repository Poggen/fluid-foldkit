import { Schema } from 'effect'
import type { ResolvedValues } from 'motion-dom'
import type { ItemRect } from './lib/hover-geometry.js'

export const HIGHLIGHT_FRAME_EVENT = 'fluid-hover-highlight-frame'
export const HighlightBox = Schema.Struct({
  y: Schema.Finite,
  height: Schema.Finite,
  opacity: Schema.Finite,
})
export type HighlightBox = typeof HighlightBox.Type

export const highlightFrameUpdate =
  (rect: ItemRect) => (values: ResolvedValues, element: HTMLElement | SVGElement) => {
    element.dispatchEvent(
      new CustomEvent(HIGHLIGHT_FRAME_EVENT, {
        bubbles: true,
        detail: {
          y: typeof values.y === 'number' ? values.y : rect.top,
          height: typeof values.height === 'number' ? values.height : rect.height,
          opacity: typeof values.opacity === 'number' ? values.opacity : 1,
        },
      }),
    )
  }
