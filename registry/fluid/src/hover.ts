import { modifyFields } from 'foldkit/struct'
import { emptyGeometry, samePublishedGeometry } from './lib/indexed-geometry.js'
import { Effect, Layer, Option, Queue, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import type { Attribute, ChildAttribute, Html, TagName } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import * as Render from 'foldkit/render'
import {
  HOVER_ROOT_ATTR,
  HOVER_POINTER_HANDLERS_ATTR,
  HOVER_MOUSE_ADMISSION_ATTRS,
  hoverItemAttributes,
} from './hover-attributes.js'
import { mountHover } from './hover-driver.js'
import { HoverDrivers, HoverDriversLayer } from './hover-resources.js'
import { HoverRowLayout, sameHoverRows } from './hover-layout.js'

import { ACTIVE_INDEX_ATTR, pickNearestIndexed } from './lib/hover-geometry.js'
import type { HoverObservation, HoverSnapshot } from './hover-observation.js'
import {
  HoverMode,
  Index,
  Options,
  Snapshot,
  observationFields,
  toModelOptions,
} from './hover-observation.js'

export { hoverItemAttributes, hoverSubtreeAttributes } from './hover-attributes.js'

const Model = Schema.Struct({
  id: Schema.String,
  options: Options,
  mode: HoverMode.pipe(Schema.withDecodingDefaultKey(Effect.succeed('fluid'))),
  pointerHandlers: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
  ...Snapshot.fields,
  sessionPending: Schema.Boolean,
  rowLayout: Schema.OptionFromNullOr(HoverRowLayout).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(null)),
  ),
})

type Model = typeof Model.Type

const Message = defineMessageUnion({
  ...observationFields,
  CompletedControl: {},
  Unmounted: {},
})

const OutMessage = defineMessageUnion({
  Changed: { ...Snapshot.fields, rowLayout: Schema.optionalKey(HoverRowLayout) },
})

const GapClickOptions = Schema.Struct({ maxDistance: Schema.optionalKey(Schema.Number) })

const HoverConfigSchema = Schema.Struct({
  mode: Schema.optionalKey(HoverMode),
  id: Schema.String,
  pointerHandlers: Schema.optionalKey(Schema.Boolean),
  axis: Schema.optionalKey(Options.fields.axis),
  nearest: Schema.optionalKey(Schema.Boolean),
  gapClick: Schema.optionalKey(Schema.Union([Schema.Boolean, GapClickOptions])),
})

const ConfigureOptions = Schema.Struct({
  mode: Schema.optionalKey(HoverMode),
  ...Options.fields,
  maxDistance: Schema.Number,
})

const effects = Block.makeEffectsContract()

export const InMessage = defineInMessageUnion({
  RequestedHighlight: { index: Index },
  RequestedClear: {},
  RequestedRemeasure: {},
  RequestedMeasureItems: {},
  RequestedConfigure: { options: ConfigureOptions },
  RequestedPointerHandlers: { enabled: Schema.Boolean },
})

export const HoverKey = Symbol('Hover')

export const HoverBlock = Block.make('Hover', {
  key: HoverKey,
  InitArgs: Schema.Tuple([HoverConfigSchema]),
  Model,
  Message,
  InMessage,
  OutMessage,
  view: { kind: 'Element', Inputs: Block.makeInputContract<HoverViewInputs>() },
  effects,
  inMessageOutputs: {
    RequestedHighlight: { outMessage: OutMessage.Changed },
    RequestedClear: { outMessage: OutMessage.Changed },
    RequestedRemeasure: { outMessage: OutMessage.Changed },
    RequestedConfigure: { outMessage: OutMessage.Changed },
  },
})

