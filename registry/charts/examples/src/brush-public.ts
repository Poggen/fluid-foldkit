import { Button } from '@foldkit/ui'
import { Boolean } from 'effect'
import { modifyFields } from 'foldkit/struct'
import type { TimeSeriesProps } from '@foldkit-visuals/charts/line'
import { DateTime, Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Area, Line, LineChart } from '@foldkit-visuals/charts/line'
import { ChartBrush, ChartBrushLayout } from '@foldkit-visuals/charts/brush'
import type { ChartBrushProps, ChartBrushLayoutProps } from '@foldkit-visuals/charts/brush'

const Row = Schema.Struct({
  date: Schema.DateFromString,
  value: Schema.Finite,
  label: Schema.String,
})

const data: ReadonlyArray<typeof Row.Type> = [20, 55, 35, 70, 40, 90].map((value, index) => ({
  date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 200)),
  value,
  label: `Point ${index}`,
}))

const main = LineChart({ name: 'brush-main', Row })

export const brush = ChartBrush({ name: 'brush-strip', Row })

export const BrushMainKey = Symbol('Cartesian')

export const BrushKey = Symbol('Brush')

export const MainBlock = Block.make(main.namespace, { key: BrushMainKey, ...main.contract })

export const BrushBlock = Block.make(brush.namespace, { key: BrushKey, ...brush.contract })

const childLayers = Layer.mergeAll(
  MainBlock.makeLayer(main.plans<typeof BrushMainKey>(MainBlock)),
  BrushBlock.makeLayer(brush.plans<typeof BrushKey>(BrushBlock)),
)

const plotProps: TimeSeriesProps<typeof Row.Type> = {
  width: 640,
  height: 100,
  margin: { top: 8, bottom: 8, left: 20, right: 20 },
  animationDuration: 0,
  children: [Area({ dataKey: 'value', fadeEdges: false })],
}

const brushProps: ChartBrushProps = {
  selectionPattern: { preset: 'diagonal', color: 'var(--chart-1)' },
}

const owner = (enabled: boolean) => brush.configuration({ enabled }, plotProps, brushProps)

const strip = brush.plot('brush-strip', plotProps, brushProps)

const mainProps = {
  width: 640,
  height: 320,
  animationDuration: 0,
  children: [Line({ dataKey: 'value', fadeEdges: false })],
}

const mainInputs = main.inputs('brush-main', {
  ...mainProps,
  xDomain: [
    DateTime.toDateUtc(DateTime.makeUnsafe(0)),
    DateTime.toDateUtc(DateTime.makeUnsafe(1000)),
  ],
  xDomainSlotCount: data.length,
})

const unrestrictedInputs = main.inputs('brush-main', mainProps)

const slotSelection = {
  start: DateTime.toDateUtc(DateTime.makeUnsafe(200)),
  end: DateTime.toDateUtc(DateTime.makeUnsafe(600)),
}

const Model = Schema.Struct({
  main: MainBlock.Model,
  brush: BrushBlock.Model,
  isVisible: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedToggle: {},
  ClickedReplace: {},
  ClickedClear: {},
  ClickedPresenceChanged: {},
})

export const BrushFixtureKey = Symbol('BrushFixture')

const BrushFixtureBlock = Block.make('BrushFixture', {
  key: BrushFixtureKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})

export const MainBinding = BrushFixtureBlock.makeRequiredFieldBinding(MainBlock, {
  field: 'main',
  init: {
    contextToArgs: () => ['brush-main', data, main.configuration(mainProps)],
  },
})

export const BrushBinding = BrushFixtureBlock.makeRequiredFieldBinding(BrushBlock, {
  field: 'brush',
  init: { contextToArgs: () => ['brush-owner', data, owner(true)] },
}).withOutMessagePolicy({
  fold: BrushFixtureBlock.makeOutMessageFold(BrushBlock, {
    SelectionObserved: ({ viewport, enabled }) =>
      MainBinding.requestBrush({ range: enabled ? viewport : Option.none() }),
    ViewportChanged: ({ viewport, enabled }) =>
      MainBinding.requestBrush({ range: enabled ? viewport : Option.none() }),
  }),
})

