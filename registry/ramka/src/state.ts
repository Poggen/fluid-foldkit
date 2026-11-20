/* @license Ramka Foldkit port. MIT. Copyright (c) 2026 Artur Bień. */
import { Option } from 'effect'
import { LightboxBlock, isOpenTarget } from './block.js'
import type { Model, NavigationSource } from './block.js'

export const boundedIndex = (model: Model, index: number) => {
  const count = model.items.length
  if (count === 0) return 0
  const whole = Number.isFinite(index) ? Math.trunc(index) : 0
  return model.options.loop
    ? ((whole % count) + count) % count
    : Math.max(0, Math.min(count - 1, whole))
}
export const minZoom = (model: Model) =>
  Math.max(0.1, model.items[model.index]?.zoom?.minZoom ?? model.options.minZoom ?? 1)
export const maxZoom = (model: Model) =>
  Math.max(
    minZoom(model),
    model.items[model.index]?.zoom?.maxZoom ??
      model.options.maxZoom ??
      model.autoMaxZooms[model.index] ??
      4,
  )
export const resetPose = (model: Model) => ({
  ...model,
  zoom: minZoom(model),
  notifiedZoom: minZoom(model),
  retainedPortal: false,
  x: 0,
  y: 0,
  pull: 0,
  pullActive: false,
  pullAnimation: Option.none(),
  pullX: 0,
  pullProgress: 0,
  pullScale: 1,
  tracking: false,
  dragging: false,
  gestureZooming: false,
  zoomIntent: Option.none(),
  zoomAnimationTarget: Option.none(),
})
export const acceptOpen = (model: Model, open: boolean, external = false, force = false) =>
  isOpenTarget(model) === open && !force
    ? model
    : ({
        ...(open ? resetPose(model) : model),
        scrolling: false,
        transitionSource: external ? 'external' : 'internal',
        requestedOpen: Option.none(),
        zoomIntent: Option.none(),
        open: model.open,
        retainedPortal: false,
        phase: open ? 'Preparing' : 'Closing',
        generation: model.generation + 1,
      } satisfies Model)
export const acceptIndex = (model: Model, index: number) => {
  const next = boundedIndex(model, index)
  return next === model.index
    ? model
    : resetPose({
        ...model,
        index: next,
        direction: next > model.index ? 'forward' : 'backward',
      })
}
export const navigate = LightboxBlock.makeStep(
  (model, input: { readonly index: number; readonly source: NavigationSource }) => {
    if (model.scrolling && ['keyboard', 'thumbnail', 'button'].includes(input.source))
      return { model }
    const index = boundedIndex(model, input.index)
    if (index === model.index && input.source === 'scroll') return { model }
    return {
      model: Option.isSome(model.controlledValue)
        ? model
        : { ...acceptIndex(model, index), source: input.source },
      outMessage: LightboxBlock.OutMessage.ValueChanged({ index, source: input.source }),
    }
  },
)
export const setOpen = LightboxBlock.makeStep(
  (model, input: { readonly open: boolean; readonly triggerId?: string }) => {
    if (
      (isOpenTarget(model) === input.open &&
        (!Option.isSome(model.requestedOpen) || model.requestedOpen.value === input.open)) ||
      (input.open && model.items.length === 0)
    )
      return { model }
    const requested = input.open
      ? { ...model, origin: model.index, triggerId: input.triggerId ?? '' }
      : model
    return {
      model: Option.isSome(model.controlledOpen)
        ? { ...requested, requestedOpen: Option.some(input.open) }
        : acceptOpen(requested, input.open),
      outMessage: LightboxBlock.OutMessage.OpenChanged({ open: input.open }),
    }
  },
)
export const openAt = LightboxBlock.makeStep(
  (
    model,
    input: {
      readonly index?: number
      readonly triggerId?: string
      readonly source?: 'trigger' | 'imperative'
    },
  ) => {
    if (model.items.length === 0) return { model }
    const registered = input.triggerId
      ? model.triggers.find((trigger) => trigger.id === input.triggerId)
      : undefined
    const index = boundedIndex(model, input.index ?? registered?.index ?? model.index)
    const valueChanged =
      index !== model.index || input.index !== undefined || registered !== undefined
    const source = input.source ?? 'trigger'
    const openChanged = !isOpenTarget(model)
    const restart = isOpenTarget(model) && model.phase === 'Preparing'
    if (!valueChanged && !openChanged) return { model }
    const selected = Option.isSome(model.controlledValue) ? model : acceptIndex(model, index)
    const associated = {
      ...selected,
      generation: selected.generation + (restart && Option.isSome(model.controlledOpen) ? 1 : 0),
      origin: index,
      triggerId: source === 'imperative' ? (registered?.id ?? '') : (input.triggerId ?? ''),
      source,
    } satisfies Model
    const next = Option.isSome(model.controlledOpen)
      ? { ...associated, requestedOpen: Option.some(true) }
      : acceptOpen(associated, true, false, restart)
    return {
      model: next,
      outMessage: LightboxBlock.OutMessage.Changed({
        open: true,
        index,
        openChanged,
        valueChanged,
        source,
      }),
    }
  },
)
export const pose = LightboxBlock.makeStep(
  (
    model,
    input: {
      readonly zoom: number
      readonly notify?: boolean
      readonly animationTarget?: {
        readonly zoom: number
        readonly x: number
        readonly y: number
        readonly changesZoom: boolean
      }
      readonly sample?: number
      readonly x?: number
      readonly y?: number
      readonly tracking?: boolean
    },
  ) => {
    if (![input.zoom, input.x ?? 0, input.y ?? 0].every(Number.isFinite)) return { model }
    const zoom = input.tracking
      ? Math.max(minZoom(model) * 0.2, Math.min(maxZoom(model) * 2, input.zoom))
      : Math.max(minZoom(model), Math.min(maxZoom(model), input.zoom))
    const notification =
      input.notify === false ? model.notifiedZoom : (input.animationTarget?.zoom ?? zoom)
    const x = zoom <= 1 && !input.tracking ? 0 : (input.x ?? model.x)
    const y = zoom <= 1 && !input.tracking ? 0 : (input.y ?? model.y)
    if (
      notification === model.notifiedZoom &&
      (input.sample === undefined || input.sample === model.poseSample) &&
      (Option.isNone(model.zoomAnimationTarget)
        ? input.animationTarget === undefined
        : input.animationTarget !== undefined &&
          model.zoomAnimationTarget.value.zoom === input.animationTarget.zoom &&
          model.zoomAnimationTarget.value.x === input.animationTarget.x &&
          model.zoomAnimationTarget.value.y === input.animationTarget.y &&
          model.zoomAnimationTarget.value.changesZoom === input.animationTarget.changesZoom) &&
      model.zoom === zoom &&
      model.x === x &&
      model.y === y &&
      model.tracking === (input.tracking ?? false) &&
      !(input.tracking === false && Option.isSome(model.zoomIntent))
    )
      return { model }
    return {
      model: {
        ...model,
        notifiedZoom: notification,
        poseSample: input.sample ?? model.poseSample,
        zoomAnimationTarget: Option.fromUndefinedOr(input.animationTarget),
        zoom,
        x,
        y,
        pull: 0,
        pullActive: false,
        pullAnimation: Option.none(),
        tracking: input.tracking ?? false,
        zoomIntent: input.tracking === false ? Option.none() : model.zoomIntent,
      },
      ...(notification === model.notifiedZoom
        ? {}
        : { outMessage: LightboxBlock.OutMessage.ZoomChanged({ zoom: notification }) }),
    }
  },
)
export const zoomIn = LightboxBlock.makeStep((model) =>
  pose(model, {
    zoom: model.zoom * (model.items[model.index]?.zoom?.zoomStep ?? model.options.zoomStep ?? 2),
  }),
)
export const zoomOut = LightboxBlock.makeStep((model) =>
  pose(model, {
    zoom: model.zoom / (model.items[model.index]?.zoom?.zoomStep ?? model.options.zoomStep ?? 2),
  }),
)
export const zoomReset = LightboxBlock.makeStep((model) =>
  pose(model, { zoom: minZoom(model), x: 0, y: 0 }),
)

