import { modifyFields } from 'foldkit/struct'
import { DrawingElementBase } from './drawing-element'
import { presentationClass } from './presentation'
import { chartRows } from '../../cartesian/data-boundary'
import type { ChartRowSchema } from '../../cartesian/data-boundary'
import { Effect, Layer, Option, Schema } from 'effect'
import { PolarRegistration } from './registration'
import { Block, CustomElement } from 'foldkit'
import type { Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'

export const PolarControl = Schema.Struct({
  controlled: Schema.Boolean,
  index: Schema.Option(Schema.Int),
})

export type PolarControl = Schema.Schema.Type<typeof PolarControl>

export interface PolarHost<Row> {
  readonly acceptLayout?: (size: number, ready: boolean) => void
  readonly update: (data: ReadonlyArray<Row>, focused: number | null) => void
  readonly destroy: () => void
}

export interface PolarInputs<Row> {
  readonly layout?: 'contents' | 'square'
  readonly size?: number
  readonly className?: string
  readonly style?: Readonly<Record<string, string | number>>
  readonly mount: (
    element: HTMLElement,
    data: ReadonlyArray<Row>,
    focused: number | null,
    observe: (index: number | null) => void,
    clock: () => number,
    observeSize: (size: number) => void,
  ) => PolarHost<Row>
  readonly configure: (host: PolarHost<Row>) => void
  readonly serverContent?: (data: ReadonlyArray<Row>) => Html
  readonly customContent: (data: ReadonlyArray<Row>, focused: number | null, size: number) => Html
}

const PolarNamespace = Block.makeNamespace('Polar')

const LifecycleMessage = defineMessageUnion({ CompletedPrepare: {}, CompletedMount: {} })

// Mount services are named globally; all recipes share these handlers and dispatch to their own element.
const Prepare = PolarNamespace.makeMount('Prepare', {
  messages: [LifecycleMessage.CompletedPrepare, LifecycleMessage.CompletedMount],
  *handler() {
    const register = yield* PolarRegistration

    return ({ element }) =>
      Effect.sync(() => {
        if (!element.isConnected) {
          return LifecycleMessage.CompletedMount()
        }

        register()

        return LifecycleMessage.CompletedPrepare()
      })
  },
})

const Mount = PolarNamespace.makeMount('Mount', {
  messages: [LifecycleMessage.CompletedMount],
  *handler() {
    return ({ element }) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          if (DrawingElementBase === undefined || !(element instanceof DrawingElementBase)) {
            throw new TypeError('Polar Mount requires its native drawing capability')
          }

          return element.acquire(() => performance.now())
        }),
        (release) => Effect.sync(release),
      ).pipe(Effect.as(LifecycleMessage.CompletedMount()))
  },
})

