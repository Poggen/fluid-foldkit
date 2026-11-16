import { DateTime, Layer, Option, Schema, Struct } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  Line,
  LineChart,
  Candlestick,
  CandlestickChart,
  ChartTooltip,
  PatternCircles,
} from '../../src/index'
import type { CartesianViewInputs } from '../../src/cartesian/block'

export const rootCases = [
  'default',
  'fluid',
  'conflict',
  'string',
  'ratio',
  'border',
  'content',
  'fill',
  'paint',
  'restored',
] as const
const Case = Schema.Literals(rootCases)
type Case = typeof Case.Type
const Row = Schema.Struct({
  date: Schema.DateFromString,
  value: Schema.Finite,
  open: Schema.Finite,
  high: Schema.Finite,
  low: Schema.Finite,
  close: Schema.Finite,
})
const rows = [10, 20, 15].map((value, index) =>
  Row.make({
    date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 86_400_000)),
    value,
    open: value - 2,
    high: value + 4,
    low: value - 4,
    close: value + 2,
  }),
)

export function familyRootFixture(
  name: string,
  lowLevel = false,
  initial: Case = 'default',
  family: 'line' | 'candle' = 'line',
) {
  const recipe = family === 'candle' ? CandlestickChart({ name, Row }) : LineChart({ name, Row })
  const ChartKey = Symbol(name)
  const Chart = Block.make(recipe.namespace, { key: ChartKey, ...recipe.contract })
  const props = {
    width: 640,
    height: 320,
    animationDuration: 1100,
    className: 'relative w-full root-caller',
    children: [
      PatternCircles({ id: 'root-pattern', width: 8, height: 8, fill: 'var(--root-ink, black)' }),
      family === 'candle' ? Candlestick({}) : Line({ dataKey: 'value' }),
      ChartTooltip(),
    ],
  }
  const base = recipe.inputs(name, props)
  const presentation: Readonly<Record<Case, CartesianViewInputs<typeof Row.Type>>> = {
    default: base,
    fluid: recipe.inputs(name, Struct.omit(props, ['width', 'height'])),
    conflict: recipe.inputs(name, {
      ...props,
      className: 'static w-1/2 root-caller',
      style: { width: 480, height: 240, '--root-ink': 'rgb(1, 2, 3)' },
    }),
    string: recipe.inputs(name, { ...props, style: { width: '50%', height: '240px' } }),
    ratio: recipe.inputs(name, {
      ...Struct.omit(props, ['height']),
      style: { width: 480, aspectRatio: '1 / 1' },
    }),
    border: recipe.inputs(name, {
      ...props,
      style: { padding: 20, border: '2px solid black', boxSizing: 'border-box' },
    }),
    content: recipe.inputs(name, {
      ...props,
      style: { padding: 20, border: '2px solid black', boxSizing: 'content-box' },
    }),
    fill: recipe.inputs(name, { ...props, style: { height: '100%', aspectRatio: 'unset' } }),
    paint: recipe.inputs(name, {
      ...props,
      style: { '--root-ink': 'rgb(1, 2, 3)', backgroundColor: 'rgb(240, 245, 250)' },
    }),
    restored: base,
  }
  let compiles = 0
  let observed: HTMLDivElement | null = null
  const lowBase = Struct.omit(base, [
    'familyRoot',
    'createResource',
    'configureResource',
    'resourceDefinition',
    'renderContent',
    'renderContext',
    'resources',
    'observeContainer',
    'tooltip',
  ])
  const lowDefinition: typeof lowBase.definition = (...args) => {
    compiles += 1
    return lowBase.definition(...args)
  }
  const ParentKey = Symbol(`${name}-parent`)
  const Message = defineMessageUnion({ Changed: { value: Case }, Focused: {}, Toggled: {} })
  const Parent = Block.make('FamilyRootFixture', {
    key: ParentKey,
    Model: Schema.Struct({ chart: Chart.Model, selected: Case, mounted: Schema.Boolean }),
    Message,
    InitArgs: Schema.Tuple([]),
    view: { kind: 'Element' },
  })
  const Binding = Parent.makeRequiredFieldBinding(Chart, {
    field: 'chart',
    init: { contextToArgs: () => [name, rows, recipe.configuration(props)] },
  })
  const Composition = Parent.makeComposition({ bindings: [Binding] })
  const inputs = (selected: Case): CartesianViewInputs<typeof Row.Type> => {
    if (lowLevel)
      return {
        ...lowBase,
        definition: lowDefinition,
        width: selected === 'conflict' ? 480 : 640,
        height: selected === 'conflict' ? 240 : 320,
        ariaLabel: selected === 'conflict' ? 'Changed chart' : 'Initial chart',
      }
    const current = presentation[selected]
    return {
      ...base,
      ...current,
      definitionRevision: base.definitionRevision,
      definition: base.definition,
      observeContainer: (element) => {
        observed = element
        return undefined
      },
      renderContext: (h) =>
        h.output(
          [h.DataAttribute('root-context', ''), h.Style({ color: 'var(--root-ink, black)' })],
          ['checked sibling'],
        ),
    }
  }
  const layer = Parent.makeLayer({
    init: Composition.makeInit(() => ({ model: { selected: initial, mounted: true } })),
    update: Composition.makeUpdate({
      Changed: Parent.makeFieldsStep((_model, message) => ({ selected: () => message.value })),
      Focused: Binding.requestFocus({ index: 1 }),
      Toggled: Parent.makeFieldsStep(() => ({ mounted: (value) => !value })),
    }),
    view: Composition.makeView((model, h) =>
      h.div(
        [],
        [
          ...rootCases.map((value) =>
            h.button(
              [h.DataAttribute('case', value), h.OnClick(Message.Changed({ value }))],
              [value],
            ),
          ),
          h.button([h.DataAttribute('focus', ''), h.OnClick(Message.Focused())], ['Focus']),
          h.button([h.DataAttribute('toggle', ''), h.OnClick(Message.Toggled())], ['Toggle']),
          h.section(
            [
              h.DataAttribute('fixture-parent', ''),
              h.Style({
                width: '640px',
                height: '400px',
                ...(model.selected === 'fluid'
                  ? { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }
                  : {}),
              }),
            ],
            [
              model.mounted
                ? h.block(
                    Binding.embedView({
                      slotId: 'chart',
                      model: model.chart,
                      viewInputs: inputs(model.selected),
                    }),
                  )
                : h.empty,
            ],
          ),
          h.output(
            [h.DataAttribute('fixture-state', '')],
            [
              `${model.selected};${model.chart.generation};${Option.getOrNull(model.chart.focusedIndex) ?? 'none'}`,
            ],
          ),
        ],
      ),
    ),
  }).pipe(Layer.provide(Chart.makeLayer(recipe.plans(Chart))))
  return {
    block: Parent,
    layer,
    get observed() {
      return observed
    },
    get compiles() {
      return compiles
    },
  }
}
