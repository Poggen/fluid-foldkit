import { Button } from '@foldkit/ui'
import { Boolean } from 'effect'
import { Effect, Layer, Schema } from 'effect'
import { motionValue } from 'motion-dom'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  TooltipBoxBlock,
  TooltipBoxLayer,
  TooltipContent,
  TooltipBoxMotionPolicy,
  createTooltipBoxMotionLayer,
  ChartConfigProvider,
  defaultChartEnvironment,
} from '@foldkit-visuals/charts/tooltip-box'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

const query = new URLSearchParams(window.location.search)

const reducedPolicy = query.get('reducedPolicy')

const reducedMotion =
  reducedPolicy === 'user' || reducedPolicy === 'always' ? reducedPolicy : 'never'

const positions = query.has('positionSource')
  ? new Map([['public-tooltip-box', { left: motionValue(120), top: motionValue(60) }]])
  : undefined

const environment = query.has('customSpring')
  ? ChartConfigProvider({
      value: { tooltipBoxSpring: { stiffness: 40, damping: 12 } },
      children: (value) => value,
    })
  : defaultChartEnvironment

const defaultConfiguration = {
  containerId: 'tooltip-box-container',
  x: 80,
  y: 120,
  containerWidth: 640,
  containerHeight: 320,
  visible: false,
}

const configuration = query.has('explicitSpring')
  ? { ...defaultConfiguration, springConfig: { stiffness: 100, damping: 20 } }
  : defaultConfiguration

const Model = Schema.Struct({
  tooltip: TooltipBoxBlock.Model,
  isMounted: Schema.Boolean,
  isWide: Schema.Boolean,
  hasCustomOrigin: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedShow: {},
  ClickedFirstContainer: {},
  ClickedSecondContainer: {},
  ClickedMoveSource: {},
  CompletedMoveSource: {},
  ClickedExpand: {},
  ClickedOrigin: {},
  ClickedRight: {},
  ClickedLeft: {},
  ClickedHide: {},
  ClickedStatic: {},
  ClickedPlain: {},
  ClickedUnmount: {},
  ClickedRemount: {},
})

export const TooltipBoxShowcaseKey = Symbol('TooltipBoxShowcase')

const TooltipBoxShowcaseBlock = Block.make('TooltipBoxShowcase', {
  key: TooltipBoxShowcaseKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})

const MoveSource = TooltipBoxShowcaseBlock.makeCommand('MoveSource', {
  messages: [Message.CompletedMoveSource],
  *handler() {
    const policy = yield* TooltipBoxMotionPolicy

    return () =>
      Effect.sync(() => {
        const source = policy.positions?.get('public-tooltip-box')
        source?.left?.set(source.left.get() === 120 ? 340 : 120)
        source?.top?.set(source.top.get() === 60 ? 180 : 60)

        return Message.CompletedMoveSource()
      })
  },
})

const Binding = TooltipBoxShowcaseBlock.makeRequiredFieldBinding(TooltipBoxBlock, {
  field: 'tooltip',
  init: { contextToArgs: () => ['public-tooltip-box', configuration] },
})

const TooltipBoxShowcaseComposition = TooltipBoxShowcaseBlock.makeComposition({
  bindings: [Binding],
})

