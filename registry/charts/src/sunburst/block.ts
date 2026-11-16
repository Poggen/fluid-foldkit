import { modifyFields } from 'foldkit/struct'
import { DrawingElementBase } from './drawing-element'
import { presentationClass } from './block-presentation'
import { Effect, Layer, Schema } from 'effect'
import { SunburstRegistration } from './registration'
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
  focusId: Schema.NullOr(Schema.String),
  hoveredIndex: Schema.NullOr(Schema.Int),
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
  readonly before: (state: State) => Html
  readonly content: (state: State) => Html
  readonly server: (state: State) => Html
}

export interface Host {
  readonly update: (state: State, inputs: Inputs) => void
  readonly destroy: () => void
}

export type Observation = typeof Observation.Type

export const Observation = defineMessageUnion({
  ObservedControlledFocus: { id: Schema.String },
  ObservedControlledHover: { index: Schema.NullOr(Schema.Int) },
  ObservedFocus: { id: Schema.NullOr(Schema.String) },
  ObservedHover: { index: Schema.NullOr(Schema.Int) },
  ObservedSize: { width: Schema.Finite, height: Schema.Finite },
  ObservedEntered: {},
  ObservedReplay: {},
})

const SunburstNamespace = Block.makeNamespace('Sunburst')

const LifecycleMessage = defineMessageUnion({
  CompletedPrepare: {},
  CompletedDetached: {},
  CompletedMount: {},
})

// Named Mount services are shared; acquisition dispatches to each recipe's typed element.
const Prepare = SunburstNamespace.makeMount('Prepare', {
  messages: [LifecycleMessage.CompletedPrepare, LifecycleMessage.CompletedDetached],
  *handler() {
    const register = yield* SunburstRegistration

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

const Mount = SunburstNamespace.makeMount('Mount', {
  messages: [LifecycleMessage.CompletedMount],
  *handler() {
    return ({ element }) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          if (DrawingElementBase === undefined || !(element instanceof DrawingElementBase)) {
            throw new TypeError('Sunburst Mount requires its native drawing capability')
          }

          return element.acquire(() => performance.now())
        }),
        (release) => Effect.sync(release),
      ).pipe(Effect.as(LifecycleMessage.CompletedMount()))
  },
})

export function sunburstRecipe(name: string) {
  if (!/^[a-z][a-z0-9-]*$/u.test(name)) {
    throw new TypeError('Sunburst requires a unique lowercase element namespace')
  }

  const Model = State

  const Message = defineMessageUnion({
    ObservedFocus: { id: Schema.NullOr(Schema.String) },
    ObservedControlledFocus: { id: Schema.String },
    ObservedControlledHover: { index: Schema.NullOr(Schema.Int) },
    ObservedHover: { index: Schema.NullOr(Schema.Int) },
    ObservedSize: { width: Schema.Finite, height: Schema.Finite },
    ObservedEntered: {},
    ObservedReplay: {},
    CompletedPrepare: {},
    CompletedDetached: {},
    CompletedMount: {},
  })

  const InMessage = defineInMessageUnion({
    RequestedFocus: { id: Schema.NullOr(Schema.String) },
    RequestedHover: { index: Schema.NullOr(Schema.Int) },
    RequestedRevision: { revision: Schema.Int },
  })

  const OutMessage = defineMessageUnion({
    FocusChanged: { id: Schema.String },
    HoverChanged: { index: Schema.NullOr(Schema.Int) },
  })

  const effects = Block.makeEffectsContract()

  const contract = {
    Model,
    Message,
    InMessage,
    OutMessage,
    InitArgs: Schema.Tuple([Schema.String]),
    view: { kind: 'Element', Inputs: Block.makeInputContract<Inputs>() },
    effects,
  } satisfies Omit<Block.ContractConfiguration, 'key'> & {
    readonly Model: typeof Model
    readonly Message: typeof Message
    readonly OutMessage: typeof OutMessage
  }

  const plans = <const Key extends symbol>(
    block: ReturnType<typeof Block.make<'Sunburst', Key, typeof contract>>,
  ) => {
    const Presentation = presentationClass()

    type Presentation = InstanceType<typeof Presentation>

    const ElementSpec = CustomElement.define({
      tag: `fk-sunburst-${name}`,
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
                throw new TypeError('Sunburst requires presentation')
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
        throw new TypeError('Sunburst name belongs to another recipe')
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
          focusId: null,
          hoveredIndex: null,
        },
      })),
      update: Composition.makeUpdate({
        ObservedControlledFocus: (m, { id }) => ({
          model: m,
          outMessage: OutMessage.FocusChanged({ id }),
        }),
        ObservedControlledHover: (m, { index }) => ({
          model: m,
          outMessage: OutMessage.HoverChanged({ index }),
        }),
        ObservedFocus: (m, { id }) => ({
          model: modifyFields(m, { focusId: () => id, hoveredIndex: () => null }),
        }),
        ObservedHover: (m, { index }) => ({
          model: modifyFields(m, { hoveredIndex: () => index }),
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
        RequestedFocus: (m, { id }) => ({
          model: modifyFields(m, { focusId: () => id, hoveredIndex: () => null }),
        }),
        RequestedHover: (m, { index }) => ({
          model: modifyFields(m, { hoveredIndex: () => index }),
        }),
        RequestedRevision: (m, { revision }) => ({
          model: modifyFields(m, { revision: () => revision }),
        }),
      }),

      view: Composition.makeView.withInputs<Inputs>((m, inputs, h) => {
        const drawing = ElementSpec.withMessage(h)

        return h.div(
          [h.Class('contents'), h.OnMount(Prepare())],
          [
            inputs.before(m),
            m.mounted
              ? drawing([
                  drawing.Presentation(new Presentation(m, inputs)),
                  drawing.OnStateObserved((event) => event),
                  h.OnMount(Mount()),
                ])
              : inputs.server(m),
            inputs.content(m),
          ],
        )
      }),
      EffectsLayer: Layer.mergeAll(Prepare.layer, Mount.layer).pipe(
        Layer.provide(
          Layer.effect(
            SunburstRegistration,
            Effect.sync(() => {
              // Restored Models can render a mounted drawing before any Prepare Mount runs.
              register()
              return register
            }),
          ),
        ),
        // Shared Mount identities retain the capability belonging to this recipe.
        Layer.fresh,
      ),
    }
  }

  return { namespace: SunburstNamespace, contract, plans }
}
