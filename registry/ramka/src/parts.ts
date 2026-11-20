/* @license Ramka Foldkit adaptation. MIT. Upstream copyright (c) 2026 Artur Bień. */
import { Schema } from 'effect'
import { getTriggerContext } from './context.js'
import { childAttributes } from 'foldkit/html'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import {
  LightboxBackdropDataAttributes as BackdropData,
  LightboxCaptionDataAttributes as CaptionData,
  LightboxCloseDataAttributes as CloseData,
  LightboxContentDataAttributes as ContentData,
  LightboxCounterDataAttributes as CounterData,
  LightboxItemDataAttributes as ItemData,
  LightboxMediaDataAttributes as MediaData,
  LightboxNextDataAttributes as NextData,
  LightboxPortalDataAttributes as PortalData,
  LightboxPreviousDataAttributes as PreviousData,
  LightboxSlideDataAttributes as SlideData,
  LightboxSlidesDataAttributes as SlidesData,
  LightboxStageDataAttributes as StageData,
  LightboxThumbnailDataAttributes as ThumbnailData,
  LightboxThumbnailGroupDataAttributes as GroupData,
  LightboxThumbnailStripDataAttributes as StripData,
  LightboxTriggerDataAttributes as TriggerData,
  LightboxZoomDataAttributes as ZoomData,
  LightboxZoomInDataAttributes as ZoomInData,
  LightboxZoomOutDataAttributes as ZoomOutData,
} from './upstream/lightbox-data-attributes.js'
import {
  LightboxContentCssVars,
  LightboxDocumentCssVars,
  LightboxSlidesCssVars,
} from './upstream/lightbox-css-vars.js'
import type {
  BackdropProps,
  ButtonProps,
  CaptionProps,
  CloseProps,
  ContentProps,
  CounterProps,
  CSPProviderProps,
  ItemProps,
  ItemState,
  MediaProps,
  NextProps,
  PartAttributes,
  PartChildren,
  PartContext,
  PartProps,
  PortalProps,
  PreviousProps,
  SlideProps,
  SlidesProps,
  StageProps,
  ThumbnailGroupProps,
  ThumbnailProps,
  ThumbnailStripProps,
  ThumbnailStripTrackProps,
  TriggerProps,
  ZoomInProps,
  ZoomOutProps,
  ZoomProps,
  ZoomState,
} from './parts-contracts.js'

export type {
  PartChildren,
  PartAttributes,
  NavigationSource,
  PartContext,
  EmptyState,
  TriggerState,
  OpenState,
  DisabledState,
  SlidesState,
  MediaState,
  CaptionState,
  ThumbnailState,
  ThumbnailGroupState,
  ThumbnailStripState,
  PartProps,
  TriggerProps,
  PortalProps,
  ContentProps,
  BackdropProps,
  ButtonProps,
  CloseProps,
  StageProps,
  SlidesProps,
  SlideProps,
  ItemState,
  ItemProps,
  MediaProps,
  PreviousProps,
  NextProps,
  CounterState,
  CounterProps,
  CaptionProps,
  ThumbnailGroupProps,
  ThumbnailProps,
  ThumbnailStripProps,
  ThumbnailStripTrackProps,
  ZoomState,
  ZoomProps,
  ZoomInProps,
  ZoomOutProps,
  CSPProviderProps,
} from './parts-contracts.js'

export function Trigger<Message, Requirements>(
  props: TriggerProps,
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  const active = context.open && props.index === context.index
  const triggerId = props.id ?? `${context.id}-trigger-${props.index}`
  const morphTarget = context.ssr
    ? active && context.morphTo !== 'origin'
    : (getTriggerContext(context, props.index, triggerId)?.morphTarget ?? false)
  const expanded =
    context.open &&
    (context.openerId === undefined
      ? context.openerIndex !== undefined && props.index === context.openerIndex
      : triggerId === context.openerId)
  return renderPart(
    props,
    [
      h.Type('button'),
      h.Id(triggerId),
      h.Attribute(TriggerData.trigger, ''),
      h.Attribute('data-index', String(props.index)),
      h.AriaHasPopup('dialog'),
      h.AriaExpanded(expanded),
      ...(context.open
        ? [h.Attribute(TriggerData.open, ''), h.AriaControls(`${context.id}-content`)]
        : []),
      ...(active ? [h.Attribute(TriggerData.active, '')] : []),
      ...(morphTarget ? [h.Attribute(TriggerData.morphTarget, '')] : []),
      ...(props.crossfade ? [h.Attribute(TriggerData.crossfade, props.crossfade)] : []),
      ...context.openAt(props.index, triggerId),
      h.Disabled(props.disabled ?? false),
      ...(props.attributes ?? []),
    ],
    props.children ?? [],
    h.button,
    {
      open: context.open,
      active,
      morphTarget: getTriggerContext(context, props.index, triggerId)?.morphTarget ?? false,
    },
  )
}

