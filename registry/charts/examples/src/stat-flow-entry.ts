import { Button } from '@foldkit/ui'
import { Boolean } from 'effect'
import { Layer, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { ChartStatFlowBlock, ChartStatFlowLayer } from '@foldkit-visuals/charts/stat-flow'
import { nextStatFormat, statFlowConfiguration } from './stat-flow-data'
import type { StatFlowFormatName } from './stat-flow-data'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

export const StatFlowShowcaseKey = Symbol('StatFlowShowcase')

const Model = Schema.Struct({
  counter: ChartStatFlowBlock.Model,
  value: Schema.Finite,
  format: Schema.Literals(['plain', 'compact', 'currency', 'percent']),
  isMounted: Schema.Boolean,
  hasIcon: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedChange: {},
  ClickedSmallValue: {},
  ClickedReverse: {},
  ClickedFormatChanged: {},
  ClickedIconToggled: {},
  ClickedMountToggled: {},
})

const StatFlowShowcaseBlock = Block.make('StatFlowShowcase', {
  key: StatFlowShowcaseKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const Counter = StatFlowShowcaseBlock.makeRequiredFieldBinding(ChartStatFlowBlock, {
  field: 'counter',
  activeWhen: (model) => model.isMounted,
  init: { contextToArgs: () => [statFlowConfiguration(90000, 'plain')] },
})
const StatFlowShowcaseComposition = StatFlowShowcaseBlock.makeComposition({
  bindings: [Counter],
})

const accept = (value: number, format: StatFlowFormatName) =>
  Update.combineSteps([
    StatFlowShowcaseBlock.makeFieldsStep(() => ({
      value: () => value,
      format: () => format,
    })),
    Counter.requestConfigure({ configuration: statFlowConfiguration(value, format) }),
  ])

const layer = StatFlowShowcaseBlock.makeLayer({
  init: StatFlowShowcaseComposition.makeInit(() => ({
    model: { value: 90000, format: 'plain', isMounted: true, hasIcon: false },
  })),
  update: StatFlowShowcaseComposition.makeUpdate({
    ClickedChange: StatFlowShowcaseBlock.makeStep((model) =>
      accept(model.value === 90000 ? 94000 : 90000, model.format),
    ),
    ClickedSmallValue: StatFlowShowcaseBlock.makeStep((model) => accept(0.125, model.format)),
    ClickedReverse: StatFlowShowcaseBlock.makeStep((model) => accept(-model.value, model.format)),
    ClickedFormatChanged: StatFlowShowcaseBlock.makeStep((model) =>
      accept(model.value, nextStatFormat(model.format)),
    ),
    ClickedIconToggled: StatFlowShowcaseBlock.makeFieldsStep(() => ({
      hasIcon: Boolean.not,
    })),
    ClickedMountToggled: StatFlowShowcaseBlock.makeStep((model) =>
      model.isMounted
        ? StatFlowShowcaseBlock.makeFieldsStep(() => ({ isMounted: () => false }))
        : Update.combineSteps([
            StatFlowShowcaseBlock.makeFieldsStep(() => ({ isMounted: () => true })),
            Counter.requestConfigure({
              configuration: statFlowConfiguration(model.value, model.format),
            }),
          ]),
    ),
  }),
  view: StatFlowShowcaseComposition.makeView((model, h) =>
    h.div(
      [
        h.Class(
          '[width:640px] [margin:0_auto] [font-size:16px] [line-height:24px] [&_nav]:flex [&_nav]:flex-wrap [&_nav]:[gap:8px] [&_nav]:[margin-bottom:16px] [&_button]:[border:1px_solid_#d4d4d4] [&_button]:[border-radius:4px] [&_button]:bg-white [&_button]:[padding:6px_10px] [&_button]:text-chart-example-ink [&_button]:[font:inherit] [&_button]:cursor-pointer [&_p]:[margin:0_0_16px]',
        ),
      ],
      [
        h.nav(
          [],
          [
            Button.view(
              {
                onClick: Message.ClickedChange(),
                toView: (attributes) => h.button([...attributes.button], ['Change value']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedSmallValue(),
                toView: (attributes) => h.button([...attributes.button], ['Small value']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedReverse(),
                toView: (attributes) => h.button([...attributes.button], ['Reverse sign']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedFormatChanged(),
                toView: (attributes) => h.button([...attributes.button], ['Change format']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedIconToggled(),
                toView: (attributes) => h.button([...attributes.button], ['Toggle icon']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedMountToggled(),
                toView: (attributes) => h.button([...attributes.button], ['Toggle mount']),
              },
              h,
            ),
          ],
        ),
        h.p([h.Role('status')], [`Format: ${model.format}`]),
        h.section(
          [
            h.Class(
              'flex [height:180px] flex-col items-center justify-center [border:1px_solid_#d4d4d4] [border-radius:8px]',
            ),
            h.AriaLabel('Revenue statistic'),
          ],
          model.isMounted
            ? [
                h.block(
                  Counter.embedView({
                    slotId: 'revenue',
                    model: model.counter,
                    viewInputs: model.hasIcon ? { icon: ['◇'] } : {},
                  }),
                ),
              ]
            : [],
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(ChartStatFlowLayer))

export const StatFlowShowcase = { block: StatFlowShowcaseBlock, layer }

Runtime.run(
  Program.makeElement({
    block: StatFlowShowcase.block,
    layer: StatFlowShowcase.layer,
    container: document.getElementById('root'),
  }),
)
