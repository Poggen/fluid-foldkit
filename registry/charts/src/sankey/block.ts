import { modifyFields } from 'foldkit/struct'
import { DrawingElementBase } from './drawing-element'
import { presentationClass } from './block-presentation'
import { Effect, Layer, Schema } from 'effect'
import { SankeyRegistration } from './registration'
import { Block, CustomElement } from 'foldkit'
import type { Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'

const TooltipAnchor = Schema.Struct({ x: Schema.Finite, y: Schema.Finite })

export const State = Schema.Struct({
  id: Schema.String,
  revision: Schema.Int,
  epoch: Schema.Int,
  mounted: Schema.Boolean,
  entered: Schema.Boolean,
  width: Schema.Finite,
  height: Schema.Finite,
  focusedKind: Schema.Literals(['node', 'link', 'none']),
  focusedIndex: Schema.NullOr(Schema.Int),
  focusRevision: Schema.Int,
  hoveredNodeIndex: Schema.NullOr(Schema.Int),
  hoveredLinkIndex: Schema.NullOr(Schema.Int),
  nodeControlled: Schema.Boolean,
  tooltipKind: Schema.Literals(['node', 'link', 'none']),
  tooltipIndex: Schema.NullOr(Schema.Int),
  tooltipRevision: Schema.Int,
  tooltipAnchor: Schema.NullOr(TooltipAnchor),
})

export type State = typeof State.Type

export interface Inputs {
  readonly mount: (
    element: HTMLElement,
    state: State,
    observe: (event: Observation) => void,
    clock: () => number,
  ) => Host
  readonly configure: (host: Host) => void
  readonly content: (state: State) => ReadonlyArray<Html>
  readonly server: (state: State) => Html
}

export interface Host {
  readonly update: (state: State, inputs: Inputs) => void
  readonly destroy: () => void
}

export type Observation = typeof Observation.Type

export const Observation = defineMessageUnion({
  ObservedFocus: {
    kind: Schema.Literals(['node', 'link', 'none']),
    index: Schema.NullOr(Schema.Int),
    nodeControlled: Schema.optional(Schema.Boolean),
  },
  ObservedSize: { width: Schema.Finite, height: Schema.Finite },
  ObservedEntered: {},
  ObservedReplay: {},
  ObservedNodeControl: { controlled: Schema.Boolean },
  ObservedNodeHoverRequest: { index: Schema.NullOr(Schema.Int) },
})

const SankeyNamespace = Block.makeNamespace('Sankey')

const LifecycleMessage = defineMessageUnion({
  CompletedPrepare: {},
  CompletedDetached: {},
  CompletedMount: {},
})

const Prepare = SankeyNamespace.makeMount('Prepare', {
  messages: [LifecycleMessage.CompletedPrepare, LifecycleMessage.CompletedDetached],
  *handler() {
    const register = yield* SankeyRegistration

    return ({ element }) =>
      Effect.sync(() => {
        if (!element.isConnected) {
          return LifecycleMessage.CompletedDetached()
        }

        register()

        return LifecycleMessage.CompletedPrepare()
      })
  },
})

const Mount = SankeyNamespace.makeMount('Mount', {
  messages: [LifecycleMessage.CompletedMount],
  *handler() {
    return ({ element }) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          if (DrawingElementBase === undefined || !(element instanceof DrawingElementBase)) {
            throw new TypeError('Sankey Mount requires its native drawing capability')
          }

          return element.acquire(() => performance.now())
        }),
        (release) => Effect.sync(release),
      ).pipe(Effect.as(LifecycleMessage.CompletedMount()))
  },
})