/** Structural host only. Placement is acquired by the owning Block resource. */
export function Portal<Message, Requirements>(
  props: PortalProps,
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  if (context.mounted === false && !context.keepMounted) return h.empty
  return renderPart(
    props,
    [
      h.Attribute(PortalData.portal, ''),
      ...(context.dirAttribute === undefined ? [] : [h.Dir(context.dirAttribute)]),
      h.Style({
        [LightboxDocumentCssVars.vtDuration]: context.vtDuration ?? '360ms',
        [LightboxDocumentCssVars.vtEasing]: context.vtEasing ?? 'ease',
        [LightboxDocumentCssVars.vtRootEasing]: context.vtRootEasing ?? 'ease',
      }),
      ...(props.attributes ?? []),
      ...(context.preparing || context.parked
        ? [h.Style({ visibility: 'hidden', 'pointer-events': 'none' })]
        : []),
    ],
    props.children ?? [],
    h.div,
    {},
  )
}

/** The host owns showModal/close. Server paint uses nonmodal open until hydration promotes it. */
export function Content<Message, Requirements>(
  props: ContentProps,
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  const zoomRange = Math.max(0.01, Math.min(context.maxZoom, context.minZoom + 1) - context.minZoom)
  const zoomProgress = Math.max(0, Math.min(1, (context.zoom - context.minZoom) / zoomRange))
  const zoomed =
    zoomProgress > 0 ||
    (context.zoomAnimationTarget !== undefined && (context.zoomAnimationChangesZoom ?? true))
  return renderPart(
    props,
    [
      h.Id(`${context.id}-content`),
      h.Attribute(ContentData.content, ''),
      h.Open(context.nativeOpen ?? context.open),
      h.Attribute(context.open ? ContentData.open : ContentData.closed, ''),
      ...(context.dirAttribute === undefined ? [] : [h.Dir(context.dirAttribute)]),
      ...((context.parked ?? !context.open)
        ? [h.AriaHidden(true), h.Inert(true)]
        : [h.AriaModal(true), h.Tabindex(-1)]),
      ...(props.label === undefined ? [] : [h.AriaLabel(props.label)]),
      ...(context.pulling ? [h.Attribute(ContentData.pulling, '')] : []),
      ...(context.pullSnapping ? [h.Attribute(ContentData.pullSnapping, '')] : []),
      ...(context.pullDismissing ? [h.Attribute(ContentData.pullDismissing, '')] : []),
      ...(context.zooming ? [h.Attribute(ContentData.zooming, '')] : []),
      ...(zoomed ? [h.Attribute(ContentData.zoomed, '')] : []),
      h.Style({
        [LightboxContentCssVars.pullProgress]: String(context.pullProgress ?? 0),
        ...(zoomed ? { [LightboxContentCssVars.zoomProgress]: String(zoomProgress) } : {}),
        ...(context.pullSnapDuration === undefined
          ? {}
          : { [LightboxContentCssVars.pullSnapDuration]: context.pullSnapDuration }),
        ...(context.pullSnapEasing === undefined
          ? {}
          : { [LightboxContentCssVars.pullSnapEasing]: context.pullSnapEasing }),
      }),
      ...(context.contentAttributes ?? []),
      ...(props.attributes ?? []),
      ...(context.preparing || (context.parked ?? !context.open)
        ? [h.Style({ visibility: 'hidden', 'pointer-events': 'none' })]
        : []),
    ],
    props.children ?? [],
    h.dialog,
    { open: context.open },
  )
}

