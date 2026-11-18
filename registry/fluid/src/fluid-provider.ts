/* @license Derived from Fluid Functionalism cc276ca0. MIT; see NOTICE */
import { modifyFields } from 'foldkit/struct'
import { HoverMode } from './hover-observation.js'
import { Effect, Layer, Option, Queue, Schema, Stream, Number } from 'effect'
import { Block } from 'foldkit'
import type { ChildAttribute, Html, TagName } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { resolveIcons } from './icons.js'
import type { IconName } from './icons.js'
import { ProviderRoots, ProviderRootsLayer } from './provider-root.js'
import { createPresentationContext } from './presentation.js'
import type { Icon, PresentationContext } from './presentation.js'

const Shape = Schema.Literals(['rounded', 'pill', 'sharp'])

const Size = Schema.Literals(['default', 'compact'])

const Mode = Schema.Literals(['shape', 'size', 'fluid'])

const Model = Schema.Struct({
  id: Schema.String,
  mode: Mode,
  hoverMode: HoverMode.pipe(Schema.withDecodingDefaultKey(Effect.succeed('fluid'))),
  shape: Shape,
  defaultShape: Shape,
  localSize: Size,
  defaultSize: Size,
  controlledSize: Schema.OptionFromNullOr(Size),
  prefersReducedMotion: Schema.Boolean,
  mountGeneration: Schema.Natural,
})

const Message = defineMessageUnion({
  CapturedPreference: { value: Schema.Boolean, mountGeneration: Schema.Natural },
  PublishedShape: {},
})

export const InMessage = defineInMessageUnion({
  RequestedShape: { shape: Shape },
  RequestedHoverMode: { mode: HoverMode },
  RequestedSize: { size: Size },
  RequestedControlledSize: { size: Schema.NullOr(Size) },
  RequestedReset: {},
})

const Config = Schema.Struct({
  id: Schema.String,
  mode: Schema.optionalKey(Mode),
  hoverMode: Schema.optionalKey(HoverMode),
  defaultShape: Schema.optionalKey(Shape),
  defaultSize: Schema.optionalKey(Size),
  size: Schema.optionalKey(Size),
  prefersReducedMotion: Schema.optionalKey(Schema.Boolean),
})

const effects = Block.makeEffectsContract()

export const PresentationProviderKey = Symbol('PresentationProvider')

export const PresentationProviderBlock = Block.make('PresentationProvider', {
  key: PresentationProviderKey,
  Model,
  Message,
  InMessage,
  InitArgs: Schema.Tuple([Config]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<PresentationProviderViewInputs>() },
  effects,
})

const ObserveRoot = PresentationProviderBlock.makeMountStream('ObserveRoot', {
  args: { id: Schema.String, mode: Mode, shape: Shape, mountGeneration: Schema.Natural },
  messages: [Message.CapturedPreference],
  *handler() {
    const roots = yield* ProviderRoots

    return ({ element, id, mode, shape, mountGeneration, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<typeof Message.CapturedPreference.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    const owner = mode === 'size' ? undefined : roots.attach(id, element, shape)

                    if (mode === 'fluid') {
                      const window = element.ownerDocument.defaultView

                      if (window === null) {
                        throw new Error('Fluid provider requires a live document')
                      }

                      Queue.offerUnsafe(
                        queue,
                        Message.CapturedPreference({
                          value: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                          mountGeneration,
                        }),
                      )
                    }

                    return owner
                  }),
                  (owner) =>
                    Effect.sync(() => {
                      owner?.detach()
                    }),
                ).pipe(Effect.flatMap(() => Effect.never)),
              )
            : Stream.never,
        ),
      )
  },
})

const PublishShape = PresentationProviderBlock.makeCommand('PublishShape', {
  args: { id: Schema.String, shape: Shape, publishRadius: Schema.Boolean },
  messages: [Message.PublishedShape],
  *handler() {
    const roots = yield* ProviderRoots

    return ({ id, shape, publishRadius }) =>
      Effect.sync(() => {
        roots.publish(id, shape, publishRadius)

        return Message.PublishedShape()
      })
  },
})

const PresentationProviderComposition = PresentationProviderBlock.makeComposition({
  mounts: [ObserveRoot],
})

