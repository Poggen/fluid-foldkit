import { Effect, Layer, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  AccordionGroupBlock,
  AccordionGroupLayer,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/ui/fluid/accordion.js'
import type { AccordionConfig } from '@/ui/fluid/accordion.js'
import { createMotionScope } from '@/ui/fluid/motion.js'
import { hoverHighlightAnimation } from '@/ui/fluid/hover-highlight.js'
import { createPresentationContext } from '@/ui/fluid/presentation.js'
import { GaugeBlock, GaugeLayer, GaugeConfiguration } from '@/ui/charts/gauge/index.js'
import './styles.css'
import '@/ui/fluid/styles.css'
import '@/ui/charts/styles.css'

const Message = defineMessageUnion({ Increase: {}, SetSecond: {}, ToggleMount: {} })
const Model = Schema.Struct({
  accordion: AccordionGroupBlock.Model,
  gauge: GaugeBlock.Model,
  visible: Schema.Boolean,
  selection: Schema.Array(Schema.String),
})
const key = Symbol('RegistryConsumer')
const App = Block.make('RegistryConsumer', {
  key,
  Model,
  Message,
  InitArgs: Schema.Tuple([GaugeConfiguration]),
  ChildInitContext: GaugeConfiguration,
  view: { kind: 'Element' },
})
const AccordionBinding = App.makeRequiredFieldBinding(AccordionGroupBlock, {
  field: 'accordion',
  init: {
    contextToArgs: (): readonly [AccordionConfig] => [
      {
        id: 'registry-accordion',
        type: 'single',
        value: '',
        collapsible: true,
        onValueChange: true,
        items: [
          { value: 'one', index: 0 },
          { value: 'two', index: 1 },
        ],
      },
    ],
  },
})
const Accordion = AccordionBinding.withOutMessagePolicy({
  fold: App.makeOutMessageFold(AccordionGroupBlock, {
    ValueChanged: ({ values }) =>
      App.makeStep(() =>
        Update.combineSteps([
          App.makeFieldsStep(() => ({ selection: () => values })),
          AccordionBinding.informOfValue({ value: values }),
        ]),
      ),
  }),
})
const Gauge = App.makeRequiredFieldBinding(GaugeBlock, {
  field: 'gauge',
  init: { contextToArgs: (configuration) => [configuration, 'registry-gauge'] },
})
const composition = App.makeComposition({ bindings: [Accordion, Gauge] })
const motion = createMotionScope('registry-accordion-motion')
const animateHighlight = hoverHighlightAnimation(motion)
const layer = App.makeLayer({
  init: composition.makeInit((configuration) => ({
    childInitContext: configuration,
    model: { visible: true, selection: [] },
  })),
  update: composition.makeUpdate({
    Increase: (model) =>
      Gauge.requestConfigure({
        configuration: {
          ...model.gauge.configuration,
          value: Math.min(100, model.gauge.configuration.value + 10),
        },
      })(model),
    SetSecond: App.makeStep(() =>
      Update.combineSteps([
        Accordion.informOfValue({ value: 'two' }),
        App.makeFieldsStep(() => ({ selection: () => ['two'] })),
      ]),
    ),
    ToggleMount: App.makeFieldsStep((model) => ({ visible: () => !model.visible })),
  }),
  view: composition.makeView((model, h) =>
    h.main(
      [
        h.Style({
          maxWidth: '760px',
          margin: '32px auto',
          padding: '24px',
          fontFamily: 'system-ui',
        }),
      ],
      [
        h.h1([], ['Installed through shadcn']),
        h.p([], ['Unmodified Foldkit preview. Source-owned Fluid Accordion and Bklit Gauge.']),
        h.nav(
          [h.Style({ display: 'flex', gap: '16px', marginBottom: '24px' })],
          [
            h.button([h.OnClick(Message.SetSecond())], ['Open second through Binding']),
            h.button([h.OnClick(Message.Increase())], ['Increase gauge']),
            h.button(
              [h.OnClick(Message.ToggleMount())],
              [model.visible ? 'Unmount components' : 'Remount components'],
            ),
          ],
        ),
        model.visible
          ? h.block(
              Accordion.embedView({
                slotId: 'accordion',
                model: model.accordion,
                viewInputs: {
                  context: createPresentationContext({ reducedMotion: 'user', size: 'default' }),
                  animate: motion.node,
                  animateHighlight,
                  content: (root) =>
                    ['one', 'two'].map((value, index) =>
                      AccordionItem(
                        {
                          value,
                          index,
                          children: (context) => [
                            AccordionTrigger(
                              {
                                value,
                                children: [
                                  value === 'one'
                                    ? 'First registry question'
                                    : 'Second registry question',
                                ],
                              },
                              context,
                              h,
                            ),
                            AccordionContent(
                              {
                                value,
                                children: [
                                  h.p(
                                    [],
                                    [
                                      'Source files, styles, headless children and motion dependencies were installed through the registry.',
                                    ],
                                  ),
                                ],
                              },
                              context,
                              h,
                            ),
                          ],
                        },
                        root,
                        h,
                      ),
                    ),
                },
              }),
            )
          : h.empty,
        model.visible
          ? h.block(Gauge.embedView({ slotId: 'gauge', model: model.gauge, viewInputs: {} }))
          : h.empty,
        h.p(
          [h.Id('status')],
          [
            `Gauge ${model.gauge.configuration.value}; components ${model.visible ? 'mounted' : 'unmounted'}; selected ${model.selection.join(',')}`,
          ],
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(AccordionGroupLayer), Layer.provide(GaugeLayer))

const configuration = Schema.decodeUnknownSync(GaugeConfiguration)({
  value: 60,
  max: 100,
  label: 'Registry gauge',
  centerValue: 93000,
})
const program = Program.makeElement({
  block: App,
  layer,
  Flags: GaugeConfiguration,
  flags: Effect.succeed(configuration),
  container: document.getElementById('root'),
}).provide({ services: Layer.empty, runtime: motion.layer })
Runtime.run(program)