export function Backdrop<Message, Requirements>(
  props: BackdropProps,
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  return renderPart(
    props,
    [
      h.Attribute(BackdropData.backdrop, ''),
      h.AriaHidden(true),
      h.Inert(context.parked ?? !context.open),
      ...(context.preparing || (context.parked ?? !context.open)
        ? [h.Style({ visibility: 'hidden', 'pointer-events': 'none' })]
        : []),
      h.Attribute(context.open ? BackdropData.open : BackdropData.closed, ''),
      ...(context.pulling ? [h.Attribute(BackdropData.pulling, '')] : []),
      ...(context.pullSnapping ? [h.Attribute(BackdropData.pullSnapping, '')] : []),
      ...context.close,
      ...(props.attributes ?? []),
    ],
    props.children ?? [],
    h.div,
    { open: context.open },
  )
}

export function Close<Message, Requirements>(
  props: CloseProps,
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  return renderPart(
    props,
    [
      h.Type('button'),
      h.Attribute(CloseData.close, ''),
      h.Disabled(props.disabled ?? false),
      ...(props.label === undefined ? [] : [h.AriaLabel(props.label)]),
      ...context.close,
      ...(props.attributes ?? []),
    ],
    props.children ?? [],
    h.button,
    {},
  )
}

export function Stage<Message, Requirements>(
  props: StageProps,
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  return renderPart(
    props,
    [
      h.Attribute(StageData.stage, ''),
      ...(context.stageAttributes ?? []),
      ...(props.attributes ?? []),
    ],
    props.children ?? [],
    h.div,
    {},
  )
}

export function Slides<Message, Requirements>(
  props: SlidesProps,
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  const shifted = context.ssr === true && props.ssrSlideShift === true
  return renderPart(
    props,
    [
      h.Attribute(SlidesData.slides, ''),
      h.Attribute(SlidesData.activeIndex, String(context.index)),
      ...(shifted
        ? [
            h.Attribute(SlidesData.ssrShift, ''),
            h.Style({
              [LightboxSlidesCssVars.ssrIndex]: String(context.index),
              [LightboxSlidesCssVars.ssrShiftSign]: context.dir === 'rtl' ? '1' : '-1',
            }),
          ]
        : []),
      h.Attribute(SlidesData.direction, context.direction ?? 'forward'),
      h.Attribute(SlidesData.orientation, 'horizontal'),
      ...(context.dirAttribute === undefined ? [] : [h.Dir(context.dirAttribute)]),
      h.Role('group'),
      ...(props.label === undefined ? [] : [h.AriaLabel(props.label)]),
      ...(props.roleDescription === undefined
        ? []
        : [h.AriaRoleDescription(props.roleDescription)]),
      ...(context.slidesAttributes ?? []),
      ...(props.attributes ?? []),
    ],
    props.children ?? [],
    h.div,
    {
      activeIndex: context.index,
      direction: context.direction ?? 'forward',
      orientation: 'horizontal',
    },
  )
}

/** Snap boxes stay mounted even when their Item children are outside preload. */
export function Slide<Message, Requirements>(
  props: SlideProps,
  _context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  return renderPart(
    props,
    [
      h.Key(`slide-${props.index}`),
      h.Attribute(SlideData.slide, ''),
      h.Attribute('data-index', String(props.index)),
      ...(props.attributes ?? []),
    ],
    props.children ?? [],
    h.div,
    {},
  )
}

