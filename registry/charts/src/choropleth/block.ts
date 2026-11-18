import { modifyFields } from 'foldkit/struct'
import { DrawingElementBase } from './drawing-element'
import { presentationClass } from './presentation'
import { Effect, Layer, Schema } from 'effect'
import { ChoroplethRegistration } from './registration'
import { Block, CustomElement } from 'foldkit'
import type { Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'

export const State = Schema.Struct({
  id: Schema.String,
  revision: Schema.Int,
  epoch: Schema.Int,
  mounted: Schema.Boolean,
  entered: Schema.Boolean,
  width: Schema.Finite,
  height: Schema.Finite,
  hoveredIndex: Schema.NullOr(Schema.Int),
  hoverRevision: Schema.Int,
  scale: Schema.Finite,
  translateX: Schema.Finite,
  translateY: Schema.Finite,
  dragging: Schema.Boolean,
})

export type State = typeof State.Type

export const InitialZoom = Schema.Struct({
  scale: Schema.Finite,
  translateX: Schema.Finite,
  translateY: Schema.Finite,
})

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
  ObservedHover: { index: Schema.NullOr(Schema.Int) },
  ObservedTransform: {
    scale: Schema.Finite,
    x: Schema.Finite,
    y: Schema.Finite,
    dragging: Schema.Boolean,
  },
  ObservedSize: { width: Schema.Finite, height: Schema.Finite },
  ObservedEntered: {},
  ObservedReplay: {},
})

const ChoroplethNamespace = Block.makeNamespace('Choropleth')

const LifecycleMessage = defineMessageUnion({
  CompletedPrepare: {},
  CompletedDetached: {},
  CompletedMount: {},
})

const Prepare = ChoroplethNamespace.makeMount('Prepare', {
  messages: [LifecycleMessage.CompletedPrepare, LifecycleMessage.CompletedDetached],
  *handler() {
    const register = yield* ChoroplethRegistration

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

const Mount = ChoroplethNamespace.makeMount('Mount', {
  messages: [LifecycleMessage.CompletedMount],
  *handler() {
    return ({ element }) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          if (DrawingElementBase === undefined || !(element instanceof DrawingElementBase)) {
            throw new TypeError('Choropleth Mount requires its native drawing capability')
          }

          return element.acquire(() => performance.now())
        }),
        (release) => Effect.sync(release),
      ).pipe(Effect.as(LifecycleMessage.CompletedMount()))
  },
})

export function choroplethRecipe(name: string) {
  if (!/^[a-z][a-z0-9-]*$/u.test(name)) {
    throw new TypeError('Choropleth requires a unique lowercase element namespace')
  }

  const initialZoomDefaults: typeof InitialZoom.Type = { scale: 1, translateX: 0, translateY: 0 }
  const Model = State

  const Message = defineMessageUnion({
    ObservedHover: { index: Schema.NullOr(Schema.Int) },
    ObservedTransform: {
      scale: Schema.Finite,
      x: Schema.Finite,
      y: Schema.Finite,
      dragging: Schema.Boolean,
    },
    ObservedSize: { width: Schema.Finite, height: Schema.Finite },
    ObservedEntered: {},
    ObservedReplay: {},
    CompletedPrepare: {},
    CompletedDetached: {},
    CompletedMount: {},
  })

  const InMessage = defineInMessageUnion({
    RequestedHover: { index: Schema.NullOr(Schema.Int) },
    RequestedTransform: { scale: Schema.Finite, x: Schema.Finite, y: Schema.Finite },
    RequestedRevision: { revision: Schema.Int },
  })

  const effects = Block.makeEffectsContract()

  const contract = {
    Model,
    Message,
    InMessage,
    InitArgs: Schema.Tuple([Schema.String, Schema.optionalKey(InitialZoom)]),
    view: { kind: 'Element', Inputs: Block.makeInputContract<Inputs>() },
    effects,
  } satisfies Omit<Block.ContractConfiguration, 'key'> & {
    readonly Model: typeof Model
    readonly Message: typeof Message
  }

  const plans = <const Key extends symbol>(
    block: ReturnType<typeof Block.make<'Choropleth', Key, typeof contract>>,
  ) => {
    const Presentation = presentationClass()

    type Presentation = InstanceType<typeof Presentation>

    const ElementSpec = CustomElement.define({
      tag: `fk-choropleth-${name}`,
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
                throw new TypeError('Choropleth requires presentation')
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
        throw new TypeError('Choropleth name belongs to another recipe')
      }
    }

    const Composition = block.makeComposition({ mounts: [Prepare, Mount] })

    return {
      init: Composition.makeInit(
        (id: string, initialZoom: typeof InitialZoom.Type = initialZoomDefaults) => ({
          model: {
            id,
            revision: 0,
            epoch: 1,
            mounted: false,
            entered: false,
            width: 0,
            height: 0,
            hoveredIndex: null,
            hoverRevision: 0,
            ...initialZoom,
            dragging: false,
          },
        }),
      ),
      update: Composition.makeUpdate({
        ObservedHover: (m, { index }) => ({
          model: modifyFields(m, { hoveredIndex: () => index }),
        }),
        ObservedTransform: (m, { scale, x, y, dragging }) => ({
          model: modifyFields(m, {
            scale: () => scale,
            translateX: () => x,
            translateY: () => y,
            dragging: () => dragging,
          }),
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
        RequestedHover: (m, { index }) => ({
          model: modifyFields(m, {
            hoveredIndex: () => index,
            hoverRevision: (hoverRevision) => hoverRevision + 1,
          }),
        }),
        RequestedTransform: (m, { scale, x, y }) => ({
          model: modifyFields(m, { scale: () => scale, translateX: () => x, translateY: () => y }),
        }),
        RequestedRevision: (m, { revision }) => ({
          model: modifyFields(m, { revision: () => revision }),
        }),
      }),

      view: Composition.makeView.withInputs<Inputs>((m, inputs, h) => {
        const drawing = ElementSpec.withMessage(h)

        return h.div(
          [
            h.DataAttribute('bkm-chart', 'choropleth'),
            h.Class(
              ['relative w-full overflow-hidden', ['ts-chart-surface'].filter(Boolean).join(' ')]
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
            ChoroplethRegistration,
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

  return { namespace: ChoroplethNamespace, contract, plans }
}
