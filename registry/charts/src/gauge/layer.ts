import { modifyFields } from 'foldkit/struct'
import { GaugeBlock } from './block'
import { gaugePresentation } from './model'
import type { GaugeConfiguration, GaugeViewInputs } from './model'
import { Effect, Layer, Schema } from 'effect'
import { CustomElement } from 'foldkit'
import { mountGauge } from './host'
import type { GaugeHost } from './host'
import { GaugeProps } from './props'
import { gaugeServerView } from './server-view'

const GaugeElement = CustomElement.define({
  tag: 'fk-bklit-gauge',
  properties: { configuration: GaugeProps },
  events: {},
})

const { Message } = GaugeBlock

const GaugeDrawingElement =
  typeof HTMLElement === 'undefined'
    ? undefined
    : class extends HTMLElement {
        #configuration: GaugeProps | undefined
        #host: GaugeHost | undefined
        set configuration(value: GaugeProps | undefined) {
          this.#configuration = value

          if (value !== undefined) {
            this.#host?.update(value)
          }
        }
        get configuration(): GaugeProps | undefined {
          return this.#configuration
        }
        acquire(id: string) {
          this.classList.add('contents')

          if (this.#configuration !== undefined && this.#host === undefined) {
            this.#host = mountGauge(this, this.#configuration, id)
          }

          return () => {
            this.#host?.destroy()
            this.#host = undefined
          }
        }
      }

const registerGauge = () => {
  const Constructor = GaugeDrawingElement

  if (Constructor === undefined) {
    throw new TypeError('Gauge requires a browser DOM')
  }

  if (customElements.get('fk-bklit-gauge') === undefined) {
    customElements.define('fk-bklit-gauge', Constructor)
  }

  return Constructor
}

const PrepareGauge = GaugeBlock.makeMount('PrepareGauge', {
  messages: [Message.CompletedPrepare, Message.CompletedMount],
  *handler() {
    return ({ element }) =>
      Effect.sync(() => {
        if (!element.isConnected) {
          return Message.CompletedMount()
        }

        registerGauge()

        return Message.CompletedPrepare()
      })
  },
})

const acquireGauge = (element: Element, id: string) => {
  const Constructor = registerGauge()

  if (!(element instanceof Constructor)) {
    throw new TypeError('Gauge Mount requires its registered drawing element')
  }

  return element.acquire(id)
}

const MountGauge = GaugeBlock.makeMount('MountGauge', {
  args: { id: Schema.String },
  messages: [Message.CompletedMount],
  *handler() {
    return ({ element, id }) =>
      Effect.acquireRelease(
        Effect.sync(() => acquireGauge(element, id)),
        (release) => Effect.sync(release),
      ).pipe(Effect.as(Message.CompletedMount()))
  },
})

const GaugeComposition = GaugeBlock.makeComposition({ mounts: [PrepareGauge, MountGauge] })

const EffectsLayer = Layer.mergeAll(PrepareGauge.layer, MountGauge.layer)

const plans = {
  init: GaugeComposition.makeInit((configuration: GaugeConfiguration, id: string) => ({
    model: { configuration, id, isMounted: false },
  })),
  update: GaugeComposition.makeUpdate({
    CompletedPrepare: GaugeBlock.makeFieldsStep(() => ({ isMounted: () => true })),
    CompletedMount: GaugeBlock.makeNoopStep(),
  }),
  inMessageUpdate: GaugeComposition.makeInMessageUpdate({
    RequestedConfigure: (model, { configuration }) => ({
      model: modifyFields(model, { configuration: () => configuration }),
    }),
  }),
  view: GaugeComposition.makeView.withInputs<GaugeViewInputs>((model, inputs, h) => {
    const configuration = gaugePresentation(model.configuration, inputs)
    const gauge = GaugeElement.withMessage(h)

    return h.div(
      [h.Class('contents'), h.OnMount(PrepareGauge())],
      [
        model.isMounted
          ? gauge([gauge.Configuration(configuration), h.OnMount(MountGauge({ id: model.id }))])
          : gaugeServerView(h, configuration, model.id),
      ],
    )
  }),
  EffectsLayer,
}

export const GaugeLayer = GaugeBlock.makeLayer<typeof plans>(plans)