export function Item<Message, Requirements>(
  props: ItemProps,
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  const linear = Math.abs(props.index - context.index)
  const distance =
    context.loop && context.count > 0 ? Math.min(linear, context.count - linear) : linear
  const state: ItemState = {
    index: props.index,
    active: props.index === context.index,
    visible: !context.inSlides || distance <= (props.preload ?? context.preload),
  }
  if (!state.visible) return h.empty
  const children =
    typeof props.children === 'function' ? props.children(state) : (props.children ?? [])
  return renderPart(
    props,
    [
      h.Key(`item-${props.index}`),
      h.Id(`${context.id}-panel-${props.index}`),
      h.Attribute(ItemData.item, ''),
      h.Attribute(ItemData.index, String(props.index)),
      ...(state.active
        ? [
            h.Attribute(ItemData.active, ''),
            ...(context.ssr ? [h.Attribute(ItemData.ssrActive, '')] : []),
          ]
        : []),
      ...(context.hasThumbnails
        ? [h.Role('tabpanel'), h.AriaLabelledBy(`${context.id}-tab-${props.index}`)]
        : [
            h.Role('group'),
            ...(props.roleDescription === undefined
              ? []
              : [h.AriaRoleDescription(props.roleDescription)]),
          ]),
      ...(props.label === undefined ? [] : [h.AriaLabel(props.label)]),
      h.AriaHidden(!state.active),
      h.Inert(!state.active),
      ...(props.attributes ?? []),
    ],
    children,
    h.div,
    state,
  )
}

/** Caller-authored img/picture/video/live Html retains its native responsive attributes. */
export function Media<Message, Requirements>(
  props: MediaProps,
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  const placeholder =
    props.placeholder ?? context.placeholderIndices?.includes(props.index ?? context.index) ?? false
  const width = props.width
  const height = props.height
  const fit = width !== undefined && height !== undefined && width > 0 && height > 0
  return renderPart(
    props,
    [
      h.Attribute(MediaData.media, ''),
      ...(placeholder ? [h.Attribute(MediaData.placeholder, '')] : []),
      ...(fit
        ? [
            h.Attribute(MediaData.width, String(width)),
            h.Attribute(MediaData.height, String(height)),
            h.Style({
              width: `min(100cqw, calc(100cqh * ${width / height}))`,
              'aspect-ratio': `${width} / ${height}`,
            }),
          ]
        : []),
      ...(props.attributes ?? []),
    ],
    props.children ?? [],
    h.div,
    { placeholder },
  )
}

export function Previous<Message, Requirements>(
  props: PreviousProps,
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  const disabled = !context.loop && context.index <= 0
  return control(props, PreviousData.previous, disabled, context.previous, h, PreviousData.disabled)
}

export function Next<Message, Requirements>(
  props: NextProps,
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  const disabled = !context.loop && context.index >= context.count - 1
  return control(props, NextData.next, disabled, context.next, h, NextData.disabled)
}

export function Counter<Message, Requirements>(
  props: CounterProps,
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  const state = { current: context.index + 1, total: context.count }
  return renderPart(
    props,
    [
      h.Attribute(CounterData.counter, ''),
      h.AriaLive('polite'),
      h.AriaAtomic(true),
      ...(props.attributes ?? []),
    ],
    props.format?.(state) ?? [`${state.current} / ${state.total}`],
    h.div,
    state,
  )
}

export function Caption<Message, Requirements>(
  props: CaptionProps,
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  const caption =
    context.caption ?? (context.captionRegistryEmpty === false ? undefined : props.children)
  const hasCaption = caption !== undefined
  const children = caption ?? []
  return renderPart(
    props,
    [
      h.Attribute(CaptionData.caption, ''),
      h.AriaLive('polite'),
      h.AriaAtomic(true),
      ...(hasCaption ? [h.Attribute(CaptionData.hasCaption, '')] : []),
      ...(props.attributes ?? []),
    ],
    children,
    h.div,
    { index: context.index, hasCaption },
  )
}

export function ThumbnailGroup<Message, Requirements>(
  props: ThumbnailGroupProps,
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  return thumbnailGroup(props, context, h, GroupData.thumbnailGroup)
}

export function Thumbnail<Message, Requirements>(
  props: ThumbnailProps,
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  const active = props.index === context.index
  return renderPart(
    props,
    [
      h.Type('button'),
      h.Role('tab'),
      h.Id(`${context.id}-tab-${props.index}`),
      h.Attribute(ThumbnailData.thumbnail, ''),
      h.Attribute(ThumbnailData.index, String(props.index)),
      ...(active ? [h.Attribute(ThumbnailData.active, '')] : []),
      h.AriaControls(`${context.id}-panel-${props.index}`),
      h.AriaSelected(active),
      h.Tabindex(active ? 0 : -1),
      ...(props.label === undefined ? [] : [h.AriaLabel(props.label)]),
      ...context.navigate(props.index, 'thumbnail'),
      h.Disabled(props.disabled ?? false),
      ...(props.attributes ?? []),
    ],
    props.children ?? [],
    h.button,
    { active, index: props.index },
  )
}

