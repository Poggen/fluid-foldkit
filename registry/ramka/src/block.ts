/* @license Ramka Foldkit port. MIT. Copyright (c) 2026 Artur Bień. */
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import type { Html } from 'foldkit/html'
import { Environment } from './environment.js'
import type { PartContext } from './parts-contracts.js'
import type { Parts } from './view.js'

export const NavigationSource = Schema.Literals([
  'trigger',
  'keyboard',
  'thumbnail',
  'button',
  'scroll',
  'imperative',
])
export type NavigationSource = typeof NavigationSource.Type
export const ZoomOptions = Schema.Struct({
  minZoom: Schema.optionalKey(Schema.Number),
  maxZoom: Schema.optionalKey(Schema.Number),
  zoomStep: Schema.optionalKey(Schema.Number),
  scrollToZoom: Schema.optionalKey(Schema.Boolean),
  wheelSensitivity: Schema.optionalKey(Schema.Number),
  keyboardPanDistance: Schema.optionalKey(Schema.Number),
  doubleClickDelay: Schema.optionalKey(Schema.Number),
})
export type ZoomOptions = typeof ZoomOptions.Type
export const ItemDefinition = Schema.Struct({
  id: Schema.String,
  caption: Schema.optionalKey(Schema.String),
  alt: Schema.optionalKey(Schema.String),
  width: Schema.optionalKey(Schema.Number),
  height: Schema.optionalKey(Schema.Number),
  zoom: Schema.optionalKey(ZoomOptions),
})
export type ItemDefinition = typeof ItemDefinition.Type
const ScrollTrigger = Schema.Struct({
  type: Schema.Literals(['onChange', 'onOpenComplete', 'onClose']),
  behavior: Schema.optionalKey(Schema.Literals(['smooth', 'instant'])),
  block: Schema.optionalKey(Schema.Literals(['start', 'center', 'end', 'nearest'])),
  inline: Schema.optionalKey(Schema.Literals(['start', 'center', 'end', 'nearest'])),
})
export const Options = Schema.Struct({
  loop: Schema.optionalKey(Schema.Boolean),
  dir: Schema.optionalKey(Schema.Literals(['ltr', 'rtl'])),
  preload: Schema.optionalKey(Schema.Union([Schema.Natural, Schema.Literals(['all'])])),
  keepMounted: Schema.optionalKey(Schema.Boolean),
  viewTransition: Schema.optionalKey(
    Schema.Union([Schema.Boolean, Schema.Literals(['default', 'snappy', 'relaxed', 'spring'])]),
  ),
  morphTo: Schema.optionalKey(Schema.Literals(['active', 'origin', 'closest'])),
  scrollTriggerIntoView: Schema.optionalKey(
    Schema.Union([ScrollTrigger, Schema.Array(ScrollTrigger), Schema.Null]),
  ),
  minZoom: Schema.optionalKey(Schema.Number),
  maxZoom: Schema.optionalKey(Schema.Number),
  zoomStep: Schema.optionalKey(Schema.Number),
  scrollToZoom: Schema.optionalKey(Schema.Boolean),
  wheelSensitivity: Schema.optionalKey(Schema.Number),
  keyboardPanDistance: Schema.optionalKey(Schema.Number),
  doubleClickDelay: Schema.optionalKey(Schema.Number),
  pullToClose: Schema.optionalKey(Schema.Boolean),
  scrubOnSelect: Schema.optionalKey(Schema.Boolean),
  selectViewTransition: Schema.optionalKey(Schema.Boolean),
})
export type Options = typeof Options.Type
export const Config = Schema.Struct({
  id: Schema.String,
  items: Schema.Array(ItemDefinition),
  options: Schema.optionalKey(Options),
  defaultOpen: Schema.optionalKey(Schema.Boolean),
  defaultValue: Schema.optionalKey(Schema.Natural),
  open: Schema.optionalKey(Schema.Boolean),
  value: Schema.optionalKey(Schema.Natural),
})
export type Config = typeof Config.Type
export const Model = Schema.Struct({
  id: Schema.String,
  items: Schema.Array(ItemDefinition),
  options: Options,
  open: Schema.Boolean,
  retainedPortal: Schema.Boolean,
  initialPaint: Schema.Boolean,
  gestureZooming: Schema.Boolean,
  notifiedZoom: Schema.Number,
  index: Schema.Natural,
  origin: Schema.Natural,
  triggerId: Schema.String,
  morphTargetId: Schema.String,
  transitionSource: Schema.Literals(['internal', 'external']),
  requestedOpen: Schema.OptionFromNullOr(Schema.Boolean),
  zoomAnimationTarget: Schema.OptionFromNullOr(
    Schema.Struct({
      zoom: Schema.Number,
      x: Schema.Number,
      y: Schema.Number,
      changesZoom: Schema.Boolean,
    }),
  ),
  controlledOpen: Schema.OptionFromNullOr(Schema.Boolean),
  controlledValue: Schema.OptionFromNullOr(Schema.Natural),
  generation: Schema.Natural,
  phase: Schema.Literals(['Closed', 'Preparing', 'Opening', 'Open', 'Closing']),
  zoom: Schema.Number,
  x: Schema.Number,
  y: Schema.Number,
  pull: Schema.Number,
  pullActive: Schema.Boolean,
  pullAnimation: Schema.OptionFromNullOr(
    Schema.Struct({ duration: Schema.Number, easing: Schema.String }),
  ),
  focusedThumbnailGroup: Schema.String,
  thumbnailScrubbing: Schema.Boolean,
  thumbnailPositioned: Schema.Boolean,
  placeholderIndices: Schema.Array(Schema.Natural),
  triggers: Schema.Array(Schema.Struct({ id: Schema.String, index: Schema.Natural })),
  pullX: Schema.Number,
  pullProgress: Schema.Number,
  pullScale: Schema.Number,
  scrolling: Schema.Boolean,
  autoMaxZooms: Schema.Array(Schema.Number),
  tracking: Schema.Boolean,
  dragging: Schema.Boolean,
  poseSample: Schema.Natural,
  hasZoom: Schema.Boolean,
  hasThumbnails: Schema.Boolean,
  direction: Schema.Literals(['forward', 'backward']),
  zoomIntentGeneration: Schema.Natural,
  zoomIntent: Schema.OptionFromNullOr(
    Schema.Struct({
      generation: Schema.Natural,
      zoom: Schema.Number,
      x: Schema.optionalKey(Schema.Number),
      y: Schema.optionalKey(Schema.Number),
      focalX: Schema.optionalKey(Schema.Number),
      focalY: Schema.optionalKey(Schema.Number),
      rapid: Schema.optionalKey(Schema.Boolean),
    }),
  ),
  source: NavigationSource,
})
export type Model = typeof Model.Type
export interface ViewInputs {
  readonly portalContainerId?: string | null
  readonly label: string
  readonly carouselLabel: string
  readonly carouselRoleDescription?: string
  readonly hasThumbnails?: boolean
  readonly hasZoom?: boolean
  readonly item: (index: number, state: { readonly active: boolean; readonly zoom: number }) => Html
  readonly trigger?: (
    index: number,
    state: { readonly active: boolean; readonly open: boolean },
  ) => readonly (Html | string)[]
  readonly thumbnail?: (index: number) => readonly (Html | string)[]
  readonly caption?: (index: number) => readonly (Html | string)[]
  readonly render?: (parts: Parts, context: PartContext) => Html
  readonly closeLabel?: string
  readonly previousLabel?: string
  readonly nextLabel?: string
  readonly zoomInLabel?: string
  readonly zoomOutLabel?: string
  readonly thumbnailsLabel?: string
  readonly slideLabel?: (index: number, count: number) => string
  readonly className?: string
}
const Message = defineMessageUnion({
  Opened: { index: Schema.Natural, triggerId: Schema.String },
  Dismissed: {},
  Navigated: { index: Schema.Natural, source: NavigationSource },
  PoseRequested: {
    notify: Schema.optionalKey(Schema.Boolean),
    animationTarget: Schema.optionalKey(
      Schema.Struct({
        zoom: Schema.Number,
        x: Schema.Number,
        y: Schema.Number,
        changesZoom: Schema.Boolean,
      }),
    ),
    sample: Schema.optionalKey(Schema.Natural),
    zoom: Schema.Number,
    x: Schema.Number,
    y: Schema.Number,
    tracking: Schema.optionalKey(Schema.Boolean),
  },
  TriggerRegistryChanged: {
    triggers: Schema.Array(Schema.Struct({ id: Schema.String, index: Schema.Natural })),
  },
  PlaceholdersChanged: { indices: Schema.Array(Schema.Natural) },
  ThumbnailStateChanged: {
    focused: Schema.String,
    scrubbing: Schema.Boolean,
    positioned: Schema.Boolean,
  },
  PullChanged: {
    animation: Schema.optionalKey(
      Schema.Struct({ duration: Schema.Number, easing: Schema.String }),
    ),
    active: Schema.optionalKey(Schema.Boolean),
    offset: Schema.Number,
    x: Schema.optionalKey(Schema.Number),
    progress: Schema.optionalKey(Schema.Number),
    scale: Schema.optionalKey(Schema.Number),
  },
  ScrollingChanged: { scrolling: Schema.Boolean },
  DraggingChanged: { dragging: Schema.Boolean },
  ZoomingChanged: { zooming: Schema.Boolean },
  InitialPaintRetired: {},
  VisibilityCommitted: {
    generation: Schema.Natural,
    open: Schema.Boolean,
    morphTargetId: Schema.optionalKey(Schema.String),
    retainPortal: Schema.optionalKey(Schema.Boolean),
  },
  Settled: { generation: Schema.Natural, open: Schema.Boolean },
  ZoomedIn: {},
  ZoomedOut: {},
  ZoomReset: {},
  AvailabilityChanged: { zoom: Schema.Boolean, thumbnails: Schema.Boolean },
  MaximumMeasured: { index: Schema.Natural, maxZoom: Schema.Number },
  MorphTargetChanged: { id: Schema.String },
  OpenerResolved: { generation: Schema.Natural, id: Schema.String },
  HostFailed: { generation: Schema.Natural, detail: Schema.String },
})
const InMessage = defineInMessageUnion({
  RequestedOpen: {
    index: Schema.optionalKey(Schema.Natural),
    triggerId: Schema.optionalKey(Schema.String),
  },
  RequestedClose: {},
  RequestedNavigate: { index: Schema.Natural, source: Schema.optionalKey(NavigationSource) },
  RequestedNext: {},
  RequestedPrevious: {},
  RequestedZoom: {
    zoom: Schema.Number,
    x: Schema.optionalKey(Schema.Number),
    y: Schema.optionalKey(Schema.Number),
    rapid: Schema.optionalKey(Schema.Boolean),
    focalX: Schema.optionalKey(Schema.Number),
    focalY: Schema.optionalKey(Schema.Number),
  },
  RequestedZoomIn: {},
  RequestedZoomOut: {},
  RequestedZoomReset: { rapid: Schema.optionalKey(Schema.Boolean) },
  InformedOfOpen: { open: Schema.Boolean },
  InformedOfValue: { index: Schema.Natural },
  InformedOfControl: {
    open: Schema.OptionFromNullOr(Schema.Boolean),
    value: Schema.OptionFromNullOr(Schema.Natural),
  },
  InformedOfItems: { items: Schema.Array(ItemDefinition) },
  InformedOfOptions: { options: Options },
})
const OutMessage = defineMessageUnion({
  Changed: {
    open: Schema.Boolean,
    index: Schema.Natural,
    openChanged: Schema.Boolean,
    valueChanged: Schema.Boolean,
    source: NavigationSource,
  },
  OpenChanged: { open: Schema.Boolean },
  ValueChanged: { index: Schema.Natural, source: NavigationSource },
  OpenChangeCompleted: { open: Schema.Boolean },
  ZoomChanged: { zoom: Schema.Number },
  Failed: { detail: Schema.String },
})
export const RamkaLightboxNamespace = Block.makeNamespace('RamkaLightbox')
export const LightboxKey = Symbol('RamkaLightbox')
export const LightboxBlock = Block.make(RamkaLightboxNamespace, {
  key: LightboxKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([Config]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ViewInputs>() },
  effects: Block.makeEffectsContract<never, Environment>(),
  inMessageOutputs: {
    RequestedOpen: { outMessage: OutMessage.Changed },
    RequestedClose: { outMessage: OutMessage.OpenChanged },
    RequestedNavigate: { outMessage: OutMessage.ValueChanged },
    RequestedNext: { outMessage: OutMessage.ValueChanged },
    RequestedPrevious: { outMessage: OutMessage.ValueChanged },
    RequestedZoom: { outMessage: OutMessage.ZoomChanged },
    RequestedZoomIn: { outMessage: OutMessage.ZoomChanged },
    RequestedZoomOut: { outMessage: OutMessage.ZoomChanged },
    RequestedZoomReset: { outMessage: OutMessage.ZoomChanged },
    InformedOfOptions: { outMessage: OutMessage.ZoomChanged },
  },
})
export const isOpen = (model: Model) => model.open
export const isOpenTarget = (model: Model) => model.phase !== 'Closed' && model.phase !== 'Closing'
export const activeIndex = (model: Model) => model.index
export const zoomState = (model: Model) => ({
  zoom: model.zoom,
  maxZoom: Math.max(
    model.items[model.index]?.zoom?.minZoom ?? model.options.minZoom ?? 1,
    model.items[model.index]?.zoom?.maxZoom ??
      model.options.maxZoom ??
      model.autoMaxZooms[model.index] ??
      4,
  ),
  offsetX: model.x,
  offsetY: model.y,
})
