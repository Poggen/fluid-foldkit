/* @license Ramka bf58a38. MIT. Copyright (c) 2026 Artur Bień. */
/**
 * Documented `data-*` attributes published by Lightbox parts.
 * JSDoc here is the source of truth for the docs site API tables
 * (`pnpm docs:api`). Prefer these constants over string literals when
 * reading/writing attributes in library code.
 *
 * ## Naming
 * - **`data-ramka-*`**: part identity / stable DOM lookup hooks. Every
 *   DOM-rendering primitive MUST publish exactly one identity marker
 *   (listed in `LIGHTBOX_PART_IDENTITY_ATTRIBUTES`). Root is exempt — it
 *   renders no host element.
 * - **Plain `data-*`**: transient UI state (`data-open`, `data-active`, …).
 *
 * Open/close state attrs follow Base UI Dialog conventions:
 * - Trigger uses `data-popup-open` when the lightbox is open.
 * - Content/Backdrop use mutually exclusive `data-open` / `data-closed`.
 */

export const LightboxTriggerDataAttributes = {
  /** Always present on the trigger element. */
  trigger: 'data-ramka-trigger',
  /** Present when the corresponding lightbox is open. */
  open: 'data-popup-open',
  /** Present when this trigger’s index is the active item. */
  active: 'data-active',
  /**
   * Present on the resolved morph element while it is the open/close morph
   * source: the trigger root by default, or the node designated via
   * `morphRef` when attached. Style hide/opacity against this attribute
   * directly — do not assume it lives on the Trigger button.
   */
  morphTarget: 'data-morph-target',
  /** Reflects the crossfade prop: `open` | `close` | `both`. */
  crossfade: 'data-crossfade',
} as const
export type LightboxTriggerDataAttributes =
  (typeof LightboxTriggerDataAttributes)[keyof typeof LightboxTriggerDataAttributes]

export const LightboxPortalDataAttributes = {
  /** Always present on the portal host element. */
  portal: 'data-ramka-portal',
} as const
export type LightboxPortalDataAttributes =
  (typeof LightboxPortalDataAttributes)[keyof typeof LightboxPortalDataAttributes]

export const LightboxContentDataAttributes = {
  /** Always present on the dialog surface. */
  content: 'data-ramka-content',
  /** Present while the lightbox is open. */
  open: 'data-open',
  /** Present while the lightbox is closed (still rendered). */
  closed: 'data-closed',
  /** Present while a pull-to-dismiss drag is in progress. */
  pulling: 'data-pulling',
  /**
   * Present while a cancelled pull springs back to rest. `data-pulling` is
   * dropped on release so chrome can transition; this latch keeps pull-only
   * layout (overflow, shell hide) until the item is parked.
   */
  pullSnapping: 'data-pull-snapping',
  /** Present while the dismiss animation runs after crossing the threshold. */
  pullDismissing: 'data-pull-dismissing',
  /** Present during an active pinch/zoom gesture (blocks pull-to-dismiss). */
  zooming: 'data-zooming',
  /** Present when content zoom is greater than 1× (held through zoom-out animation). */
  zoomed: 'data-zoomed',
} as const
export type LightboxContentDataAttributes =
  (typeof LightboxContentDataAttributes)[keyof typeof LightboxContentDataAttributes]

export const LightboxBackdropDataAttributes = {
  /** Always present on the backdrop element. */
  backdrop: 'data-ramka-backdrop',
  /** Present while the lightbox is open. */
  open: 'data-open',
  /** Present while the lightbox is closed (still rendered). */
  closed: 'data-closed',
  /** Present while pull-to-dismiss is active (mirrors Content). */
  pulling: 'data-pulling',
  /** Present while a cancelled pull springs back (mirrors Content). */
  pullSnapping: 'data-pull-snapping',
} as const
export type LightboxBackdropDataAttributes =
  (typeof LightboxBackdropDataAttributes)[keyof typeof LightboxBackdropDataAttributes]

export const LightboxCloseDataAttributes = {
  /** Always present on the close button. */
  close: 'data-ramka-close',
} as const
export type LightboxCloseDataAttributes =
  (typeof LightboxCloseDataAttributes)[keyof typeof LightboxCloseDataAttributes]

export const LightboxStageDataAttributes = {
  /** Always present on the media interaction stage. */
  stage: 'data-ramka-stage',
} as const
export type LightboxStageDataAttributes =
  (typeof LightboxStageDataAttributes)[keyof typeof LightboxStageDataAttributes]