export function ThumbnailStrip<Message, Requirements>(
  props: ThumbnailStripProps,
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  return renderPart(
    props,
    [
      h.Attribute(StripData.root, ''),
      ...(context.thumbnailStripScrubbing ? [h.Attribute(StripData.scrubbing, '')] : []),
      ...(context.thumbnailStripPositioned ? [h.Attribute(StripData.positioned, '')] : []),
      ...(context.thumbnailStripAttributes ?? []),
      ...(props.attributes ?? []),
    ],
    props.children ?? [],
    h.div,
    {
      scrubbing: context.thumbnailStripScrubbing ?? false,
      positioned: context.thumbnailStripPositioned ?? false,
    },
  )
}

export function ThumbnailStripTrack<Message, Requirements>(
  props: ThumbnailStripTrackProps,
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  return thumbnailGroup(props, context, h, StripData.track)
}

export function Zoom<Message, Requirements>(
  props: ZoomProps,
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  const active = props.index === undefined || props.index === context.index
  const bounds = context.zoomBounds?.[props.index ?? context.index]
  const minZoom = bounds?.minZoom ?? context.minZoom
  const maxZoom = bounds?.maxZoom ?? context.maxZoom
  const visualZoom = active ? context.zoom : minZoom
  const visualX = active ? context.x : 0
  const visualY = active ? context.y : 0
  const zoom = active ? (context.zoomAnimationTarget ?? context.zoom) : minZoom
  const x = active ? (context.zoomAnimationX ?? context.x) : 0
  const y = active ? (context.zoomAnimationY ?? context.y) : 0
  const state: ZoomState = {
    zoom,
    maxZoom: maxZoom,
    offsetX: x,
    offsetY: y,
    canZoomIn: zoom < maxZoom,
    canZoomOut: zoom > minZoom,
    dragging: active && (context.dragging ?? false),
  }
  const children =
    typeof props.children === 'function' ? props.children(state) : (props.children ?? [])
  return renderPart(
    props,
    [
      h.Attribute(ZoomData.host, ''),
      ...(zoom > 1 ? [h.Attribute(ZoomData.zoom, '')] : []),
      h.Style({ 'touch-action': zoom > minZoom ? 'none' : 'pan-x pan-y' }),
      ...(state.dragging ? [h.Attribute(ZoomData.dragging, '')] : []),
      ...(active ? (context.zoomAttributes ?? []) : []),
      ...(props.attributes ?? []),
    ],
    [
      h.div(
        [
          h.Attribute('data-lightbox-transform', ''),
          h.Style({
            transform: `scale(${visualZoom}) translate(${visualX}px, ${visualY}px)`,
            'will-change': active ? 'transform' : 'auto',
          }),
        ],
        children,
      ),
    ],
    h.div,
    state,
  )
}

export function ZoomIn<Message, Requirements>(
  props: ZoomInProps,
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  return control(
    props,
    ZoomInData.zoomIn,
    context.zoomAvailable === false ||
      (context.zoomAnimationTarget ?? context.zoom) >= context.maxZoom,
    context.zoomIn,
    h,
    ZoomInData.disabled,
  )
}

export function ZoomOut<Message, Requirements>(
  props: ZoomOutProps,
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  return control(
    props,
    ZoomOutData.zoomOut,
    context.zoomAvailable === false ||
      (context.zoomAnimationTarget ?? context.zoom) <= context.minZoom,
    context.zoomOut,
    h,
    ZoomOutData.disabled,
  )
}

/** Explicit CSP nonce equivalent; render the shared structural CSS once. */
export function CSPProvider<Message, Requirements>(
  props: CSPProviderProps,
  _context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
) {
  return renderPart(
    props,
    [
      h.Attribute('nonce', props.nonce),
      h.Attribute('data-ramka-styles', ''),
      ...(props.attributes ?? []),
    ],
    [props.css],
    h.style,
    {},
  )
}