const ObserveHover = HoverBlock.makeMountStream('ObserveHover', {
  args: { id: Schema.String },
  messages: [
    Message.PointerEntered,
    Message.PointerLeft,
    Message.PointerMoved,
    Message.Registered,
    Message.Measured,
    Message.Clicked,
  ],
  *handler() {
    const { drivers, scopeKey } = yield* HoverDrivers

    return ({ element, id, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<typeof HoverObservation.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    if (!(element instanceof HTMLElement)) {
                      throw new Error('Fluid hover requires an HTML container')
                    }

                    if (drivers.has(id)) {
                      throw new Error(`Duplicate Fluid hover id: ${id}`)
                    }

                    const driver = mountHover(
                      element,
                      (observed) => {
                        Queue.offerUnsafe(queue, observed)
                      },
                      scopeKey,
                    )

                    drivers.set(id, driver)

                    return driver
                  }),
                  (driver) =>
                    Effect.sync(() => {
                      driver.dispose()

                      if (drivers.get(id) === driver) {
                        drivers.delete(id)
                      }
                    }),
                ).pipe(Effect.flatMap(() => Effect.never)),
              )
            : Stream.never,
        ),
      )
  },
})

const ControlHover = HoverBlock.makeCommand('ControlHover', {
  args: {
    id: Schema.String,
    action: Schema.Literals(['Activate', 'Remeasure', 'MeasureItems', 'PointerHandlers']),
    enabled: Schema.Boolean,
    index: Index,
  },
  messages: [Message.CompletedControl],
  *handler() {
    const { drivers } = yield* HoverDrivers

    return ({ id, action, index, enabled }) =>
      Effect.gen(function* () {
        const driver = drivers.get(id)

        if (action !== 'Activate') {
          yield* Render.afterCommit
        }

        if (driver !== undefined && drivers.get(id) === driver && driver.isCurrent()) {
          switch (action) {
            case 'Activate': {
              if (index !== null) {
                driver.activate(index)
              }

              break
            }

            case 'Remeasure': {
              driver.remeasure()
              break
            }

            case 'MeasureItems': {
              driver.measureItems()
              break
            }

            case 'PointerHandlers': {
              driver.setPointerHandlers(enabled)
              break
            }

            default: {
              throw new Error('Unknown Hover driver action')
            }
          }
        }

        return Message.CompletedControl()
      })
  },
})

const HoverComposition = HoverBlock.makeComposition({ mounts: [ObserveHover] })

export type HoverConfig = typeof HoverConfigSchema.Type

const init = HoverComposition.makeInit((config: HoverConfig) => ({
  model: Model.make({
    id: config.id,
    mode: config.mode ?? 'fluid',
    pointerHandlers: config.pointerHandlers ?? true,
    options: toModelOptions({
      axis: config.axis ?? 'y',
      nearest: config.nearest ?? false,
      gapClick: config.gapClick !== false,
      maxDistance: Schema.is(GapClickOptions)(config.gapClick)
        ? (config.gapClick.maxDistance ?? Infinity)
        : Infinity,
    }),
    activeIndex: null,
    session: 0,
    sessionPending: false,
    rowLayout: Option.none(),
    itemRects: emptyGeometry,
    isMeasured: false,
  }),
}))

const changed = (model: Model) => ({
  model,
  outMessage: OutMessage.Changed({
    activeIndex: model.activeIndex,
    session: model.session,
    itemRects: model.itemRects,
    isMeasured: model.isMeasured,
    ...Option.match(model.rowLayout, {
      onNone: () => ({}),
      onSome: (rowLayout) => ({ rowLayout }),
    }),
  }),
})

const highlight = (model: Model, activeIndex: number | null) =>
  activeIndex === model.activeIndex
    ? { model }
    : changed(modifyFields(model, { activeIndex: () => activeIndex }))

