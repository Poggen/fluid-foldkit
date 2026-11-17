// Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud.
// See NOTICE
import { Effect, Layer, Option, Queue, Schema, Stream } from 'effect'
import { Block, Update } from 'foldkit'
import type { ChildAttribute, Html } from 'foldkit/html'
import * as Render from 'foldkit/render'
import { defineMessageUnion } from 'foldkit/message'
import type { HoverConfig } from './hover.js'
import { HoverBlock, layer as HoverLayer } from './hover.js'
import { HoverHighlightBlock, layer as HighlightLayer } from './hover-highlight.js'
import type { HoverHighlightViewInputs } from './hover-highlight.js'
import {
  SelectionBackgroundsBlock,
  layer as SelectionLayer,
  selectionBackgroundAnimation,
} from './selection-backgrounds.js'
import type { SelectionBackgroundsViewInputs } from './selection-backgrounds.js'
import { createTargetMotionScope } from './motion-target.js'
import { rectAt } from './lib/indexed-geometry.js'
import type { SizeVariant } from './lib/size.js'
import { tableClassName } from './table-parts.js'
import type { TableContext } from './table-parts.js'
import { createPresentationContext, resolvePresentation } from './presentation.js'
import type { PresentationContext } from './presentation.js'
import { TableObservation, observeTable, tableObservationFields } from './table-observation.js'
import { createTablePresentation } from './table-presentation.js'
import type { HighlightBox } from './table-presentation.js'
import { Config, Model, InMessage } from './table-state.js'
import type { TableConfig } from './table-state.js'
export type { TableConfig } from './table-state.js'

export { TABLE_HIGHLIGHT_EVENT } from './table-observation.js'
export type { HighlightBox } from './table-presentation.js'

const Message = defineMessageUnion({
  ...tableObservationFields,
  CompletedSnap: { generation: Schema.Natural },
  CompletedRules: { generation: Schema.Natural },
  Unmounted: {},
})
const effects = Block.makeEffectsContract()
export const TableKey = Symbol('FluidTable')
export const TableBlock = Block.make('Table', {
  key: TableKey,
  InitArgs: Schema.Tuple([Config]),
  Model,
  InMessage,
  Message,
  effects,
  view: { kind: 'Element', Inputs: Block.makeInputContract<TableViewInputs>() },
})
const normalized = (indices: ReadonlyArray<number>) => [...new Set(indices)].sort((a, b) => a - b)
const Highlight = TableBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'highlight',
  init: {
    contextToArgs: (config: TableConfig) => [
      { id: `${config.id}-highlight`, mode: config.hoverMode ?? 'fluid' },
    ],
  },
})
const HeadHighlight = TableBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'headHighlight',
  init: {
    contextToArgs: (config: TableConfig) => [
      { id: `${config.id}-head-highlight`, mode: config.hoverMode ?? 'fluid' },
    ],
  },
})
const Selection = TableBlock.makeRequiredFieldBinding(SelectionBackgroundsBlock, {
  field: 'selection',
  init: {
    contextToArgs: (config: TableConfig) => [
      {
        id: `${config.id}-selection`,
        indices: normalized(config.selectedIndices ?? []),
        radius: 8,
      },
    ],
  },
})
const syncHead = TableBlock.makeStep((model) => {
  const index = Option.getOrNull(model.heldHeadIndex) ?? model.headHover.activeIndex
  const cell =
    model.hideHeadHighlight || !model.headHover.isMeasured || index === null
      ? undefined
      : rectAt(model.headHover.itemRects, index)
  return HeadHighlight.requestRect({
    rect: cell === undefined ? null : { ...cell, height: cell.height - 1 },
    session: model.headHover.session,
    mode: model.headHover.mode,
  })
})
const Hover = TableBlock.makeRequiredFieldBinding(HoverBlock, {
  field: 'hover',
  init: {
    contextToArgs: (config: TableConfig) => [
      { id: `${config.id}-hover`, mode: config.hoverMode ?? 'fluid' },
    ],
  },
}).withOutMessagePolicy({
  fold: TableBlock.makeOutMessageFold(HoverBlock, {
    Changed: (snapshot) =>
      Update.combineSteps([
        TableBlock.makeStep((model) =>
          Highlight.informOfSource({
            snapshot: model.snapping ? { ...snapshot, isMeasured: true } : snapshot,
            hidden: false,
            mode: model.hover.mode,
            allowUnmeasured: model.snapping,
          }),
        ),
        TableBlock.makeStep((model) =>
          Selection.informOfGeometry({
            itemRects: snapshot.itemRects,
            radius: model.selection.radius,
          }),
        ),
      ]),
  }),
})
const HeadHover = TableBlock.makeRequiredFieldBinding(HoverBlock, {
  field: 'headHover',
  init: {
    contextToArgs: (config: TableConfig): [HoverConfig] => [
      { id: `${config.id}-head-hover`, mode: config.hoverMode ?? 'fluid', axis: 'x' },
    ],
  },
}).withOutMessagePolicy({
  fold: TableBlock.makeOutMessageFold(HoverBlock, { Changed: () => syncHead }),
})

