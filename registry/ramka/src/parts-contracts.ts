/* @license Ramka Foldkit adaptation. MIT. Upstream copyright (c) 2026 Artur Bień. */
import type { ChildAttribute, Html } from 'foldkit/html'

/** Rendered content belongs to the caller's Foldkit boundary. */
export type PartChildren = ReadonlyArray<Html | string>
export type PartAttributes = ReadonlyArray<ChildAttribute>
export type NavigationSource =
  | 'trigger'
  | 'keyboard'
  | 'thumbnail'
  | 'button'
  | 'scroll'
  | 'imperative'

/**
 * Readonly projection of the owning Block, plus boundary-bound native events.
 * Helpers never mutate the Model, attach listeners, or acquire host resources.
 * Build event arrays with `childAttributes` inside the owning Block's view.
 */
export interface PartContext {
  readonly id: string
  readonly open: boolean
  /** Owning Block presence; omitted by standalone part adapters. */
  readonly mounted?: boolean
  readonly keepMounted?: boolean
  /** Retained closed content, distinct from a mounted closing animation. */
  readonly parked?: boolean
  /** Mounted for layout/readiness, before the reveal commit publishes open state. */
  readonly preparing?: boolean
  readonly index: number
  readonly count: number
  readonly dir: 'ltr' | 'rtl'
  /** Omit the DOM dir attribute when direction should inherit from the page. */
  readonly dirAttribute?: 'ltr' | 'rtl'
  /** Only an enclosing Slides opts an Item into the preload window. */
  readonly inSlides?: boolean
  /** Initial server paint; the host retires initial-position attributes before measuring. */
  readonly ssr?: boolean
  readonly loop: boolean
  readonly caption: PartChildren | undefined
  /** Only an empty registry permits the initial caption fallback. */
  readonly captionRegistryEmpty?: boolean
  /** Items whose media bridge is currently mounted by the host. */
  readonly placeholderIndices?: ReadonlyArray<number>
  readonly zoom: number
  /** Committed target while a discrete pose animation is running; absent at rest. */
  readonly zoomAnimationTarget?: number
  readonly zoomAnimationChangesZoom?: boolean
  readonly zoomAnimationX?: number
  readonly zoomAnimationY?: number
  readonly x: number
  readonly y: number
  readonly minZoom: number
  /** Resting limits for each indexed, including inactive preloaded, Zoom surface. */
  readonly zoomBounds?: ReadonlyArray<{ readonly minZoom: number; readonly maxZoom: number }>
  /** False when the active composition did not register a Zoom surface. */
  readonly zoomAvailable?: boolean
  readonly maxZoom: number
  /** Neighbour distance; Infinity keeps all Item children mounted. */
  readonly preload: number
  readonly hasThumbnails: boolean
  readonly openerIndex?: number
  /** Exact opening trigger identity; distinguishes triggers sharing an index. */
  readonly openerId?: string
  /** Exact selected morph trigger used by physical transition capture. */
  readonly morphTargetId?: string
  /** Closest-mode target resolved from the registered trigger indices. */
  readonly morphTargetIndex?: number
  /** SSR has no registered DOM targets; origin intentionally remains unstamped. */
  readonly morphTo?: 'active' | 'origin' | 'closest'
  readonly direction?: 'forward' | 'backward'
  readonly pulling?: boolean
  readonly pullSnapping?: boolean
  readonly pullDismissing?: boolean
  readonly zooming?: boolean
  readonly dragging?: boolean
  readonly focusWithin?: boolean
  readonly thumbnailGroupId?: string
  readonly focusedThumbnailGroup?: string
  readonly thumbnailStripScrubbing?: boolean
  readonly thumbnailStripPositioned?: boolean
  readonly pullProgress?: number
  readonly pullSnapDuration?: string
  readonly pullSnapEasing?: string
  readonly vtDuration?: string
  readonly vtEasing?: string
  readonly vtRootEasing?: string
  readonly openAt: (index: number, triggerId?: string) => PartAttributes
  readonly close: PartAttributes
  readonly navigate: (index: number, source?: NavigationSource) => PartAttributes
  readonly previous: PartAttributes
  readonly next: PartAttributes
  readonly zoomIn: PartAttributes
  readonly zoomOut: PartAttributes
  readonly resetZoom: PartAttributes
  /** Additional content attributes supplied by the owning Block. */
  readonly contentAttributes?: PartAttributes
  readonly stageAttributes?: PartAttributes
  readonly slidesAttributes?: PartAttributes
  /** Roving focus/navigation/focus-enter/focus-leave events. */
  readonly thumbnailGroupAttributes?: PartAttributes
  readonly thumbnailStripAttributes?: PartAttributes
  /** Checked wheel, pointer and keyboard events from the owning Block. */
  readonly zoomAttributes?: PartAttributes
}