export function sankeyRecipe(name: string) {
  if (!/^[a-z][a-z0-9-]*$/u.test(name)) {
    throw new TypeError('Sankey requires a unique lowercase element namespace')
  }

  const Model = State

  const Message = defineMessageUnion({
    ObservedFocus: {
      kind: Schema.Literals(['node', 'link', 'none']),
      index: Schema.NullOr(Schema.Int),
      nodeControlled: Schema.optional(Schema.Boolean),
    },
    ObservedSize: { width: Schema.Finite, height: Schema.Finite },
    ObservedEntered: {},
    ObservedReplay: {},
    ObservedNodeControl: { controlled: Schema.Boolean },
    ObservedNodeHoverRequest: { index: Schema.NullOr(Schema.Int) },
    CompletedPrepare: {},
    CompletedDetached: {},
    CompletedMount: {},
  })

  const InMessage = defineInMessageUnion({
    RequestedFocus: {
      kind: Schema.Literals(['node', 'link', 'none']),
      index: Schema.NullOr(Schema.Int),
    },
    RequestedTooltip: {
      kind: Schema.Literals(['node', 'link', 'none']),
      index: Schema.NullOr(Schema.Int),
      anchor: Schema.optional(Schema.NullOr(TooltipAnchor)),
    },
    RequestedRevision: { revision: Schema.Int },
  })

  const OutMessage = defineMessageUnion({
    NodeHoverChanged: { index: Schema.NullOr(Schema.Int) },
    NodeHoverRequested: { index: Schema.NullOr(Schema.Int) },
  })

  const effects = Block.makeEffectsContract()

  const contract = {
    Model,
    Message,
    InMessage,
    OutMessage,
    inMessageOutputs: { RequestedFocus: { outMessage: OutMessage.NodeHoverRequested } },
    InitArgs: Schema.Tuple([Schema.String]),
    view: { kind: 'Element', Inputs: Block.makeInputContract<Inputs>() },
    effects,
  } satisfies Omit<Block.ContractConfiguration, 'key'> & {
    readonly Model: typeof Model
    readonly Message: typeof Message
    readonly OutMessage: typeof OutMessage
  }

  const plans = <const Key extends symbol>(
    block: ReturnType<typeof Block.make<'Sankey', Key, typeof contract>>,
  ) => {
    const Presentation = presentationClass()

    type Presentation = InstanceType<typeof Presentation>

    const ElementSpec = CustomElement.define({
      tag: `fk-sankey-${name}`,
      properties: {
        presentation: Schema.declare<Presentation>(
          (v): v is Presentation => v instanceof Presentation,
        ),
      },
      events: { 'state-observed': Observation },
    })

    const Drawing =
      DrawingElementBase === undefined
        ? undefined
        : class extends DrawingElementBase {
            #presentation: Presentation | undefined
            #host: Host | undefined
            set presentation(value: Presentation | undefined) {
              this.#presentation = value

              if (value !== undefined) {
                this.#host?.update(value.state, value.inputs)
              }
            }
            get presentation() {
              return this.#presentation
            }
            override acquire(clock: () => number) {
              const p = this.#presentation

              if (p === undefined) {
                throw new TypeError('Sankey requires presentation')
              }

              this.classList.add('contents')
              this.#host = p.inputs.mount(
                this,
                p.state,
                (event) => {
                  this.dispatchEvent(new CustomEvent('state-observed', { detail: event }))
                },
                clock,
              )

              return () => {
                this.#host?.destroy()
                this.#host = undefined
              }
            }
          }

    const register = () => {
      if (Drawing === undefined || typeof customElements === 'undefined') {
        return
      }

      const registered = customElements.get(ElementSpec.tag)

      if (registered === undefined) {
        customElements.define(ElementSpec.tag, Drawing)
      } else if (registered !== Drawing) {
        throw new TypeError('Sankey name belongs to another recipe')
      }
    }

    const Composition = block.makeComposition({ mounts: [Prepare, Mount] })

    return {
      init: Composition.makeInit((id: string) => ({
        model: {
          id,
          revision: 0,
          epoch: 1,
          mounted: false,
          entered: false,
          width: 0,
          height: 0,
          focusedKind: 'none',
          focusedIndex: null,
          focusRevision: 0,
          hoveredNodeIndex: null,
          hoveredLinkIndex: null,
          nodeControlled: false,
          tooltipKind: 'none',
          tooltipIndex: null,
          tooltipRevision: 0,
          tooltipAnchor: null,
        },
      })),
      update: Composition.makeUpdate({
        ObservedFocus: (m, { kind, index, nodeControlled }) => {
          const previous = m.tooltipKind === 'node' ? m.tooltipIndex : null
          const next = kind === 'node' ? index : null

          const model = modifyFields(m, {
            focusedKind: () => kind,
            focusedIndex: () => index,
            hoveredNodeIndex: () => (nodeControlled === true ? m.hoveredNodeIndex : next),
            hoveredLinkIndex: () => (kind === 'link' ? index : null),
            tooltipKind: () => kind,
            tooltipIndex: () => index,
            tooltipAnchor: () => null,
          })

          return previous === next
            ? { model }
            : { model, outMessage: OutMessage.NodeHoverChanged({ index: next }) }
        },
        ObservedNodeControl: (m, { controlled }) => ({
          model: modifyFields(m, { nodeControlled: () => controlled }),
        }),
        ObservedNodeHoverRequest: (model, { index }) => ({
          model,
          outMessage: OutMessage.NodeHoverRequested({ index }),
        }),
        ObservedSize: (m, { width, height }) => ({
          model: modifyFields(m, { width: () => width, height: () => height }),
        }),
        ObservedReplay: (m) => ({
          model: modifyFields(m, { entered: () => false, epoch: (epoch) => epoch + 1 }),
        }),
        ObservedEntered: (m) => ({ model: modifyFields(m, { entered: () => true }) }),
        CompletedDetached: (m) => ({ model: m }),
        CompletedPrepare: (m) => ({ model: modifyFields(m, { mounted: () => true }) }),
        CompletedMount: (m) => ({ model: m }),
      }),
      inMessageUpdate: Composition.makeInMessageUpdate({
        RequestedFocus: (m, { kind, index }) => {
          const nodeIndex = kind === 'node' ? index : null

          const hoveredNodeIndex =
            m.nodeControlled || kind === 'link' ? m.hoveredNodeIndex : nodeIndex

          const linkIndex = kind === 'link' ? index : null
          const hoveredLinkIndex = kind === 'node' ? m.hoveredLinkIndex : linkIndex

          const model = modifyFields(m, {
            focusedKind: () => kind,
            focusedIndex: () => index,
            hoveredNodeIndex: () => hoveredNodeIndex,
            hoveredLinkIndex: () => hoveredLinkIndex,
            focusRevision: (focusRevision) => focusRevision + 1,
          })

          return m.nodeControlled && kind === 'node'
            ? { model, outMessage: OutMessage.NodeHoverRequested({ index }) }
            : { model }
        },
        RequestedTooltip: (m, { kind, index, anchor }) => ({
          model: modifyFields(m, {
            tooltipKind: () => kind,
            tooltipIndex: () => index,
            tooltipAnchor: () => anchor ?? null,
            tooltipRevision: (tooltipRevision) => tooltipRevision + 1,
          }),
        }),
        RequestedRevision: (m, { revision }) => ({
          model: modifyFields(m, { revision: () => revision }),
        }),
      }),

      view: Composition.makeView.withInputs<Inputs>((m, inputs, h) => {
        const drawing = ElementSpec.withMessage(h)

        return h.div(
          [
            h.DataAttribute('bkm-chart', 'sankey'),
            h.Class(
              ['relative w-full', ['ts-chart-surface'].filter(Boolean).join(' ')]
                .filter(Boolean)
                .join(' '),
            ),

            h.OnMount(Prepare()),
          ],
          [
            m.mounted
              ? drawing([
                  drawing.Presentation(new Presentation(m, inputs)),
                  drawing.OnStateObserved((event) => event),
                  h.OnMount(Mount()),
                ])
              : inputs.server(m),
            ...inputs.content(m),
          ],
        )
      }),
      EffectsLayer: Layer.mergeAll(Prepare.layer, Mount.layer).pipe(
        Layer.provide(
          Layer.effect(
            SankeyRegistration,
            Effect.sync(() => {
              register()
              return register
            }),
          ),
        ),

        Layer.fresh,
      ),
    }
  }

  return { namespace: SankeyNamespace, contract, plans }
}