const ObserveTable = TableBlock.makeMountStream('ObserveTable', {
  messages: [
    Message.CapturedPointer,
    Message.CapturedHighlight,
    Message.CapturedBlur,
    Message.CapturedRepeat,
    Message.CapturedHeadPress,
  ],
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<typeof TableObservation.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() =>
                    observeTable(element, (message) => Queue.offerUnsafe(queue, message)),
                  ),
                  (release) => Effect.sync(release),
                ).pipe(Effect.andThen(Effect.never)),
              )
            : Stream.never,
        ),
      )
  },
})
const CompleteFrames = TableBlock.makeCommand('CompleteFrames', {
  args: { id: Schema.String, generation: Schema.Natural, kind: Schema.Literals(['snap', 'rules']) },
  messages: [Message.CompletedSnap, Message.CompletedRules],
  *handler() {
    return ({ id, generation, kind }) =>
      Effect.gen(function* () {
        yield* Render.afterCommit
        yield* Effect.callback<void>((resume) => {
          let frame = requestAnimationFrame(() => {
            if (kind === 'snap') resume(Effect.void)
            else
              frame = requestAnimationFrame(() => {
                const root = document.getElementById(id)?.closest('[data-fluid-table]')
                if (root?.getAttribute('data-snap-rules') === String(generation))
                  root.removeAttribute('data-snap-rules')
                resume(Effect.void)
              })
          })
          return Effect.sync(() => cancelAnimationFrame(frame))
        })
        return kind === 'snap'
          ? Message.CompletedSnap({ generation })
          : Message.CompletedRules({ generation })
      })
  },
})
const TableComposition = TableBlock.makeComposition({
  bindings: [Hover, Highlight, HeadHover, HeadHighlight, Selection],
  mounts: [ObserveTable],
})
const init = TableComposition.makeInit((config: TableConfig) => ({
  model: {
    id: config.id,
    selectedIndices: normalized(config.selectedIndices ?? []),
    heldHeadIndex: Option.fromNullOr(config.heldHeadIndex ?? null),
    hideHeadHighlight: config.hideHeadHighlight ?? false,
    snapKey: Option.fromUndefinedOr(config.snapKey),
    snapGeneration: 0,
    snapping: false,
    rulesGeneration: 0,
    snapRules: false,
    pressedHeadIndex: Option.none(),
    keyboardOwns: false,
    lastPointer: Option.none(),
    repeating: false,
  },
  childInitContext: config,
}))
const claim = (index: number | null) =>
  Update.combineSteps([
    TableBlock.makeFieldsStep(() => ({ keyboardOwns: () => true })),
    Hover.requestHighlight({ index }),
  ])