function control<Message, Requirements>(
  props: ButtonProps,
  identity: string,
  disabled: boolean,
  events: PartContext['close'],
  h: HtmlBuilder<Message, Requirements>,
  disabledAttribute?: string,
) {
  return renderPart(
    props,
    [
      h.Type('button'),
      h.Attribute(identity, ''),
      ...(disabled && disabledAttribute ? [h.Attribute(disabledAttribute, '')] : []),
      ...(props.label === undefined ? [] : [h.AriaLabel(props.label)]),
      ...events,
      h.Disabled(props.disabled ?? disabled),
      ...(props.attributes ?? []),
    ],
    props.children ?? [],
    h.button,
    { disabled },
  )
}

function thumbnailGroup<Message, Requirements>(
  props: ThumbnailGroupProps,
  context: PartContext,
  h: HtmlBuilder<Message, Requirements>,
  identity: string,
) {
  const focusWithin =
    context.thumbnailGroupId === undefined
      ? (context.focusWithin ?? false)
      : context.focusedThumbnailGroup === context.thumbnailGroupId
  return renderPart(
    props,
    [
      h.Attribute(GroupData.thumbnailGroup, ''),
      ...(context.thumbnailGroupId === undefined
        ? []
        : [h.DataAttribute('ramka-group-id', context.thumbnailGroupId)]),
      ...(identity === GroupData.thumbnailGroup ? [] : [h.Attribute(identity, '')]),
      h.Role('tablist'),
      h.AriaOrientation('horizontal'),
      ...(context.dirAttribute === undefined ? [] : [h.Dir(context.dirAttribute)]),
      ...(focusWithin ? [h.Attribute(GroupData.focusWithin, '')] : []),
      ...(props.label === undefined ? [] : [h.AriaLabel(props.label)]),
      ...(context.thumbnailGroupAttributes ?? []),
      ...(props.attributes ?? []),
    ],
    props.children ?? [],
    h.div,
    { focusWithin },
  )
}

function renderPart<Message, State>(
  props: Pick<PartProps<State>, 'render' | 'attributes'>,
  attributes: ReadonlyArray<Attribute<Message>>,
  children: PartChildren,
  native: (attributes: ReadonlyArray<Attribute<Message>>, children: PartChildren) => Html,
  state: State,
) {
  const merged = mergePartAttributes(attributes, props.attributes ?? [])
  if (props.render === undefined) return native(merged, children)
  const bound: PartAttributes = merged.flatMap((attribute) =>
    '_tag' in attribute ? childAttributes([attribute]) : [attribute],
  )
  return props.render(bound, children, state)
}

const isStyleAttribute = Schema.is(
  Schema.Struct({
    _tag: Schema.Literal('Style'),
    value: Schema.Record(Schema.String, Schema.String),
  }),
)
const isClassAttribute = Schema.is(
  Schema.Struct({
    _tag: Schema.Literal('Class'),
    value: Schema.String,
  }),
)

function mergePartAttributes<Message>(
  attributes: ReadonlyArray<Attribute<Message>>,
  callerAttributes: PartAttributes,
) {
  const callerEvents = callerAttributes.filter(
    ({ attribute }) =>
      attribute._tag.startsWith('On') &&
      attribute._tag !== 'OnMount' &&
      attribute._tag !== 'OnUnmount',
  )
  const movedEvents = new Set<Attribute<Message>>(callerEvents)
  const merged: Array<Attribute<Message>> = [...callerEvents]
  let styles: Record<string, string> | undefined
  const classes: Array<string> = []
  for (const attribute of attributes) {
    if (movedEvents.has(attribute)) continue
    const value = '_tag' in attribute ? attribute : attribute.attribute
    if (isStyleAttribute(value)) styles = { ...styles, ...value.value }
    else if (isClassAttribute(value)) classes.unshift(value.value)
    else merged.push(attribute)
  }
  if (styles !== undefined) merged.push({ _tag: 'Style', value: styles })
  if (classes.length > 0) merged.push({ _tag: 'Class', value: classes.join(' ') })
  return merged
}