const layer = TooltipBoxShowcaseBlock.makeLayer({
  init: TooltipBoxShowcaseComposition.makeInit(() => ({
    model: { isMounted: true, isWide: false, hasCustomOrigin: false },
  })),
  update: TooltipBoxShowcaseComposition.makeUpdate({
    ClickedMoveSource: TooltipBoxShowcaseBlock.makeCommandsStep(() => [MoveSource()]),
    CompletedMoveSource: TooltipBoxShowcaseBlock.makeNoopStep(),
    ClickedExpand: TooltipBoxShowcaseBlock.makeFieldsStep(() => ({ isWide: Boolean.not })),
    ClickedOrigin: TooltipBoxShowcaseBlock.makeFieldsStep(() => ({
      hasCustomOrigin: Boolean.not,
    })),
    ClickedFirstContainer: Binding.requestConfigure({
      configuration: { ...configuration, visible: true },
    }),
    ClickedSecondContainer: Binding.requestConfigure({
      configuration: {
        ...configuration,
        visible: true,
        containerId: 'tooltip-box-container-secondary',
      },
    }),
    ClickedShow: Binding.requestConfigure({ configuration: { ...configuration, visible: true } }),
    ClickedRight: Binding.requestConfigure({
      configuration: { ...configuration, visible: true, x: 580, y: 250 },
    }),
    ClickedLeft: Binding.requestConfigure({
      configuration: { ...configuration, visible: true, x: 60, y: 120 },
    }),
    ClickedHide: Binding.requestConfigure({ configuration }),
    ClickedStatic: Binding.requestConfigure({
      configuration: { ...configuration, visible: true, x: 580, y: 250, animate: false },
    }),
    ClickedPlain: Binding.requestConfigure({
      configuration: { ...configuration, visible: true, x: 80, y: 120, entrance: false },
    }),
    ClickedUnmount: TooltipBoxShowcaseBlock.makeFieldsStep(() => ({ isMounted: () => false })),
    ClickedRemount: TooltipBoxShowcaseBlock.makeFieldsStep(() => ({ isMounted: () => true })),
  }),
  EffectsLayer: MoveSource.layer,
  view: TooltipBoxShowcaseComposition.makeView((model, h) =>
    h.div(
      [],
      [
        h.nav(
          [],
          [
            Button.view(
              {
                onClick: Message.ClickedShow(),
                toView: (attributes) => h.button([...attributes.button], ['Show']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedExpand(),
                toView: (attributes) => h.button([...attributes.button], ['Expand content']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedOrigin(),
                toView: (attributes) => h.button([...attributes.button], ['Custom panel']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedRight(),
                toView: (attributes) => h.button([...attributes.button], ['Near right']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedLeft(),
                toView: (attributes) => h.button([...attributes.button], ['Near left']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedHide(),
                toView: (attributes) => h.button([...attributes.button], ['Hide']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedStatic(),
                toView: (attributes) => h.button([...attributes.button], ['Static position']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedPlain(),
                toView: (attributes) => h.button([...attributes.button], ['No entrance']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedUnmount(),
                toView: (attributes) => h.button([...attributes.button], ['Unmount']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedRemount(),
                toView: (attributes) => h.button([...attributes.button], ['Remount']),
              },
              h,
            ),
            ...(positions
              ? [
                  Button.view(
                    {
                      onClick: Message.ClickedMoveSource(),
                      toView: (attributes) => h.button([...attributes.button], ['Move source']),
                    },
                    h,
                  ),
                ]
              : []),
          ],
        ),
        h.div([
          h.Class('relative [width:640px] [height:320px] [border:1px_solid_#ccc]'),
          h.Id(configuration.containerId),
        ]),
        h.nav(
          [],
          [
            Button.view(
              {
                onClick: Message.ClickedFirstContainer(),
                toView: (attributes) => h.button([...attributes.button], ['First container']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedSecondContainer(),
                toView: (attributes) => h.button([...attributes.button], ['Second container']),
              },
              h,
            ),
          ],
        ),
        h.div([
          h.Class('relative [width:640px] [height:320px] [border:1px_solid_#ccc]'),
          h.Id('tooltip-box-container-secondary'),
        ]),
        model.isMounted
          ? h.block(
              Binding.embedView({
                slotId: 'box',
                model: model.tooltip,
                viewInputs: {
                  environment,
                  panelStyle: model.hasCustomOrigin
                    ? { transformOrigin: '20% 80%', opacity: 0.6, transform: 'rotate(3deg)' }
                    : {},
                  children: TooltipContent({
                    title: 'Public tooltip',
                    rows: [
                      {
                        label: model.isWide
                          ? 'Revenue from an expanded content-only observation'
                          : 'Revenue',
                        value: 120,
                        color: 'orange',
                      },
                      { label: 'Cost', value: 72, color: 'green' },
                    ],
                  }),
                },
              }),
            )
          : h.empty,
      ],
    ),
  ),
}).pipe(
  Layer.provide(TooltipBoxLayer),
  Layer.provide(
    createTooltipBoxMotionLayer(positions ? { reducedMotion, positions } : { reducedMotion }),
  ),
)

Runtime.run(
  Program.makeElement({
    block: TooltipBoxShowcaseBlock,
    layer,
    container: document.querySelector<HTMLElement>('#root'),
  }),
)