export const LightboxItemDataAttributes = {
  /** Always present on the item element. */
  item: 'data-ramka-item',
  /** Present when this item is the active index. */
  active: 'data-active',
  /** The item index as a string. */
  index: 'data-index',
  /**
   * Transient during view-transition open — suppress consumer entrance fades
   * on the destination item.
   */
  skipFade: 'data-skip-fade',
  /**
   * Present ONLY in server-rendered HTML, on the active item of a page that
   * server-renders an open lightbox. Carries `scroll-initial-target: nearest`
   * (delivered by `Lightbox.Slides`), so engines that support it scroll the
   * Slides scrollport to the active slide during initial layout — before
   * first paint, for any slide widths. Cleared during hydration; never set
   * on the client.
   */
  ssrActive: 'data-ssr-active',
} as const
export type LightboxItemDataAttributes =
  (typeof LightboxItemDataAttributes)[keyof typeof LightboxItemDataAttributes]

export const LightboxSlidesDataAttributes = {
  /** Always present on the slides scrollport. */
  slides: 'data-ramka-slides',
  /** Current active index. */
  activeIndex: 'data-active-index',
  /** `forward` or `backward`. */
  direction: 'data-direction',
  /** Always `horizontal`. */
  orientation: 'data-orientation',
  /**
   * Present while the `ssrSlideShift` transform stand-in is applied: from the
   * server render of an open lightbox until the mount layout effect swaps the
   * real scroll offset in (same commit — the swap never paints). While set,
   * every slide is translated so the active one occupies the scrollport at
   * scroll offset 0, and the scrollport's `overflow-x` is frozen so a
   * pre-hydration swipe can't reveal the empty positions the translated
   * slides vacated.
   */
  ssrShift: 'data-ssr-shift',
} as const
export type LightboxSlidesDataAttributes =
  (typeof LightboxSlidesDataAttributes)[keyof typeof LightboxSlidesDataAttributes]

export const LightboxSlideDataAttributes = {
  /** Always present on the slide element. */
  slide: 'data-ramka-slide',
} as const
export type LightboxSlideDataAttributes =
  (typeof LightboxSlideDataAttributes)[keyof typeof LightboxSlideDataAttributes]

export const LightboxPreviousDataAttributes = {
  /** Always present on the previous button. */
  previous: 'data-ramka-previous',
  /** Present when navigation is unavailable. */
  disabled: 'data-disabled',
} as const
export type LightboxPreviousDataAttributes =
  (typeof LightboxPreviousDataAttributes)[keyof typeof LightboxPreviousDataAttributes]

export const LightboxNextDataAttributes = {
  /** Always present on the next button. */
  next: 'data-ramka-next',
  /** Present when navigation is unavailable. */
  disabled: 'data-disabled',
} as const
export type LightboxNextDataAttributes =
  (typeof LightboxNextDataAttributes)[keyof typeof LightboxNextDataAttributes]

export const LightboxCounterDataAttributes = {
  /** Always present on the counter element. */
  counter: 'data-ramka-counter',
} as const
export type LightboxCounterDataAttributes =
  (typeof LightboxCounterDataAttributes)[keyof typeof LightboxCounterDataAttributes]

export const LightboxCaptionDataAttributes = {
  /** Always present on the caption element. */
  caption: 'data-ramka-caption',
  /** Present when the active item has a caption. */
  hasCaption: 'data-has-caption',
} as const
export type LightboxCaptionDataAttributes =
  (typeof LightboxCaptionDataAttributes)[keyof typeof LightboxCaptionDataAttributes]

export const LightboxThumbnailGroupDataAttributes = {
  /** Always present on the thumbnail group (tablist). */
  thumbnailGroup: 'data-ramka-thumbnail-group',
  /** Present when focus is inside the group. */
  focusWithin: 'data-focus-within',
} as const
export type LightboxThumbnailGroupDataAttributes =
  (typeof LightboxThumbnailGroupDataAttributes)[keyof typeof LightboxThumbnailGroupDataAttributes]

export const LightboxThumbnailDataAttributes = {
  /** Always present on the thumbnail button. */
  thumbnail: 'data-ramka-thumbnail',
  /** Present when this thumbnail’s index is active. */
  active: 'data-active',
  /** The thumbnail index as a string. */
  index: 'data-index',
} as const
export type LightboxThumbnailDataAttributes =
  (typeof LightboxThumbnailDataAttributes)[keyof typeof LightboxThumbnailDataAttributes]

export const LightboxThumbnailStripDataAttributes = {
  /** Always present on the thumbnail strip root. */
  root: 'data-ramka-thumbnail-strip',
  /** Always present on the scroll-linked tablist track. */
  track: 'data-ramka-thumbnail-strip-track',
  /** Present while a discrete-nav scrub animation is in flight. */
  scrubbing: 'data-scrubbing',
  /**
   * Present once the track has actually been positioned against the Slides
   * scroller (first successful measure-and-sync — set in a layout effect, so
   * for client-side opens it lands before the strip's first paint). Not set
   * by bailed attempts, e.g. while the Slides viewport hasn't registered yet.
   * Absent in server-rendered HTML: scroll/transform positions cannot be
   * serialized, so a server-rendered strip sits at offset 0 until hydration.
   * Hide the strip until this attribute lands to avoid the visible snap on
   * pages that server-render an open lightbox.
   */
  positioned: 'data-positioned',
} as const
export type LightboxThumbnailStripDataAttributes =
  (typeof LightboxThumbnailStripDataAttributes)[keyof typeof LightboxThumbnailStripDataAttributes]

