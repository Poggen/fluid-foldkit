import type { HTMLVisualElement, SVGVisualElement, MotionNodeOptions } from 'motion-dom'
import type { MotionTargetProperties } from './motion-contract.js'

/** Capability hooks; the shared engine never inspects adapter-owned state. */
export interface MotionAdapter<Options extends MotionTargetProperties> {
  readonly props: (options: Options, element: Element) => Partial<MotionNodeOptions>
  readonly mount: (input: {
    readonly element: HTMLElement | SVGElement
    readonly visual: HTMLVisualElement | SVGVisualElement
    readonly options: Options
    readonly parent: HTMLElement | SVGElement | undefined
    readonly onComplete: () => void
  }) => void
  readonly afterMount: (element: Element, options: Options) => void
  readonly beforeUpdate: (element: Element, previous: Options, next: Options) => void
  readonly afterUpdate: (element: Element, options: Options) => boolean
  readonly afterScheduledUpdate: (onComplete: () => void) => void
  readonly isAnimating: (element: Element) => boolean
  readonly beforeRelease: (element: Element) => void
  readonly release: (element: Element) => void
  readonly retireVisual?: (element: Element, unmount: () => void) => void
  readonly capture: () => void
  readonly flush: () => void
  readonly dispose: () => void
}
