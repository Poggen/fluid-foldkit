import type {
  HTMLVisualElement,
  SVGVisualElement,
  MotionValueAnimation,
  createAnimationState,
  MotionNodeOptions,
  ResolvedValues,
  TargetAndTransition,
} from 'motion-dom'
import type { MotionResource } from './motion-resource.js'

export interface MotionTargetProperties {
  readonly resource?: MotionResource
  readonly onUpdate?: (values: ResolvedValues, element: HTMLElement | SVGElement) => void
  readonly onAnimationComplete?: (element: HTMLElement | SVGElement) => void
  readonly initial?: TargetAndTransition | false
  readonly animate: TargetAndTransition
  readonly exit?: TargetAndTransition
  readonly transition?: MotionNodeOptions['transition']
  readonly present?: boolean
  readonly reducedMotion?: 'user' | 'always' | 'never'
}

export interface MotionOptions extends MotionTargetProperties {
  readonly drag?: false | 'x' | 'y'
  readonly layout?: MotionNodeOptions['layout']
  readonly layoutId?: string
  readonly layoutDependency?: unknown
  readonly layoutScroll?: boolean
  readonly layoutRoot?: boolean
  readonly layoutAnchor?: MotionNodeOptions['layoutAnchor']
}

/** Target scopes reject layout capabilities rather than silently ignoring them. */
export interface TargetMotionOptions extends MotionTargetProperties {
  readonly drag?: never
  readonly layout?: never
  readonly layoutId?: never
  readonly layoutDependency?: never
  readonly layoutScroll?: never
  readonly layoutRoot?: never
  readonly layoutAnchor?: never
}

export interface MountedMotion<Options extends MotionTargetProperties> {
  readonly element: HTMLElement | SVGElement
  readonly visual: HTMLVisualElement | SVGVisualElement
  readonly options: Options
  readonly declaredOptions: Options
  readonly animations: ReadonlyArray<MotionValueAnimation>
  readonly generation: number
  readonly animationState: ReturnType<typeof createAnimationState>
  readonly exitCompletion: MotionTargetProperties['onAnimationComplete']
  readonly exitSettled: boolean
  readonly exitDispatched: boolean
}