export const LightboxMediaDataAttributes = {
  /** Always present on the media host. */
  media: 'data-ramka-media',
  /** Present while the open-morph placeholder canvas is bridging. */
  placeholder: 'data-placeholder',
  /** Present when a structural fit-box width is resolved (prop or img dims). */
  width: 'data-width',
  /** Present when a structural fit-box height is resolved (prop or img dims). */
  height: 'data-height',
} as const
export type LightboxMediaDataAttributes =
  (typeof LightboxMediaDataAttributes)[keyof typeof LightboxMediaDataAttributes]

export const LightboxZoomDataAttributes = {
  /** Always present on the zoom container. */
  host: 'data-ramka-zoom',
  /** Present when zoom > 1. */
  zoom: 'data-zoom',
  /** Present while panning with a pointer. */
  dragging: 'data-dragging',
} as const
export type LightboxZoomDataAttributes =
  (typeof LightboxZoomDataAttributes)[keyof typeof LightboxZoomDataAttributes]

export const LightboxZoomInDataAttributes = {
  /** Always present on the zoom-in button. */
  zoomIn: 'data-ramka-zoom-in',
  /** Present when zoom-in is unavailable. */
  disabled: 'data-disabled',
} as const
export type LightboxZoomInDataAttributes =
  (typeof LightboxZoomInDataAttributes)[keyof typeof LightboxZoomInDataAttributes]

export const LightboxZoomOutDataAttributes = {
  /** Always present on the zoom-out button. */
  zoomOut: 'data-ramka-zoom-out',
  /** Present when zoom-out is unavailable. */
  disabled: 'data-disabled',
} as const
export type LightboxZoomOutDataAttributes =
  (typeof LightboxZoomOutDataAttributes)[keyof typeof LightboxZoomOutDataAttributes]

export const LightboxDocumentDataAttributes = {
  /** Present during a morph. Value is `opening` or `closing`. */
  viewTransition: 'data-ramka-view-transition',
  /**
   * Present while the morph dissolves trigger↔item snapshots (Trigger
   * `crossfade` is active for this phase). Absent for the default hard-cut.
   */
  crossfade: 'data-ramka-crossfade',
  /**
   * Present during a morph. Value is the active `viewTransition` timing
   * preset name (`default`, `snappy`, `relaxed`, `spring`) — read by the
   * composited morph and available to skin CSS for per-preset styling.
   */
  viewTransitionPreset: 'data-ramka-vt-preset',
  /**
   * Present during a morph ONLY when the page declares foreign
   * `view-transition-name`s that must be neutralized so they don't ride
   * over the morph. Kept off otherwise: the rule's universal selector makes
   * the attribute flip a full-document style invalidation, which on large
   * DOMs is the dominant cost of starting (and finishing) a morph.
   */
  viewTransitionIsolate: 'data-ramka-vt-isolate',
} as const
export type LightboxDocumentDataAttributes =
  (typeof LightboxDocumentDataAttributes)[keyof typeof LightboxDocumentDataAttributes]

/**
 * Identity markers for every DOM-rendering Lightbox part.
 * Root is omitted (context provider only). Document-level attrs live on
 * `<html>` via `LightboxDocumentDataAttributes`, not here.
 *
 * When adding a new DOM primitive: add its `data-ramka-*` enum member, set it
 * on the host in the component, append it here, and extend
 * `lightbox-part-identity.test.tsx`.
 */
export const LIGHTBOX_PART_IDENTITY_ATTRIBUTES = [
  LightboxTriggerDataAttributes.trigger,
  LightboxPortalDataAttributes.portal,
  LightboxContentDataAttributes.content,
  LightboxBackdropDataAttributes.backdrop,
  LightboxCloseDataAttributes.close,
  LightboxStageDataAttributes.stage,
  LightboxItemDataAttributes.item,
  LightboxSlidesDataAttributes.slides,
  LightboxSlideDataAttributes.slide,
  LightboxPreviousDataAttributes.previous,
  LightboxNextDataAttributes.next,
  LightboxCounterDataAttributes.counter,
  LightboxCaptionDataAttributes.caption,
  LightboxThumbnailGroupDataAttributes.thumbnailGroup,
  LightboxThumbnailDataAttributes.thumbnail,
  LightboxThumbnailStripDataAttributes.root,
  LightboxThumbnailStripDataAttributes.track,
  LightboxMediaDataAttributes.media,
  LightboxZoomDataAttributes.host,
  LightboxZoomInDataAttributes.zoomIn,
  LightboxZoomOutDataAttributes.zoomOut,
] as const
