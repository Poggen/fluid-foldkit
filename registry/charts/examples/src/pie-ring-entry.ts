import { Button } from '@foldkit/ui'
import { Layer, Option, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { PieChart, PieSlice, PieCenter, PieData } from '@foldkit-visuals/charts/pie'
import { RingChart, Ring, RingCenter, RingData } from '@foldkit-visuals/charts/ring'
import type { PieChartProps } from '@foldkit-visuals/charts/pie'
import type { RingChartProps } from '@foldkit-visuals/charts/ring'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

const flags = new URLSearchParams(window.location.search)
const fluid = flags.has('fluid'),
  scrub = flags.has('scrub'),
  controlled = flags.has('controlled')
const many = flags.has('many')
const pieData = many
  ? Array.from({ length: 40 }, (_, index) => ({ label: `Group ${index + 1}`, value: 30 }))
  : [
      { label: 'North', value: 40 },
      { label: 'South', value: 30 },
      { label: 'East', value: 20 },
      { label: 'West', value: 10 },
    ]
const updatedPieData = pieData.map((datum, index) => ({
  ...datum,
  value: datum.value + (index === 0 ? 15 : 0),
}))
const updatedRingData = updatedPieData.map((datum, index) => ({
  ...datum,
  value: datum.value + (index === 1 ? 5 : 0),
  maxValue: 50,
}))
const ringData = pieData.map((d) => ({ ...d, maxValue: 50 }))
const ringEnter = flags.get('enter')
const ringTransition =
  ringEnter === 'instant'
    ? { type: 'tween', duration: 0 }
    : ringEnter === 'spring'
      ? { type: 'spring', stiffness: 100, damping: 8 }
      : ringEnter === 'linear'
        ? { type: 'tween', duration: 0.8, ease: 'linear' }
        : ringEnter === 'function'
          ? { type: 'tween', duration: 0.8, ease: (value: number) => value * value }
          : undefined

const pie = PieChart({ name: 'pie-complete', Row: PieData }),
  ring = RingChart({ name: 'ring-complete', Row: RingData })
export const PieKey = Symbol('ShowcasePie')
export const RingKey = Symbol('ShowcaseRing')
const Pie = Block.make(pie.namespace, { ...pie.contract, key: PieKey })
const RingBlock = Block.make(ring.namespace, { ...ring.contract, key: RingKey })
const chartLayers = Layer.mergeAll(
  Pie.makeLayer(pie.plans<typeof PieKey>(Pie)),
  RingBlock.makeLayer(ring.plans<typeof RingKey>(RingBlock)),
)
const pieProps: PieChartProps = {
  data: pieData,
  ...(fluid ? {} : { size: 320 }),
  geometryScrubbing: scrub,
  ...(controlled ? { hoveredIndex: 1 } : {}),
  innerRadius: 70,
  children: [
    ...(many
      ? pieData.map((_, index) => PieSlice({ index, hoverEffect: 'translate' }))
      : [
          PieSlice({ index: 0, hoverEffect: 'grow' }),
          PieSlice({ index: 1, hoverEffect: 'translate' }),
        ]),
    PieCenter(),
  ],
}
const ringProps: RingChartProps = {
  data: ringData,
  ...(ringTransition === undefined ? {} : { enterTransition: ringTransition }),
  ...(fluid ? {} : { size: 320 }),
  geometryScrubbing: scrub,
  ...(controlled ? { hoveredIndex: 1 } : {}),
  children: [
    ...(many
      ? ringData.map((_, index) => Ring({ index, lineCap: 'butt', showGlow: !flags.has('noGlow') }))
      : [
          ...(flags.has('two') ? [Ring({ index: 0 })] : []),
          Ring({ index: 1, lineCap: 'butt', showGlow: !flags.has('noGlow') }),
        ]),
    RingCenter(),
  ],
}
const centerClasses = {
  default: undefined,
  custom: 'ts-bkm-fixture-center-value [font-size:24px] [line-height:1.75] font-medium',
  empty: '',
}
const centerProps = (mode: keyof typeof centerClasses) =>
  mode === 'default' ? {} : { valueClassName: centerClasses[mode] }
const pieVariants = (mode: keyof typeof centerClasses) =>
  pie.inputs('pie', {
    ...pieProps,
    children: (pieProps.children ?? []).map((child) =>
      child.kind === 'center' ? PieCenter(centerProps(mode)) : child,
    ),
  })
const ringVariants = (mode: keyof typeof centerClasses) =>
  ring.inputs('ring', {
    ...ringProps,
    children: (ringProps.children ?? []).map((child) =>
      child.kind === 'center' ? RingCenter(centerProps(mode)) : child,
    ),
  })
const pieInputs = {
  default: pieVariants('default'),
  custom: pieVariants('custom'),
  empty: pieVariants('empty'),
}
const ringInputs = {
  default: ringVariants('default'),
  custom: ringVariants('custom'),
  empty: ringVariants('empty'),
}
const pieAlternate = pie.inputs('pie', {
  ...pieProps,
  size: 280,
  innerRadius: 50,
  padAngle: 0.05,
  cornerRadius: 8,
  startAngle: 0,
  endAngle: Math.PI * 1.5,
  children: [
    PieSlice({ index: 0, fill: 'purple', hoverEffect: 'none' }),
    PieCenter({ prefix: '$', defaultLabel: 'Revenue' }),
  ],
})
const ringAlternate = ring.inputs('ring', {
  ...ringProps,
  size: 280,
  strokeWidth: 22,
  ringGap: 3,
  baseInnerRadius: 45,
  startAngle: 0,
  endAngle: Math.PI * 1.5,
  children: [
    Ring({ index: 0, color: 'purple', animate: false }),
    RingCenter({ suffix: '%', defaultLabel: 'Progress' }),
  ],
})
const Model = Schema.Struct({
  pie: Pie.Model,
  ring: RingBlock.Model,
  centerClass: Schema.Literals(['default', 'custom', 'empty']),
  isAlternate: Schema.Boolean,
  isVisible: Schema.Boolean,
})
const Message = defineMessageUnion({
  ClickedCenterCustom: {},
  ClickedCenterEmpty: {},
  ClickedCenterDefault: {},
  ClickedChange: {},
  ClickedValuesChanged: {},
  ClickedEmpty: {},
  ClickedRestore: {},
  ClickedUnmount: {},
  ClickedFocus: {},
  ClickedFocusFirst: {},
  ClickedFocusLast: {},
  ClickedClearFocus: {},
})
export const PolarFixtureKey = Symbol('PolarFixture')
const PolarFixtureBlock = Block.make('PolarFixture', {
  key: PolarFixtureKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const PieBinding = PolarFixtureBlock.makeRequiredFieldBinding(Pie, {
  field: 'pie',
  init: { contextToArgs: () => ['pie', pieData, pie.configuration(pieProps)] },
})
const RingBinding = PolarFixtureBlock.makeRequiredFieldBinding(RingBlock, {
  field: 'ring',
  init: { contextToArgs: () => ['ring', ringData, ring.configuration(ringProps)] },
})
const PolarFixtureComposition = PolarFixtureBlock.makeComposition({
  bindings: [PieBinding, RingBinding],
})
const layer = PolarFixtureBlock.makeLayer({
  init: PolarFixtureComposition.makeInit(() => ({
    model: { centerClass: 'default', isAlternate: false, isVisible: true },
  })),
  update: PolarFixtureComposition.makeUpdate({
    ClickedCenterCustom: (m) => ({ model: { ...m, centerClass: 'custom', isAlternate: false } }),
    ClickedCenterEmpty: (m) => ({ model: { ...m, centerClass: 'empty', isAlternate: false } }),
    ClickedCenterDefault: (m) => ({ model: { ...m, centerClass: 'default', isAlternate: false } }),
    ClickedChange: (m) => ({ model: { ...m, isAlternate: !m.isAlternate } }),
    ClickedUnmount: (m) => ({ model: { ...m, isVisible: !m.isVisible } }),
    ClickedValuesChanged: Update.combineSteps([
      PieBinding.requestData({ data: updatedPieData }),
      RingBinding.requestData({ data: updatedRingData }),
    ]),
    ClickedEmpty: Update.combineSteps([
      PieBinding.requestData({ data: [] }),
      RingBinding.requestData({ data: [] }),
    ]),
    ClickedRestore: Update.combineSteps([
      PieBinding.requestData({ data: pieData }),
      RingBinding.requestData({ data: ringData }),
    ]),
    ClickedFocusLast: Update.combineSteps([
      PieBinding.requestControl(
        pie.configuration({ ...pieProps, hoveredIndex: pieData.length - 1 }),
      ),
      RingBinding.requestControl(
        ring.configuration({ ...ringProps, hoveredIndex: ringData.length - 1 }),
      ),
    ]),
    ClickedFocusFirst: Update.combineSteps([
      PieBinding.requestControl(pie.configuration({ ...pieProps, hoveredIndex: 0 })),
      RingBinding.requestControl(ring.configuration({ ...ringProps, hoveredIndex: 0 })),
    ]),
    ClickedClearFocus: Update.combineSteps([
      PieBinding.requestControl(pie.configuration({ ...pieProps, hoveredIndex: null })),
      RingBinding.requestControl(ring.configuration({ ...ringProps, hoveredIndex: null })),
    ]),
    ClickedFocus: Update.combineSteps([
      PieBinding.requestControl(pie.configuration({ ...pieProps, hoveredIndex: 1 })),
      RingBinding.requestControl(ring.configuration({ ...ringProps, hoveredIndex: 1 })),
    ]),
  }),
  view: PolarFixtureComposition.makeView((m, h) =>
    h.div(
      [h.Class('[line-height:1.5]')],
      [
        h.nav(
          [
            h.Class(
              '[&_button]:box-border [&_button]:[border:0] [&_button]:[border-radius:0] [&_button]:bg-transparent [&_button]:[font:inherit] [&_button]:[line-height:24px] [&_button]:[padding:6px_10px]',
            ),
          ],
          [
            Button.view(
              {
                onClick: Message.ClickedCenterCustom(),
                toView: (attributes) => h.button([...attributes.button], ['Custom value class']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedCenterEmpty(),
                toView: (attributes) => h.button([...attributes.button], ['Empty value class']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedCenterDefault(),
                toView: (attributes) => h.button([...attributes.button], ['Default value class']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedChange(),
                toView: (attributes) => h.button([...attributes.button], ['Change options']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedValuesChanged(),
                toView: (attributes) => h.button([...attributes.button], ['Change values']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedEmpty(),
                toView: (attributes) => h.button([...attributes.button], ['Empty']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedRestore(),
                toView: (attributes) => h.button([...attributes.button], ['Restore']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedUnmount(),
                toView: (attributes) => h.button([...attributes.button], ['Toggle mount']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedFocusFirst(),
                toView: (attributes) => h.button([...attributes.button], ['Focus first']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedFocus(),
                toView: (attributes) => h.button([...attributes.button], ['Focus second']),
              },
              h,
            ),
            ...(many
              ? [
                  Button.view(
                    {
                      onClick: Message.ClickedFocusLast(),
                      toView: (attributes) => h.button([...attributes.button], ['Focus last']),
                    },
                    h,
                  ),
                ]
              : []),
            Button.view(
              {
                onClick: Message.ClickedClearFocus(),
                toView: (attributes) => h.button([...attributes.button], ['Clear focus']),
              },
              h,
            ),
          ],
        ),
        h.section(
          [
            h.Class(['[max-width:320px] [height:320px]', fluid ? 'w-full' : 'w-[320px]'].join(' ')),
            h.Id('pie-fixture'),
          ],
          m.isVisible
            ? [
                h.block(
                  PieBinding.embedView({
                    slotId: 'pie',
                    model: m.pie,
                    viewInputs: m.isAlternate ? pieAlternate : pieInputs[m.centerClass],
                  }),
                ),
              ]
            : [],
        ),
        h.section(
          [
            h.Class(['[max-width:320px] [height:320px]', fluid ? 'w-full' : 'w-[320px]'].join(' ')),
            h.Id('ring-fixture'),
          ],
          m.isVisible
            ? [
                h.block(
                  RingBinding.embedView({
                    slotId: 'ring',
                    model: m.ring,
                    viewInputs: m.isAlternate ? ringAlternate : ringInputs[m.centerClass],
                  }),
                ),
              ]
            : [],
        ),
        h.output(
          [h.Id('state')],
          [
            `Pie ${Option.getOrNull(m.pie.focusedIndex) ?? 'none'} Ring ${Option.getOrNull(m.ring.focusedIndex) ?? 'none'} rows ${m.pie.data.length}`,
          ],
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(chartLayers))
await document.fonts.load('500 14px Geist')
Runtime.run(
  Program.makeElement({
    block: PolarFixtureBlock,
    layer,
    container: document.getElementById('root'),
  }),
)