export interface EmptyState {}
export interface TriggerState {
  readonly open: boolean
  readonly active: boolean
  readonly morphTarget: boolean
}
export interface OpenState {
  readonly open: boolean
}
export interface DisabledState {
  readonly disabled: boolean
}
export interface SlidesState {
  readonly activeIndex: number
  readonly direction: 'forward' | 'backward'
  readonly orientation: 'horizontal'
}
export interface MediaState {
  readonly placeholder: boolean
}
export interface CaptionState {
  readonly index: number
  readonly hasCaption: boolean
}
export interface ThumbnailState {
  readonly active: boolean
  readonly index: number
}
export interface ThumbnailGroupState {
  readonly focusWithin: boolean
}
export interface ThumbnailStripState {
  readonly scrubbing: boolean
  readonly positioned: boolean
}

export interface PartProps<State = EmptyState> {
  readonly children?: PartChildren
  /** Boundary-bound caller attributes, applied after structural defaults. */
  readonly attributes?: PartAttributes
  /** Own the host tag while preserving all generated semantics and bound events. */
  readonly render?: (
    attributes: PartAttributes,
    children: PartChildren,
    state: Readonly<State>,
  ) => Html
}
export interface TriggerProps extends PartProps<TriggerState> {
  readonly index: number
  readonly id?: string
  readonly disabled?: boolean
  readonly crossfade?: 'open' | 'close' | 'both'
}
export interface PortalProps extends PartProps {}
export interface ContentProps extends PartProps<OpenState> {
  /** Supply a localized accessible name, or pass aria-labelledby in attributes. */
  readonly label?: string
}
export interface BackdropProps extends PartProps<OpenState> {}
export interface ButtonProps<State = DisabledState> extends PartProps<State> {
  readonly disabled?: boolean
  /** Localized label for icon-only controls. Visible text is also supported. */
  readonly label?: string
}
export interface CloseProps extends ButtonProps<EmptyState> {}
export interface StageProps extends PartProps {}
export interface SlidesProps extends PartProps<SlidesState> {
  /** Initial SSR transform for viewport-wide slides; mirror gap into --lightbox-ssr-slide-gap. */
  readonly ssrSlideShift?: boolean
  /** Localized accessible name for the carousel group. */
  readonly label?: string
  readonly roleDescription?: string
}
export interface SlideProps extends PartProps {
  readonly index: number
}
export interface ItemState {
  readonly index: number
  readonly active: boolean
  readonly visible: boolean
}
export interface ItemProps extends Omit<PartProps<ItemState>, 'children'> {
  readonly index: number
  /** Localized position/name for the standalone group, e.g. "3 of 12". */
  readonly label?: string
  /** Localized "slide" for standalone groups; absent for tabpanels. */
  readonly roleDescription?: string
  readonly children?: PartChildren | ((state: ItemState) => PartChildren)
  /** Override the enclosing Slides preload distance; Infinity mounts all. */
  readonly preload?: number
}
/** Media remains a wrapper: img/video/picture/live Html is authored by the caller. */
export interface MediaProps extends PartProps<MediaState> {
  /** Owning item, for bridge state when preloaded neighbours are also rendered. */
  readonly index?: number
  readonly width?: number
  readonly height?: number
  readonly placeholder?: boolean
}
export interface PreviousProps extends ButtonProps {}
export interface NextProps extends ButtonProps {}
export interface CounterState {
  readonly current: number
  readonly total: number
}
export interface CounterProps extends Omit<PartProps<CounterState>, 'children'> {
  readonly format?: (state: CounterState) => PartChildren
}
export interface CaptionProps extends PartProps<CaptionState> {}
export interface ThumbnailGroupProps extends PartProps<ThumbnailGroupState> {
  readonly label?: string
}
export interface ThumbnailProps extends ButtonProps<ThumbnailState> {
  readonly index: number
}
export interface ThumbnailStripProps extends PartProps<ThumbnailStripState> {}
export interface ThumbnailStripTrackProps extends ThumbnailGroupProps {}
export interface ZoomState {
  readonly zoom: number
  readonly maxZoom: number
  readonly offsetX: number
  readonly offsetY: number
  readonly canZoomIn: boolean
  readonly canZoomOut: boolean
  readonly dragging: boolean
}
export interface ZoomProps extends Omit<PartProps<ZoomState>, 'children'> {
  /** Pass the owning item index so inactive neighbours keep their resting pose. */
  readonly index?: number
  readonly children?: PartChildren | ((state: ZoomState) => PartChildren)
}
export interface ZoomInProps extends ButtonProps {}
export interface ZoomOutProps extends ButtonProps {}
/**
 * Foldkit equivalent of the upstream nonce provider: an explicit nonce-bearing
 * style node, rendered once by the caller. No hidden React context or hoisting.
 * External parts.css can also be loaded by the host's CSP-approved stylesheet.
 */
export interface CSPProviderProps extends Omit<PartProps, 'children'> {
  readonly nonce: string
  readonly css: string
  readonly attributes?: PartAttributes
}