export function polarRecipe<RowSchema extends ChartRowSchema>({
  name,
  Row,
  acceptedLayout = false,
}: {
  readonly name: string
  readonly Row: RowSchema
  readonly acceptedLayout?: boolean
}) {
  if (!/^[a-z][a-z0-9-]*$/u.test(name)) {
    throw new TypeError('Polar Block requires a unique lowercase element namespace')
  }

  type Row = RowSchema['Type']

  const uncontrolled: PolarControl = { controlled: false, index: Option.none() }
  const Focus = Schema.Struct({ index: Schema.NullOr(Schema.Int) })

  const Rows = chartRows(Row)

  const Model = Schema.Struct({
    id: Schema.String,
    data: Rows,
    focusedIndex: Schema.Option(Schema.Int),
    control: PolarControl,
    isMounted: Schema.Boolean,
    size: Schema.Finite,
    hostReady: Schema.Boolean,
  })

  const Message = defineMessageUnion({
    ObservedFocus: Focus.fields,
    ObservedSize: { size: Schema.Finite },
    CompletedPrepare: {},
    CompletedMount: {},
  })

  const InMessage = defineInMessageUnion({
    RequestedData: { data: Rows },
    RequestedFocus: Focus.fields,
    RequestedControl: PolarControl.fields,
  })

  const effects = Block.makeEffectsContract()

  const contract = {
    Model,
    Message,
    InMessage,
    InitArgs: Schema.Tuple([Schema.String, Rows, Schema.optionalKey(PolarControl)]),
    view: { kind: 'Element', Inputs: Block.makeInputContract<PolarInputs<Row>>() },
    effects,
  } satisfies Omit<Block.ContractConfiguration, 'key'> & {
    readonly Model: typeof Model
    readonly Message: typeof Message
  }

  const plans = <const Key extends symbol>(
    block: ReturnType<typeof Block.make<'Polar', Key, typeof contract>>,
  ) => {
    const Presentation = presentationClass<Row>()

    type Presentation = InstanceType<typeof Presentation>

    const PresentationSchema = Schema.declare<Presentation>(
      (v): v is Presentation => v instanceof Presentation,
    )

    const ElementSpec = CustomElement.define({
      tag: `fk-polar-${name}`,
      properties: { presentation: PresentationSchema },
      events: { 'focus-observed': Focus, 'size-observed': Schema.Struct({ size: Schema.Finite }) },
    })

    const Drawing =
      DrawingElementBase === undefined
        ? undefined
        : class extends DrawingElementBase {
            #presentation: Presentation | undefined
            #host: PolarHost<Row> | undefined
            #inputs: PolarInputs<Row> | undefined
            set presentation(value: Presentation | undefined) {
              this.#presentation = value

              if (this.#host !== undefined && value !== undefined) {
                if (this.#inputs !== value.inputs) {
                  this.#inputs = value.inputs
                  value.inputs.configure(this.#host)
                }

                if (acceptedLayout) {
                  this.#host.acceptLayout?.(value.size, value.hostReady)
                }

                this.#host.update(value.data, value.focused)
              }
            }
            get presentation() {
              return this.#presentation
            }
            override acquire(clock: () => number) {
              const p = this.#presentation

              if (p === undefined) {
                throw new TypeError('Polar Mount requires presentation')
              }

              this.classList.add('contents')
              this.#inputs = p.inputs
              this.#host = p.inputs.mount(
                this,
                p.data,
                p.focused,
                (index) => {
                  this.dispatchEvent(new CustomEvent('focus-observed', { detail: { index } }))
                },
                clock,
                (size) => {
                  this.dispatchEvent(new CustomEvent('size-observed', { detail: { size } }))
                },
              )

              return () => {
                this.#host?.destroy()
                this.#host = undefined
                this.#inputs = undefined
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
        throw new TypeError('Polar name belongs to another row definition')
      }
    }

    const Composition = block.makeComposition({ mounts: [Prepare, Mount] })

    return {
      init: Composition.makeInit(
        (id: string, data: ReadonlyArray<Row>, control: PolarControl = uncontrolled) => ({
          model: {
            id,
            data,
            control,
            focusedIndex: control.index,
            isMounted: false,
            size: 0,
            hostReady: false,
          },
        }),
      ),
      update: Composition.makeUpdate({
        ObservedFocus: (m, { index }) => ({
          model: m.control.controlled
            ? m
            : modifyFields(m, { focusedIndex: () => Option.fromNullishOr(index) }),
        }),
        ObservedSize: (m, { size }) => {
          const model = modifyFields(m, { size: () => size, hostReady: () => true })

          return {
            model: acceptedLayout
              ? {
                  id: model.id,
                  data: model.data,
                  focusedIndex: model.focusedIndex,
                  control: model.control,
                  isMounted: model.isMounted,
                  size: model.size,
                  hostReady: model.hostReady,
                }
              : model,
          }
        },
        CompletedPrepare: block.makeFieldsStep(() => ({ isMounted: () => true })),
        CompletedMount: block.makeNoopStep(),
      }),
      inMessageUpdate: Composition.makeInMessageUpdate({
        RequestedData: (m, { data }) => ({ model: modifyFields(m, { data: () => data }) }),
        RequestedFocus: (m, { index }) => ({
          model: modifyFields(m, { focusedIndex: () => Option.fromNullishOr(index) }),
        }),
        RequestedControl: (m, { controlled, index }) => ({
          model: modifyFields(m, {
            control: () => ({ controlled, index }),
            focusedIndex: () => (controlled ? index : m.focusedIndex),
          }),
        }),
      }),
      view: Composition.makeView.withInputs((m, inputs, h) => {
        const drawing = ElementSpec.withMessage(h)
        const fixed = inputs.size !== undefined && inputs.size !== 0

        return h.div(
          [
            h.Class(
              [
                inputs.layout === 'contents'
                  ? 'contents'
                  : fixed
                    ? 'relative w-(--bkm-block-size)! h-(--bkm-block-size)!'
                    : 'relative w-full [aspect-ratio:1_/_1]',
              ].join(' '),
            ),
            h.DataAttribute('bkm-native-chart', m.id),
            h.Style(
              inputs.layout !== 'contents' && fixed
                ? { '--bkm-block-size': `${inputs.size}px` }
                : {},
            ),
            h.OnMount(Prepare()),
          ],
          [
            m.isMounted
              ? drawing([
                  drawing.Presentation(
                    new Presentation(
                      m.data,
                      Option.getOrNull(m.focusedIndex),
                      inputs,
                      m.size,
                      m.hostReady,
                    ),
                  ),
                  drawing.OnFocusObserved(Message.ObservedFocus),
                  drawing.OnSizeObserved(Message.ObservedSize),
                  h.OnMount(Mount()),
                ])
              : (inputs.serverContent?.(m.data) ?? h.empty),
            m.isMounted
              ? inputs.customContent(m.data, Option.getOrNull(m.focusedIndex), m.size)
              : h.empty,
          ],
        )
      }),
      EffectsLayer: Layer.mergeAll(Prepare.layer, Mount.layer).pipe(
        Layer.provide(
          Layer.effect(
            PolarRegistration,
            Effect.sync(() => {
              // Restored Models can render a mounted drawing before any Prepare Mount runs.
              register()
              return register
            }),
          ),
        ),
        // Shared Mount identities capture a separate registration capability for each recipe.
        Layer.fresh,
      ),
    }
  }

  return { namespace: PolarNamespace, contract, plans }
}
