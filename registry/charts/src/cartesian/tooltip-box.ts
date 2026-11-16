import { modifyFields } from 'foldkit/struct'
import { Effect, Layer, Schema } from 'effect'
import { Block, CustomElement } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { chartChildren } from './content-types'
import { chartStyleProperties } from './style'
import { useChartConfig } from './chart-config'
import { TooltipBoxMotionPolicy } from './tooltip-box-context'
import { TooltipBoxConfiguration } from './tooltip-box-model'
import type { TooltipBoxInputs } from './tooltip-box-model'
import { createTooltipBoxResource } from './tooltip-box-resource'

const TooltipElement = CustomElement.define({
  tag: 'fk-bklit-tooltip-box',
  properties: { configuration: TooltipBoxConfiguration },
  events: {},
})

const Model = Schema.Struct({
  id: Schema.String,
  configuration: TooltipBoxConfiguration,
  mounted: Schema.Boolean,
})

const Message = defineMessageUnion({
  Prepared: {},
  Mounted: {},
})

const InMessage = defineInMessageUnion({
  RequestedConfigure: { configuration: TooltipBoxConfiguration },
})

const effects = Block.makeEffectsContract()

export const TooltipBoxKey = Symbol('TooltipBox')

export const TooltipBoxBlock = Block.make('TooltipBox', {
  key: TooltipBoxKey,
  Model,
  Message,
  InMessage,
  InitArgs: Schema.Tuple([Schema.String, TooltipBoxConfiguration]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<TooltipBoxInputs>() },
  effects,
})

const DrawingElement =
  typeof HTMLElement === 'undefined'
    ? undefined
    : class extends HTMLElement {
        #configuration: TooltipBoxConfiguration | undefined
        #resource: ReturnType<typeof createTooltipBoxResource> | undefined
        #placeholder: Comment | undefined
        get configuration(): TooltipBoxConfiguration | undefined {
          return this.#configuration
        }
        set configuration(value: TooltipBoxConfiguration | undefined) {
          this.#configuration = value
          this.#synchronize()
        }
        #container() {
          const id = this.#configuration?.containerId

          const container =
            id === undefined || id === ''
              ? null
              : this.ownerDocument.querySelector(`#${CSS.escape(id)}`)

          if (!container || container === this || this.contains(container)) {
            throw new TypeError('TooltipBox requires an existing external container')
          }

          return container
        }
        #synchronize() {
          if (!this.#resource || !this.#configuration) {
            return
          }

          const container = this.#container()

          const containerChanged = this.parentElement !== container

          if (containerChanged) {
            container.append(this)
          }

          this.#resource.show(this.#configuration, containerChanged)
        }
        #release() {
          const resource = this.#resource
          this.#resource = undefined

          try {
            resource?.destroy()
          } finally {
            this.#placeholder?.replaceWith(this)
            this.#placeholder = undefined
          }
        }
        acquire(policy: TooltipBoxMotionPolicy) {
          // Validate before creating an observer or changing the portal topology.
          this.#container()

          try {
            this.#placeholder = this.ownerDocument.createComment('TooltipBox portal origin')
            this.before(this.#placeholder)
            this.#resource = createTooltipBoxResource(this, {
              reducedMotion: policy.reducedMotion,
              ...policy.positions?.get(this.id),
            })
            this.#synchronize()
          } catch (error) {
            this.#release()
            throw error
          }

          return () => {
            this.#release()
          }
        }
      }

const registerTooltip = () => {
  const Constructor = DrawingElement

  if (Constructor === undefined) {
    throw new TypeError('TooltipBox requires a browser DOM')
  }

  if (customElements.get('fk-bklit-tooltip-box') === undefined) {
    customElements.define('fk-bklit-tooltip-box', Constructor)
  }

  return Constructor
}

const Prepare = TooltipBoxBlock.makeMount('Prepare', {
  messages: [Message.Prepared, Message.Mounted],
  *handler() {
    return ({ element }) =>
      Effect.sync(() => {
        if (!element.isConnected) {
          return Message.Mounted()
        }

        registerTooltip()

        return Message.Prepared()
      })
  },
})