export interface PresentationProviderConfig {
  readonly id: string
  readonly mode?: typeof Mode.Type
  readonly defaultShape?: typeof Shape.Type
  readonly defaultSize?: typeof Size.Type
  readonly size?: typeof Size.Type
  readonly hoverMode?: HoverMode
  readonly prefersReducedMotion?: boolean
}

const init = PresentationProviderComposition.makeInit((config: PresentationProviderConfig) => ({
  model: Model.make({
    id: config.id,
    mode: config.mode ?? 'fluid',
    hoverMode: config.hoverMode ?? 'fluid',
    shape: config.defaultShape ?? 'rounded',
    defaultShape: config.defaultShape ?? 'rounded',
    localSize: config.defaultSize ?? 'default',
    defaultSize: config.defaultSize ?? 'default',
    controlledSize: Option.fromUndefinedOr(config.size),
    prefersReducedMotion: config.prefersReducedMotion ?? false,
    mountGeneration: 0,
  }),
}))

const update = PresentationProviderComposition.makeUpdate({
  CapturedPreference: (model, { value, mountGeneration }) => ({
    model:
      model.mountGeneration === mountGeneration
        ? modifyFields(model, { prefersReducedMotion: () => value })
        : model,
  }),
  PublishedShape: PresentationProviderBlock.makeNoopStep(),
})

const inMessageUpdate = PresentationProviderComposition.makeInMessageUpdate({
  RequestedHoverMode: (model, { mode }) => ({
    model: modifyFields(model, { hoverMode: () => mode }),
  }),
  RequestedShape: (model, { shape }) =>
    model.mode === 'size'
      ? { model }
      : {
          model: model.shape === shape ? model : modifyFields(model, { shape: () => shape }),
          commands: [PublishShape({ id: model.id, shape, publishRadius: model.shape !== shape })],
        },
  RequestedSize: (model, { size }) =>
    model.mode === 'shape' || Option.isSome(model.controlledSize)
      ? { model }
      : { model: modifyFields(model, { localSize: () => size }) },
  RequestedControlledSize: (model, { size }) => ({
    model: modifyFields(model, { controlledSize: () => Option.fromNullOr(size) }),
  }),
  RequestedReset: (model) => ({
    model: modifyFields(model, {
      shape: () => model.defaultShape,
      localSize: () => model.defaultSize,
      mountGeneration: Number.increment,
    }),
  }),
})

export interface PresentationProviderViewInputs {
  readonly context?: PresentationContext
  readonly getIcons?: () => Partial<Record<IconName, Icon>>
  /** The provider owns this existing semantic root and attaches its scoped Mount there. */
  readonly tag?: Exclude<keyof HTMLElementTagNameMap & TagName, 'textarea'>
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly content: (context: PresentationContext) => ReadonlyArray<Html | string>
}

const view = PresentationProviderComposition.makeView.withInputs<PresentationProviderViewInputs>(
  (model, inputs, h) => {
    const inherited = inputs.context === undefined ? undefined : { context: inputs.context }

    const contoured =
      model.mode === 'size'
        ? inherited
        : { ...inherited, shape: model.shape, hasShapeProvider: true }

    const sized =
      model.mode === 'shape'
        ? contoured
        : {
            ...contoured,
            size: Option.getOrElse(model.controlledSize, () => model.localSize),
            hasSizeProvider: true,
          }

    const properties: Parameters<typeof createPresentationContext>[0] =
      model.mode === 'fluid'
        ? {
            ...sized,
            hoverMode: model.hoverMode,
            icons: resolveIcons(inputs.getIcons?.()),
            reducedMotion: 'user',
            prefersReducedMotion: model.prefersReducedMotion,
          }
        : sized

    const context = createPresentationContext(properties)

    return h.keyed(inputs.tag ?? 'div')(
      model.id,
      [
        h.OnMount(
          ObserveRoot({
            id: model.id,
            mode: model.mode,
            shape: model.shape,
            mountGeneration: model.mountGeneration,
          }),
        ),
        ...(inputs.attributes ?? []),
      ],
      inputs.content(context),
    )
  },
)

const EffectsLayer = Layer.mergeAll(ObserveRoot.layer, PublishShape.layer).pipe(
  Layer.provide(ProviderRootsLayer),
)

export const layer = PresentationProviderBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer,
})

export const test = { PublishShape, ObserveRoot }