const update = HoverComposition.makeUpdate({
  PointerEntered: (model) => ({ model: modifyFields(model, { sessionPending: () => true }) }),
  PointerLeft: (model) => highlight(model, null),
  PointerMoved: (model, observation) => {
    const disabled = new Set(observation.disabledIndices)

    const activeIndex =
      model.mode !== 'standard' && model.options.nearest
        ? pickNearestIndexed({
            ...observation,
            axis: model.options.axis,
            geometry: model.itemRects,
            isDisabled: (index) => disabled.has(index),
          })
        : (observation.targetIndices.findLast((index) => !disabled.has(index)) ?? null)

    const startsSession = model.sessionPending && activeIndex !== model.activeIndex
    const session = model.session + (startsSession ? 1 : 0)
    const sessionPending = activeIndex === null || (!startsSession && model.sessionPending)
    const next = modifyFields(model, {
      activeIndex: () => activeIndex,
      session: () => session,
      sessionPending: () => sessionPending,
    })

    return activeIndex !== model.activeIndex || session !== model.session
      ? changed(next)
      : { model: next }
  },
  Registered: (model, { indices }) =>
    changed(
      modifyFields(model, {
        activeIndex: (currentActiveIndex) =>
          currentActiveIndex !== null && indices.includes(currentActiveIndex)
            ? currentActiveIndex
            : null,
        isMeasured: () => false,
      }),
    ),
  Measured: (model, { itemRects, ready, rowLayout }) => {
    const differs = !samePublishedGeometry(model.itemRects, itemRects)
    const rowsChanged = rowLayout !== undefined && !sameHoverRows(model.rowLayout, rowLayout)
    const isMeasured = ready || model.isMeasured

    const activeIndex =
      rowLayout !== undefined &&
      model.activeIndex !== null &&
      !rowLayout.some((row) => row.index === model.activeIndex && row.visible)
        ? null
        : model.activeIndex

    return differs ||
      rowsChanged ||
      activeIndex !== model.activeIndex ||
      isMeasured !== model.isMeasured
      ? changed(
          modifyFields(model, {
            activeIndex: () => activeIndex,
            itemRects: (currentItemRects) => (differs ? itemRects : currentItemRects),
            isMeasured: () => isMeasured,
            rowLayout: (currentRowLayout) =>
              rowsChanged ? Option.some(rowLayout) : currentRowLayout,
          }),
        )
      : { model }
  },
  Clicked: (model, { targetIsItem, targetIsControl, items, point }) => {
    if (
      model.mode === 'standard' ||
      targetIsItem ||
      targetIsControl ||
      !model.options.gapClick ||
      !model.options.nearest ||
      model.activeIndex === null
    ) {
      return { model }
    }

    const item = items.find(({ index }) => index === model.activeIndex)

    if (item === undefined || item.disabled) {
      return { model }
    }

    const dx = Math.max(item.rect.left - point.x, 0, point.x - item.rect.left - item.rect.width)
    const dy = Math.max(item.rect.top - point.y, 0, point.y - item.rect.top - item.rect.height)

    if (model.options.maxDistance !== null && Math.hypot(dx, dy) > model.options.maxDistance) {
      return { model }
    }

    return {
      model,
      commands: [
        ControlHover({
          id: model.id,
          action: 'Activate',
          index: model.activeIndex,
          enabled: model.pointerHandlers,
        }),
      ],
    }
  },
  CompletedControl: (model) => ({ model }),
  Unmounted: (model) => ({
    model: modifyFields(model, {
      activeIndex: () => null,
      isMeasured: () => false,
      sessionPending: () => false,
    }),
  }),
})