const Mount = TooltipBoxBlock.makeMount('Mount', {
  messages: [Message.Mounted],
  *handler() {
    const policy = yield* TooltipBoxMotionPolicy

    return ({ element }) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          const Constructor = registerTooltip()

          if (!(element instanceof Constructor)) {
            throw new TypeError('TooltipBox requires its registered element')
          }

          return element.acquire(policy)
        }),
        (release) => Effect.sync(release),
      ).pipe(Effect.as(Message.Mounted()))
  },
})

const TooltipBoxComposition = TooltipBoxBlock.makeComposition({ mounts: [Prepare, Mount] })

const plans = {
  init: TooltipBoxComposition.makeInit((id: string, configuration: TooltipBoxConfiguration) => ({
    model: { id, configuration, mounted: false },
  })),
  update: TooltipBoxComposition.makeUpdate({
    Prepared: TooltipBoxBlock.makeFieldsStep(() => ({ mounted: () => true })),
    Mounted: TooltipBoxBlock.makeNoopStep(),
  }),
  inMessageUpdate: TooltipBoxComposition.makeInMessageUpdate({
    RequestedConfigure: (model, { configuration }) => ({
      model: modifyFields(model, { configuration: () => configuration }),
    }),
  }),
  view: TooltipBoxComposition.makeView.withInputs<TooltipBoxInputs>((model, inputs, h) => {
    const element = TooltipElement.withMessage(h)

    const { 'transform-origin': declaredOrigin, ...panelStyle } = chartStyleProperties({
      backgroundColor: inputs.backgroundColor,
      ...inputs.panelStyle,
    })

    const origin = Object.hasOwn(inputs.panelStyle ?? {}, 'transformOrigin')
      ? (declaredOrigin ?? '')
      : undefined

    return h.div(
      [h.Class('contents'), h.OnMount(Prepare())],
      [
        model.mounted && model.configuration.visible
          ? element(
              [
                h.Id(model.id),
                h.Class(
                  [
                    'pointer-events-none absolute z-50',
                    `ts-chart-tooltip ${inputs.className ?? ''}`,
                  ]
                    .filter(Boolean)
                    .join(' '),
                ),

                element.Configuration({
                  ...model.configuration,
                  springConfig:
                    model.configuration.springConfig ??
                    useChartConfig(inputs.environment).tooltipBoxSpring,
                }),
                h.OnMount(Mount()),
              ],
              [
                h.div(
                  [
                    h.Class(
                      [
                        'ts-chart-tooltip__body min-w-[140px] overflow-hidden rounded-lg text-chart-tooltip-foreground shadow-lg',
                        inputs.panelStyle?.backgroundColor === undefined &&
                          (inputs.backgroundColor === undefined ||
                            inputs.backgroundColor === 'var(--chart-tooltip-background)') &&
                          'bg-chart-tooltip-background',
                        inputs.panelStyle?.backdropFilter === undefined && 'backdrop-blur-md',
                      ]
                        .filter(Boolean)
                        .join(' '),
                    ),
                    h.Style(panelStyle),
                    ...(panelStyle.opacity === undefined
                      ? []
                      : [h.Attribute('data-bkm-tooltip-opacity', panelStyle.opacity)]),
                    ...(panelStyle.transform === undefined
                      ? []
                      : [h.Attribute('data-bkm-tooltip-transform', panelStyle.transform)]),
                    ...(origin === undefined
                      ? []
                      : [h.Attribute('data-bkm-tooltip-transform-origin', origin)]),
                  ],
                  chartChildren(inputs.children),
                ),
              ],
            )
          : h.empty,
      ],
    )
  }),
  EffectsLayer: Layer.mergeAll(Prepare.layer, Mount.layer),
}

export const TooltipBoxLayer = TooltipBoxBlock.makeLayer<typeof plans>(plans)
