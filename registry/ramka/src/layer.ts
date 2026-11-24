/* @license Ramka Foldkit port. MIT. Copyright (c) 2026 Artur Bień. */
import { Option } from 'effect'
import { LightboxBlock, isOpenTarget } from './block.js'
import { LightboxComposition } from './composition.js'
import { Observe } from './host.js'
import { view } from './view.js'
import {
  acceptIndex,
  acceptOpen,
  boundedIndex,
  minZoom,
  navigate,
  openAt,
  pose,
  resetPose,
  setOpen,
  requestZoom,
  requestZoomIn,
  requestZoomOut,
  requestZoomReset,
  zoomIn,
  zoomOut,
  zoomReset,
} from './state.js'

export const layer = LightboxBlock.makeLayer({
  init: LightboxComposition.makeInit((config) => {
    const options = config.options ?? {}
    const initialOpen = (config.open ?? config.defaultOpen ?? false) && config.items.length > 0
    const index = Math.min(
      Math.max(0, config.value ?? config.defaultValue ?? 0),
      Math.max(0, config.items.length - 1),
    )
    return {
      model: {
        id: config.id,
        items: config.items,
        options,
        open: initialOpen,
        retainedPortal: false,
        initialPaint: true,
        gestureZooming: false,
        notifiedZoom: Math.max(0.1, config.items[index]?.zoom?.minZoom ?? options.minZoom ?? 1),
        index,
        origin: 0,
        triggerId: '',
        morphTargetId:
          initialOpen && options.morphTo !== 'origin' ? `${config.id}-trigger-${index}` : '',
        transitionSource: 'external',
        requestedOpen: Option.none(),
        zoomAnimationTarget: Option.none(),
        controlledOpen: Option.fromUndefinedOr(config.open),
        controlledValue: Option.fromUndefinedOr(config.value),
        generation: initialOpen ? 1 : 0,
        phase: initialOpen ? 'Opening' : 'Closed',
        zoom: Math.max(0.1, config.items[index]?.zoom?.minZoom ?? options.minZoom ?? 1),
        x: 0,
        y: 0,
        pull: 0,
        pullActive: false,
        pullAnimation: Option.none(),
        focusedThumbnailGroup: '',
        thumbnailScrubbing: false,
        thumbnailPositioned: false,
        placeholderIndices: [],
        triggers: [],
        pullX: 0,
        pullProgress: 0,
        pullScale: 1,
        scrolling: false,
        autoMaxZooms: config.items.map(() => 4),
        tracking: false,
        dragging: false,
        poseSample: 0,
        hasZoom: false,
        hasThumbnails: false,
        direction: 'forward',
        zoomIntentGeneration: 0,
        zoomIntent: Option.none(),
        source: 'trigger',
      },
    }
  }),
  update: LightboxComposition.makeUpdate({
    Opened: openAt,
    Dismissed: (model) => setOpen(model, { open: false }),
    Navigated: navigate,
    PoseRequested: pose,
    TriggerRegistryChanged: (model, { triggers }) => ({ model: { ...model, triggers } }),
    PlaceholdersChanged: (model, { indices }) => ({
      model: { ...model, placeholderIndices: indices },
    }),
    ThumbnailStateChanged: (model, { focused, scrubbing, positioned }) => ({
      model: {
        ...model,
        focusedThumbnailGroup: focused,
        thumbnailScrubbing: scrubbing,
        thumbnailPositioned: positioned,
      },
    }),
    PullChanged: (model, { offset, x, progress, scale, active, animation }) => ({
      model: Number.isFinite(offset)
        ? {
            ...model,
            pull: offset,
            pullActive: active ?? offset !== 0,
            pullAnimation: Option.fromUndefinedOr(animation),
            pullX: x ?? 0,
            pullProgress: progress ?? 0,
            pullScale: scale ?? 1,
          }
        : model,
    }),
    ZoomingChanged: (model, { zooming }) => ({
      model: model.gestureZooming === zooming ? model : { ...model, gestureZooming: zooming },
    }),
    InitialPaintRetired: (model) => ({
      model: model.initialPaint ? { ...model, initialPaint: false } : model,
    }),
    DraggingChanged: (model, { dragging }) => ({
      model: model.dragging === dragging ? model : { ...model, dragging },
    }),
    ScrollingChanged: (model, { scrolling }) => ({
      model: model.scrolling === scrolling ? model : { ...model, scrolling },
    }),
    VisibilityCommitted: (model, { generation, open, morphTargetId, retainPortal }) => ({
      model:
        model.generation !== generation || isOpenTarget(model) !== open
          ? model
          : {
              ...model,
              open,
              morphTargetId: morphTargetId ?? model.morphTargetId,
              retainedPortal: retainPortal ?? false,
              phase: open ? 'Opening' : 'Closing',
            },
    }),
    Settled: (model, { generation, open }) =>
      model.generation !== generation ||
      model.open !== open ||
      (open ? model.phase !== 'Opening' : model.phase !== 'Closing')
        ? { model }
        : {
            model: { ...(open ? model : resetPose(model)), phase: open ? 'Open' : 'Closed' },
            ...(model.transitionSource === 'internal'
              ? { outMessage: LightboxBlock.OutMessage.OpenChangeCompleted({ open }) }
              : {}),
          },
    ZoomedIn: zoomIn,
    ZoomedOut: zoomOut,
    ZoomReset: zoomReset,
    AvailabilityChanged: (model, { zoom, thumbnails }) => ({
      model:
        model.hasZoom === zoom && model.hasThumbnails === thumbnails
          ? model
          : { ...model, hasZoom: zoom, hasThumbnails: thumbnails },
    }),
    OpenerResolved: (model, { generation, id }) => ({
      model: generation === model.generation ? { ...model, triggerId: id } : model,
    }),
    MorphTargetChanged: (model, { id }) => ({
      model: model.morphTargetId === id ? model : { ...model, morphTargetId: id },
    }),
    MaximumMeasured: (model, { index, maxZoom }) => ({
      model:
        Number.isFinite(maxZoom) &&
        index < model.items.length &&
        maxZoom > 0 &&
        Math.abs((model.autoMaxZooms[index] ?? 4) - maxZoom) > 0.001
          ? {
              ...model,
              autoMaxZooms: model.items.map((_, itemIndex) =>
                itemIndex === index ? maxZoom : (model.autoMaxZooms[itemIndex] ?? 4),
              ),
            }
          : model,
    }),
    HostFailed: (model, { generation, detail }) =>
      generation === model.generation
        ? {
            model: { ...resetPose(model), open: false, phase: 'Closed' },
            outMessage: LightboxBlock.OutMessage.Failed({ detail }),
          }
        : { model },
  }),
  inMessageUpdate: LightboxComposition.makeInMessageUpdate({
    RequestedOpen: (model, message) => openAt(model, { ...message, source: 'imperative' }),
    RequestedClose: (model) => setOpen(model, { open: false }),
    RequestedNavigate: (model, message) =>
      navigate(model, { index: message.index, source: message.source ?? 'imperative' }),
    RequestedNext: (model) => navigate(model, { index: model.index + 1, source: 'imperative' }),
    RequestedPrevious: (model) => navigate(model, { index: model.index - 1, source: 'imperative' }),
    RequestedZoom: requestZoom,
    RequestedZoomIn: requestZoomIn,
    RequestedZoomOut: requestZoomOut,
    RequestedZoomReset: requestZoomReset,
    InformedOfOpen: (model, { open }) => {
      const internal = Option.isSome(model.requestedOpen) && model.requestedOpen.value === open
      return {
        model: acceptOpen(
          {
            ...model,
            controlledOpen: Option.some(open),
            requestedOpen: Option.none(),
            ...(open && !internal ? { triggerId: '', origin: model.index } : {}),
          },
          open && model.items.length > 0,
          !internal,
        ),
      }
    },
    InformedOfValue: (model, { index }) => ({
      model: acceptIndex({ ...model, controlledValue: Option.some(index) }, index),
    }),
    InformedOfControl: (model, { open, value }) => ({
      model: acceptIndex(
        acceptOpen(
          { ...model, controlledOpen: open, controlledValue: value },
          Option.getOrElse(open, () => isOpenTarget(model)),
          !Option.isSome(model.requestedOpen) ||
            !Option.isSome(open) ||
            model.requestedOpen.value !== open.value,
        ),
        Option.getOrElse(value, () => model.index),
      ),
    }),
    InformedOfItems: (model, { items }) => {
      const next = {
        ...model,
        items,
        autoMaxZooms: items.map((item) => {
          const previousIndex = model.items.findIndex((previous) => previous.id === item.id)
          return previousIndex < 0 ? 4 : (model.autoMaxZooms[previousIndex] ?? 4)
        }),
      }
      return {
        model: acceptOpen(
          acceptIndex(next, boundedIndex(next, model.index)),
          items.length === 0 ? false : isOpenTarget(model),
        ),
      }
    },
    InformedOfOptions: (model, { options }) => {
      const next = { ...model, options }
      return pose(next, { zoom: Math.max(minZoom(next), model.zoom), x: model.x, y: model.y })
    },
  }),
  view,
  EffectsLayer: Observe.layer,
})