const update = TableComposition.makeUpdate({
  CapturedPointer: TableBlock.makeStep((model, { x, y, index, entered }) => {
    const moved =
      Option.isNone(model.lastPointer) ||
      model.lastPointer.value.x !== x ||
      model.lastPointer.value.y !== y
    return Update.combineSteps([
      TableBlock.makeFieldsStep(() => ({ lastPointer: () => Option.some({ x, y }) })),
      ...(model.keyboardOwns && !moved
        ? []
        : [
            TableBlock.makeFieldsStep(() => ({ keyboardOwns: () => false })),
            Hover.requestPointerHighlight({ index, entered }),
          ]),
    ])
  }),
  CapturedHighlight: TableBlock.makeStep((_, { index }) => claim(index)),
  CapturedBlur: TableBlock.makeStep((_, { pointerInside }) =>
    Update.combineSteps([
      TableBlock.makeFieldsStep(() => ({ repeating: () => false })),
      ...(pointerInside ? [] : [Hover.requestClear()]),
    ]),
  ),
  CapturedRepeat: (model, { repeating }) => ({ model: { ...model, repeating } }),
  CapturedHeadPress: (model, { index }) => ({
    model: { ...model, pressedHeadIndex: Option.fromNullOr(index) },
  }),
  CompletedSnap: (model, { generation }) => ({
    model: generation === model.snapGeneration ? { ...model, snapping: false } : model,
  }),
  CompletedRules: (model, { generation }) => ({
    model: generation === model.rulesGeneration ? { ...model, snapRules: false } : model,
  }),
  Unmounted: (model) => ({
    model: {
      ...model,
      keyboardOwns: false,
      repeating: false,
      pressedHeadIndex: Option.none(),
      lastPointer: Option.none(),
    },
  }),
})
const inMessageUpdate = TableComposition.makeInMessageUpdate({
  RequestedHighlight: TableBlock.makeStep((_, { index }) => claim(index)),
  RequestedConfigure: TableBlock.makeStep((model, config) => {
    const selectedIndices = normalized(config.selectedIndices)
    const selectionChanged =
      selectedIndices.length !== model.selectedIndices.length ||
      selectedIndices.some((n, i) => n !== model.selectedIndices[i])
    const snapKey = Option.fromUndefinedOr(config.snapKey)
    const snapChanged = Option.getOrUndefined(model.snapKey) !== config.snapKey
    const snapGeneration = model.snapGeneration + (snapChanged ? 1 : 0)
    const rulesGeneration = model.rulesGeneration + (selectionChanged ? 1 : 0)
    return Update.combineSteps([
      TableBlock.makeStep(() => ({
        model: {
          ...model,
          selectedIndices,
          heldHeadIndex: Option.fromNullOr(config.heldHeadIndex),
          hideHeadHighlight: config.hideHeadHighlight,
          snapKey,
          snapGeneration,
          rulesGeneration,
          snapping: model.snapping || snapChanged,
          snapRules: model.snapRules || selectionChanged,
        },
        commands: [
          ...(snapChanged
            ? [CompleteFrames({ id: model.id, generation: snapGeneration, kind: 'snap' })]
            : []),
          ...(selectionChanged
            ? [CompleteFrames({ id: model.id, generation: rulesGeneration, kind: 'rules' })]
            : []),
        ],
      })),
      snapChanged
        ? Selection.requestSnap({
            indices: selectedIndices,
            itemRects: model.hover.itemRects,
            radius: model.selection.radius,
          })
        : Selection.requestSelection({ indices: selectedIndices }),
      ...(snapChanged ? [Hover.requestMeasureItems(), HeadHover.requestMeasureItems()] : []),
      syncHead,
    ])
  }),
  RequestedHoverMode: TableBlock.makeStep((model, { mode }) =>
    Update.combineSteps([
      Hover.requestConfigure({
        options: { mode, axis: 'y', nearest: false, gapClick: true, maxDistance: Infinity },
      }),
      HeadHover.requestConfigure({
        options: { mode, axis: 'x', nearest: false, gapClick: true, maxDistance: Infinity },
      }),
      Highlight.informOfSource({ snapshot: model.hover, hidden: false, mode }),
      syncHead,
    ]),
  ),
})
export interface TableViewInputs {
  readonly animateHighlight: HoverHighlightViewInputs['animate']
  readonly animateSelection?: SelectionBackgroundsViewInputs['animate']
  readonly content: (context: TableContext) => ReadonlyArray<Html>
  readonly hoverMarker?: (index: number) => Html | string | null
  readonly onHighlightFrame?: (box: HighlightBox) => void
  readonly selectionMirrorIds?: ReadonlyArray<string>
  readonly size?: SizeVariant
  readonly context?: PresentationContext
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
}
const makeView = (
  selectionMotion: ReturnType<typeof createTargetMotionScope>,
  presentationScope: ReturnType<typeof createTablePresentation>,
) =>
  TableComposition.makeView.withInputs<TableViewInputs>((model, inputs, h) => {
    const resolved = resolvePresentation(inputs)
    const size = resolved.size.variant
    const presentation = createPresentationContext({ ...inputs, size })
    const pressed =
      Option.isSome(model.heldHeadIndex) ||
      (Option.isSome(model.pressedHeadIndex) &&
        model.pressedHeadIndex.value === model.headHover.activeIndex)
    return presentationScope.node(
      h.div(
        [
          h.Class('group/table relative'),
          h.DataAttribute('fluid-table', ''),
          h.OnMount(ObserveTable()),
          ...(typeof window === 'undefined' ? [] : [h.OnUnmount(Message.Unmounted())]),
          ...(model.snapRules
            ? [h.DataAttribute('snap-rules', String(model.rulesGeneration))]
            : []),
        ],
        [
          h.block(
            Hover.embedView({
              slotId: model.hover.id,
              model: model.hover,
              viewInputs: {
                className: 'relative',
                mouseHandlers: { enter: false, move: false, leave: false },
                content: (context) => [
                  h.block(
                    Selection.embedView({
                      slotId: model.selection.id,
                      model: model.selection,
                      viewInputs: {
                        animate:
                          inputs.animateSelection ?? selectionBackgroundAnimation(selectionMotion),
                        ...(inputs.selectionMirrorIds === undefined
                          ? {}
                          : { mirrorIds: inputs.selectionMirrorIds }),
                        snapGeometryOriginId: model.hover.id,
                        radius: resolved.shape.mergedRadius,
                      },
                    }),
                  ),
                  h.block(
                    Highlight.embedView({
                      slotId: model.highlight.id,
                      model: model.highlight,
                      viewInputs: {
                        animate: inputs.animateHighlight,
                        mode: model.hover.mode,
                        observeFrame: true,
                        instant: model.snapping || model.repeating,
                        className: `${resolved.shape.bg} table-row-highlight`,
                        ...((model.snapping || model.repeating) && model.hover.activeIndex !== null
                          ? {
                              snap: {
                                originId: model.hover.id,
                                index: model.hover.activeIndex,
                                generation: model.snapGeneration,
                              },
                            }
                          : {}),
                        children:
                          model.hover.activeIndex === null || inputs.hoverMarker === undefined
                            ? []
                            : [inputs.hoverMarker(model.hover.activeIndex)],
                      },
                    }),
                  ),
                  h.block(
                    HeadHighlight.embedView({
                      slotId: model.headHighlight.id,
                      model: model.headHighlight,
                      viewInputs: {
                        animate: inputs.animateHighlight,
                        mode: model.headHover.mode,
                        className: `${resolved.shape.bg} transition-[background-color] duration-80${pressed ? ' bg-active' : ''}`,
                      },
                    }),
                  ),
                  h.table(
                    [
                      h.Id(model.id),
                      h.Class(tableClassName(size, inputs.className)),
                      ...(inputs.attributes ?? []),
                    ],
                    inputs.content({
                      ...context,
                      size,
                      presentation,
                      selectedIndices: model.selectedIndices,
                      headItemAttributes: (index) =>
                        model.headHover.activeIndex === index
                          ? [
                              h.DataAttribute('fluid-hover-item', String(index)),
                              h.DataAttribute('fluid-hover-active', ''),
                            ]
                          : [h.DataAttribute('fluid-hover-item', String(index))],
                      renderHeader: (props) =>
                        h.block(
                          HeadHover.embedView({
                            slotId: model.headHover.id,
                            model: model.headHover,
                            viewInputs: {
                              tag: 'thead',
                              geometryOriginId: model.hover.id,
                              ...(props.className === undefined
                                ? {}
                                : { className: props.className }),
                              ...(props.attributes === undefined
                                ? {}
                                : { attributes: props.attributes }),
                              content: () => props.children,
                            },
                          }),
                        ),
                    }),
                  ),
                ],
              },
            }),
          ),
        ],
      ),
      inputs,
    )
  })
export const layer = TableBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* TableComposition.acquireChildren()
    const selectionMotion = createTargetMotionScope('fluid-table-selection')
    const presentationScope = createTablePresentation()
    yield* Layer.build(Layer.merge(selectionMotion.layer, presentationScope.layer))
    return {
      children,
      init,
      update,
      inMessageUpdate,
      view: makeView(selectionMotion, presentationScope),
      EffectsLayer: Layer.merge(ObserveTable.layer, CompleteFrames.layer),
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(HoverLayer, HighlightLayer, SelectionLayer)))
export const hoverModeOf = (model: Model) => model.hover.mode

export const test = { CompleteFrames }