/** Parent requests are accepted as Model intent; the physical Mount owns its trajectory. */
export const requestZoom = LightboxBlock.makeStep(
  (
    model,
    input: {
      readonly zoom: number
      readonly x?: number
      readonly y?: number
      readonly rapid?: boolean
      readonly focalX?: number
      readonly focalY?: number
    },
  ) => {
    if (!model.open || !model.hasZoom || !Number.isFinite(input.zoom)) return { model }

    const generation = model.zoomIntentGeneration + 1
    const zoom = Math.max(minZoom(model), Math.min(maxZoom(model), input.zoom))
    return {
      model: {
        ...model,
        zoomIntentGeneration: generation,
        zoomIntent: Option.some({
          generation,
          zoom,
          ...(input.x === undefined ? {} : { x: input.x }),
          ...(input.y === undefined ? {} : { y: input.y }),
          ...(input.focalX === undefined ? {} : { focalX: input.focalX }),
          ...(input.focalY === undefined ? {} : { focalY: input.focalY }),
          ...(input.rapid === undefined ? {} : { rapid: input.rapid }),
        }),
      },
    }
  },
)
export const requestZoomIn = LightboxBlock.makeStep((model) =>
  requestZoom(model, {
    zoom:
      Option.getOrElse(
        Option.map(model.zoomIntent, (intent) => intent.zoom),
        () => model.zoom,
      ) * (model.items[model.index]?.zoom?.zoomStep ?? model.options.zoomStep ?? 2),
  }),
)
export const requestZoomOut = LightboxBlock.makeStep((model) =>
  requestZoom(model, {
    zoom:
      Option.getOrElse(
        Option.map(model.zoomIntent, (intent) => intent.zoom),
        () => model.zoom,
      ) / (model.items[model.index]?.zoom?.zoomStep ?? model.options.zoomStep ?? 2),
  }),
)
export const requestZoomReset = LightboxBlock.makeStep(
  (model, input: { readonly rapid?: boolean }) =>
    requestZoom(model, {
      zoom: minZoom(model),
      x: 0,
      y: 0,
      ...(input.rapid === undefined ? {} : { rapid: input.rapid }),
    }),
)