const BrushFixtureComposition = BrushFixtureBlock.makeComposition({
  bindings: [MainBinding, BrushBinding],
})

export const brushFixtureView = BrushFixtureComposition.makeView((model, h) => {
  const props: ChartBrushLayoutProps<typeof Row.Type> = {
    data: model.brush.data,
    enabled: model.brush.owner.enabled,
    height: 100,
    children: (layout) =>
      h.div(
        [],
        [
          h.nav(
            [],
            [
              Button.view(
                {
                  onClick: Message.ClickedToggle(),
                  toView: (attributes) => h.button([...attributes.button], ['Toggle brush']),
                },
                h,
              ),
              Button.view(
                {
                  onClick: Message.ClickedReplace(),
                  toView: (attributes) => h.button([...attributes.button], ['Replace equal data']),
                },
                h,
              ),
              Button.view(
                {
                  onClick: Message.ClickedClear(),
                  toView: (attributes) => h.button([...attributes.button], ['Full extent']),
                },
                h,
              ),
              Button.view(
                {
                  toView: (attributes) =>
                    h.button(
                      [...attributes.button, ...layout.selectionAttributes(null)],
                      ['Slot reset'],
                    ),
                },
                h,
              ),
              Button.view(
                {
                  toView: (attributes) =>
                    h.button(
                      [...attributes.button, ...layout.selectionAttributes(slotSelection)],
                      ['Slot select'],
                    ),
                },
                h,
              ),
            ],
          ),
          h.block(
            MainBinding.embedView({
              slotId: 'main',
              model: model.main,
              viewInputs: layout.xDomainSlotCount === undefined ? unrestrictedInputs : mainInputs,
            }),
          ),
          h.output(
            [h.Id('brush-status')],
            [
              Option.match(model.main.brush, {
                onNone: () =>
                  layout.xDomain === undefined
                    ? 'Unrestricted'
                    : `${layout.xDomain[0].getTime()}..${layout.xDomain[1].getTime()}`,
                onSome: (range) => `${range.start}..${range.end}`,
              }),
            ],
          ),
        ],
      ),
    brushStrip: () => strip,
  }

  return h.div(
    [h.Class('[width:640px] [line-height:normal]'), h.Id('brush-fixture')],
    [
      Button.view(
        {
          onClick: Message.ClickedPresenceChanged(),
          toView: (attributes) =>
            h.button(
              [...attributes.button],
              [model.isVisible ? 'Hide chart group' : 'Show chart group'],
            ),
        },
        h,
      ),
      model.isVisible
        ? h.block(
            BrushBinding.embedView({
              slotId: 'brush',
              model: model.brush,
              viewInputs: ChartBrushLayout(props),
            }),
          )
        : h.empty,
    ],
  )
})

export const BrushFixtureLayer = BrushFixtureBlock.makeLayer({
  init: BrushFixtureComposition.makeInit(() => ({ model: { isVisible: true } })),
  update: BrushFixtureComposition.makeUpdate({
    ClickedPresenceChanged: (model) => ({
      model: modifyFields(model, { isVisible: Boolean.not }),
    }),
    ClickedToggle: (model) =>
      BrushBinding.requestConfigure({ owner: owner(!model.brush.owner.enabled) })(model),
    ClickedReplace: (model) => {
      const rows = [...model.brush.data]

      return Update.combineSteps([
        MainBinding.requestData({ data: rows }),
        BrushBinding.requestData({ data: rows }),
      ])(model)
    },
    ClickedClear: BrushBinding.requestSelection({ range: Option.none() }),
  }),
  view: brushFixtureView,
}).pipe(Layer.provide(childLayers))

export const BrushFixture = { block: BrushFixtureBlock, layer: BrushFixtureLayer }