const inMessageUpdate = HoverComposition.makeInMessageUpdate({
  RequestedClear: (model) => highlight(model, null),
  RequestedHighlight: (model, { index }) => highlight(model, index),
  RequestedRemeasure: (model) => ({
    ...changed(modifyFields(model, { isMeasured: () => false })),
    commands: [
      ControlHover({
        id: model.id,
        action: 'Remeasure',
        index: null,
        enabled: model.pointerHandlers,
      }),
    ],
  }),
  RequestedMeasureItems: (model) => ({
    model,
    commands: [
      ControlHover({
        id: model.id,
        action: 'MeasureItems',
        index: null,
        enabled: model.pointerHandlers,
      }),
    ],
  }),
  RequestedConfigure: (model, { options }) => {
    const mode = options.mode ?? model.mode
    const next = modifyFields(model, { mode: () => mode, options: () => toModelOptions(options) })

    // A mode switch invalidates a nearest-item result even if the pointer has not moved.
    return mode === model.mode
      ? { model: next }
      : changed(modifyFields(next, { activeIndex: () => null, sessionPending: () => true }))
  },
  RequestedPointerHandlers: (model, { enabled }) => ({
    model: modifyFields(model, { pointerHandlers: () => enabled }),
    commands: [ControlHover({ id: model.id, action: 'PointerHandlers', index: null, enabled })],
  }),
})

export interface HoverViewState extends HoverSnapshot {
  readonly itemAttributes: (
    index: number,
    disabled?: boolean,
  ) => ReadonlyArray<Extract<Attribute<never>, { readonly _tag: 'DataAttribute' }>>
}

export interface HoverMouseHandlers {
  readonly enter?: boolean
  readonly leave?: boolean
  readonly move?: boolean
  readonly click?: boolean
}

export interface HoverViewInputs {
  /** Per-event defaults; false lets a caller own that event without disabling the others. */
  readonly mouseHandlers?: HoverMouseHandlers
  readonly content: (snapshot: HoverViewState) => ReadonlyArray<Html>
  readonly tag?: Exclude<keyof HTMLElementTagNameMap & TagName, 'textarea'>
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
}

const view = HoverComposition.makeView.withInputs((model, inputs, h) => {
  const attributes = [
    h.Class(inputs.className === undefined ? '' : inputs.className),
    h.Id(model.id),
    h.DataAttribute(HOVER_ROOT_ATTR.slice(5), ''),
    ...(model.activeIndex === null
      ? []
      : [h.DataAttribute(ACTIVE_INDEX_ATTR.slice(5), String(model.activeIndex))]),
    h.OnMount(ObserveHover({ id: model.id })),
    ...(typeof window === 'undefined' ? [] : [h.OnUnmount(Message.Unmounted())]),
  ]

  const allAttributes = [
    ...childAttributes(attributes),
    ...(inputs.attributes ?? []),
    ...childAttributes([
      h.DataAttribute(HOVER_POINTER_HANDLERS_ATTR.slice(5), String(model.pointerHandlers)),
      h.DataAttribute(
        HOVER_MOUSE_ADMISSION_ATTRS.enter.slice(5),
        String(inputs.mouseHandlers?.enter !== false),
      ),
      h.DataAttribute(
        HOVER_MOUSE_ADMISSION_ATTRS.leave.slice(5),
        String(inputs.mouseHandlers?.leave !== false),
      ),
      h.DataAttribute(
        HOVER_MOUSE_ADMISSION_ATTRS.move.slice(5),
        String(inputs.mouseHandlers?.move !== false),
      ),
      h.DataAttribute(
        HOVER_MOUSE_ADMISSION_ATTRS.click.slice(5),
        String(inputs.mouseHandlers?.click !== false),
      ),
    ]),
  ]

  const children = inputs.content({
    ...model,
    itemAttributes: (index, disabled = false) =>
      hoverItemAttributes(index, disabled, model.activeIndex),
  })

  return h.keyed(inputs.tag ?? 'div')(model.id, allAttributes, children)
})

const EffectsLayer = Layer.mergeAll(ObserveHover.layer, ControlHover.layer).pipe(
  Layer.provide(HoverDriversLayer),
)

export const layer = HoverBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer,
})

export { measureHoverItems } from './hover-driver.js'

export type { HoverSnapshot, HoverOptions } from './hover-observation.js'

export { HoverMode } from './hover-observation.js'

export const test = { ControlHover }
