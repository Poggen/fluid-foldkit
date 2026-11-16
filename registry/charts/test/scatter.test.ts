import { Effect, Predicate, DateTime, Schema } from 'effect'
import { expect } from 'vitest'
import { it as effectIt } from '@effect/vitest'
import { Block, Story } from 'foldkit'
import type { SceneNode } from '@tanstack/charts'
import type { CartesianSnapshot } from '../src/cartesian/definition'
import { overlayPlotOf } from '../src/cartesian/hover-overlay-model'
import { createChartRuntime } from '@tanstack/charts/runtime'
import {
  ChartTooltip,
  Grid,
  Line,
  LinearGradient,
  RadialGradient,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
} from '@foldkit-visuals/charts/scatter'

const Row = Schema.Struct({
  date: Schema.DateFromString,
  a: Schema.Union([Schema.Finite, Schema.String]),
  b: Schema.Finite,
})

const data = [
  { a: 10, b: 100 },
  { a: '20', b: 200 },
  { a: -30, b: 300 },
].map((values, index) =>
  Row.make({ ...values, date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 1000)) }),
)

const root = ScatterChart({ name: 'scatter-contract', Row })

export const ScatterContractKey = Symbol('ScatterContract')

const Chart = Block.make(root.namespace, { key: ScatterContractKey, ...root.contract })

const subject = { block: Chart, layer: Chart.makeLayer(root.plans(Chart)) }

const props = {
  animationDuration: 0,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  children: [
    Scatter({ dataKey: 'a', fill: 'red', strokeWidth: 2, outlineWidth: 1 }),
    Scatter({ dataKey: 'b', fill: 'blue', strokeWidth: 0, yAxisId: 'right' }),
    XAxis(),
    YAxis(),
    YAxis({ yAxisId: 'right' }),
  ],
}

const flatten = (nodes: ReadonlyArray<SceneNode>): ReadonlyArray<SceneNode> =>
  nodes.flatMap((node) => (node.kind === 'group' ? flatten(node.children) : [node]))

effectIt.effect(
  'retains the same Scatter observations when grid fades are enabled or disabled',
  () =>
    Story.withBlock(subject, (chart) => {
      const runtime = createChartRuntime<typeof Row.Type, Date, number>()
      const pointKeys: Array<Array<string>> = []

      try {
        for (const fade of [false, true]) {
          const nextProps = {
            ...props,
            children: [...props.children, Grid({ rowTickValues: [0, 10], fadeHorizontal: fade })],
          }

          const model = chart.init('source-scatter-grid', data, root.configuration(nextProps)).model

          const armed = chart.update(
            model,
            chart.Message.ObservedPhaseTiming({
              generation: model.generation,
              elapsed: null,
              at: 1000,
            }),
          ).model

          let maskCount = -1

          const definition = root.inputs('source-scatter-grid', nextProps).resourceDefinition?.(
            data,
            armed,
            (snapshot) => {
              maskCount = snapshot.sourceGrid?.length ?? 0
            },
            () => 1000,
          )

          if (definition === undefined) {
            throw new Error('Scatter must compile its ordinary grid consumer')
          }

          const scene = runtime.render(definition, { width: 600, height: 350 })

          const rows = scene.nodes
            .flatMap((node) => (node.kind === 'group' ? node.children : []))
            .find((node) => node.key === 'source-grid-rows')

          if (rows?.kind !== 'group') {
            throw new Error('Scatter grid must remain a public decorative rule mark')
          }

          expect(rows.clip).toBeUndefined()
          expect(maskCount).toBe(fade ? 1 : 0)
          expect(rows.children).toHaveLength(2)
          pointKeys.push(scene.points.map((point) => point.key))
          expect(scene.points.every((point) => data.includes(point.datum))).toBe(true)
        }

        expect(pointKeys[0]).toEqual(pointKeys[1])
        expect(pointKeys[0]?.length).toBeGreaterThan(0)
      } finally {
        runtime.destroy()
      }
    }),
)

effectIt.effect(
  'renders only axes before the checked mount clock and retains original rows through sparse multiaxis disc/ring geometry',
  () =>
    Effect.gen(function* () {
      const initial = yield* Story.story(
        subject,
        Story.init('scatter-contract', data, root.configuration(props)),
      )
      const inputs = root.inputs('scatter-contract', props)

      const definition = (model: typeof Chart.Model.Type) => {
        const value = inputs.resourceDefinition?.(
          data,
          model,
          () => {},
          () => 1000,
        )

        if (value === undefined) {
          throw new Error('Missing scatter definition')
        }

        return value
      }

      const runtime = createChartRuntime<typeof Row.Type, Date, number>()

      try {
        const before = runtime.render(definition(initial), { width: 600, height: 350 })
        expect(flatten(before.nodes).filter((node) => node.kind === 'dot')).toHaveLength(0)

        const armed = yield* Story.story(
          subject,
          Story.given(initial),
          Story.messageWith((model: typeof Chart.Model.Type) =>
            Chart.Message.ObservedPhaseTiming({
              generation: model.generation,
              elapsed: null,
              at: 1000,
            }),
          ),
        )

        const scene = runtime.render(definition(armed), { width: 600, height: 350 })
        const circles = flatten(scene.nodes).filter((node) => node.kind === 'dot')
        expect(circles).toHaveLength(9)
        expect(
          circles
            .filter((node) => node.interaction?.point?.group === 'a')
            .map((node) => (node.kind === 'dot' ? node.radius : 0)),
        ).toEqual([9.5, 5, 8, 9.5, 5, 8])
        const disc = circles.find((node) => node.style?.fill === 'red')
        expect(disc?.style?.stroke).toBeUndefined()
        expect(disc?.style?.strokeWidth).toBeUndefined()
        expect(scene.scales.x?.domain).toEqual([
          DateTime.toDateUtc(DateTime.makeUnsafe(-52)),
          DateTime.toDateUtc(DateTime.makeUnsafe(2052)),
        ])
        expect(scene.scales.y?.domain).toEqual([0, 11])
        expect(scene.scales['y:right']?.domain).toEqual([0, 350])
        expect(
          scene.points
            .filter((point) => point.markId === 'a')
            .map((point) => data.indexOf(point.datum)),
        ).toEqual([0, 0, 2, 2])
        expect(
          scene.points.filter((point) => point.markId === 'b').map((point) => point.datum),
        ).toEqual(data)

        yield* Story.story(
          subject,
          Story.given(armed),
          Story.models(
            Story.steps(
              Story.messageWith((model: typeof Chart.Model.Type) =>
                Chart.Message.ObservedPhaseTiming({
                  generation: model.generation,
                  elapsed: 500,
                  at: 1500,
                }),
              ),
            ),
            (before, duplicate) => expect(duplicate).toBe(before),
          ),
          Story.inMessage(
            Chart.InMessage.RequestedConfigure({
              configuration: root.configuration({ ...props, revealSignature: 'again' }),
            }),
          ),
          Story.model((replay) => {
            expect(replay.revealReady).toBe(false)
            expect(replay.phaseClockReady).toBe(false)
          }),
        )
      } finally {
        runtime.destroy()
      }
    }),
)

const readyDefinition = (nextProps: Parameters<typeof root.inputs>[1], rows = data) =>
  Story.withBlock(subject, (chart) => {
    const initial = chart.init('scatter-contract', rows, root.configuration(nextProps)).model

    const armed = chart.update(
      initial,
      chart.Message.ObservedPhaseTiming({
        generation: initial.generation,
        elapsed: null,
        at: 1000,
      }),
    ).model

    const definition = root.inputs('scatter-contract', nextProps).resourceDefinition?.(
      rows,
      armed,
      () => {},
      () => 1000,
    )

    if (definition === undefined) {
      throw new Error('Missing scatter definition')
    }

    return definition
  })

effectIt.effect(
  'renders gradients in source carrier-role order and ignores unrelated series carriers',
  () =>
    Effect.gen(function* renderGradientCarriers() {
      const definition = yield* readyDefinition({
        ...props,
        children: [
          LinearGradient({ id: 'first', from: 'red', to: 'blue' }),
          Scatter({ dataKey: 'a', fill: 'url(#first)', strokeWidth: 0 }),
          RadialGradient({ id: 'second', from: 'white', to: 'black' }),
          Line({ dataKey: 'b', stroke: 'green' }),
          LinearGradient({ id: 'third', from: 'yellow', to: 'green' }),
        ],
      })

      const runtime = createChartRuntime<typeof Row.Type, Date, number>()

      try {
        const scene = runtime.render(definition, { width: 600, height: 350 })

        expect(scene.gradients.map((gradient) => gradient.id)).toEqual(['first', 'third', 'second'])
        expect(scene.gradients[0]?.stops.map((stop) => stop.color)).toEqual(['red', 'blue'])
        expect(
          flatten(scene.nodes)
            .filter((node) => node.kind === 'dot')
            .map((node) => node.style?.fill),
        ).toEqual(['url(#first)', 'url(#first)'])
        expect(scene.points.map((point) => point.markId)).toEqual(['a', 'a'])
      } finally {
        runtime.destroy()
      }
    }),
)

effectIt.effect('does not install group focus when no tooltip is declared', () =>
  Effect.gen(function* omitTooltipFocus() {
    const definition = yield* readyDefinition({
      ...props,
      children: [Scatter({ dataKey: 'a', strokeWidth: 0 })],
    })

    expect(definition.focus).toBeUndefined()
  }),
)

effectIt.effect(
  'keeps the source nearest-y primary within a focused x group and excludes the margins',
  () =>
    Effect.gen(function* resolveNearestGroup() {
      const definition = yield* readyDefinition({
        ...props,
        margin: { top: 40, right: 40, bottom: 40, left: 40 },
        children: [
          Scatter({ dataKey: 'a', strokeWidth: 0 }),
          Scatter({ dataKey: 'b', strokeWidth: 0, yAxisId: 'right' }),
          ChartTooltip(),
        ],
      })

      const strategy = definition.focus

      if (strategy === undefined || strategy === false || Predicate.isString(strategy)) {
        throw new TypeError('Missing scatter group focus')
      }

      const runtime = createChartRuntime<typeof Row.Type, Date, number>()

      try {
        const scene = runtime.render(definition, { width: 600, height: 350 })
        const [first] = scene.points
        const second = scene.points.find((point) => point.markId === 'b' && point.datum === data[0])

        if (first === undefined || second === undefined) {
          throw new Error('Missing scatter point')
        }

        expect(
          strategy
            .resolve(scene.points, { x: first.x, y: 100, maxDistance: Number.POSITIVE_INFINITY })
            .map((point) => point.markId),
        ).toEqual(['a', 'b'])
        expect(
          strategy
            .resolve(scene.points, {
              x: second.x,
              y: second.y,
              maxDistance: Number.POSITIVE_INFINITY,
            })
            .map((point) => point.markId),
        ).toEqual(['b', 'a'])
        expect(
          strategy.resolve(scene.points, { x: 39, y: 100, maxDistance: Number.POSITIVE_INFINITY }),
        ).toEqual([])
        expect(
          strategy.resolve(scene.points, {
            x: first.x,
            y: 39,
            maxDistance: Number.POSITIVE_INFINITY,
          }),
        ).toEqual([])
      } finally {
        runtime.destroy()
      }
    }),
)

for (const duration of [1100, 0]) {
  effectIt.effect(`retires the scatter reveal before physical remount (${duration}ms)`, () => {
    const configuration = root.configuration({
      animationDuration: duration,
      children: [Scatter({ dataKey: 'a' })],
    })

    return Story.story(
      subject,
      Story.init('scatter-remount', data, configuration),
      Story.message(Chart.Message.CompletedPrepare()),
      Story.messageWith((model: typeof Chart.Model.Type) =>
        Chart.Message.CompletedReveal({ generation: model.generation }),
      ),
      Story.models(
        Story.steps(
          Story.message(Chart.Message.Unmounted()),
          Story.message(Chart.Message.CompletedPrepare()),
          Story.messageWith((model: typeof Chart.Model.Type) =>
            Chart.Message.CompletedReveal({ generation: model.generation - 1 }),
          ),
        ),
        (before, model) => {
          expect(model.isMounted).toBe(true)
          expect(model.generation).toBe(before.generation + 1)
          expect(model.revealReady).toBe(duration === 0)
          expect(model.phaseClockReady).toBe(false)
          expect(model.data).toEqual(data)
        },
      ),
      Story.Command.expectNone(),
    )
  })
}

effectIt.effect(
  'publishes precise gradient paint once and shares unscaled paint with active copies',
  () =>
    Story.withBlock(subject, (chart) => {
      const initial = chart.init('scatter-contract', data, root.configuration(props)).model

      const armed = chart.update(
        initial,
        chart.Message.ObservedPhaseTiming({
          generation: initial.generation,
          elapsed: null,
          at: 1000,
        }),
      ).model

      const runtime = createChartRuntime<typeof Row.Type, Date, number>()

      try {
        const gradientInputs = root.inputs('scatter-contract', {
          ...props,
          children: [
            Scatter({
              dataKey: 'a',
              strokeWidth: 0,
              showActiveHighlight: false,
              yGradient: { from: 'black', to: 'green' },
            }),
            ChartTooltip(),
          ],
        })

        let painted: CartesianSnapshot<typeof Row.Type> | undefined
        let publications = 0

        const gradientDefinition = gradientInputs.resourceDefinition?.(
          data,
          armed,
          (snapshot) => {
            painted = snapshot
            publications += 1
          },
          () => 1000,
        )

        if (gradientDefinition === undefined) {
          throw new Error('Missing gradient drawing definition')
        }

        const gradientScene = runtime.render(gradientDefinition, { width: 600, height: 350 })
        const [gradient] = painted?.scatterPaint?.gradients ?? []
        expect(publications).toBe(1)
        expect(gradient).toMatchObject({ from: 'black', to: 'green', y1: 35.5 })
        const fill = `url(#${gradient?.id})`
        expect(
          flatten(gradientScene.nodes)
            .filter((node) => node.kind === 'dot')
            .map((node) => node.style?.fill),
        ).toEqual([fill, fill])

        if (painted === undefined) {
          throw new Error('Scatter must publish its actual paint snapshot')
        }

        const copyPlan = painted.overlayModel?.dots[0]?.shapes
        const copy = Predicate.isFunction(copyPlan) ? copyPlan(overlayPlotOf(painted)) : copyPlan
        expect(copy?.[0]).toMatchObject({ fill, r: 5 })
        expect(painted.scatterPaint?.css).toContain(
          '--bkm-scatter-transform:translate(14.828897338403042px,31.818181818181827px)',
        )
        expect(gradientScene.points.map((point) => data.indexOf(point.datum))).toEqual([0, 2])

        for (const radius of [0, -1]) {
          let emptySnapshot: CartesianSnapshot<typeof Row.Type> | undefined

          const emptyPaint = root
            .inputs('scatter-contract', {
              ...props,
              children: [Scatter({ dataKey: 'a', radius, strokeWidth: 0, yGradient: true })],
            })
            .resourceDefinition?.(
              data,
              armed,
              (snapshot) => {
                emptySnapshot = snapshot
              },
              () => 1000,
            )

          if (emptyPaint === undefined) {
            throw new Error('Scatter must retain its empty paint projection')
          }

          const hidden = runtime.render(emptyPaint, { width: 600, height: 350 })
          expect(
            flatten(hidden.nodes).every((node) => node.kind !== 'dot' || node.radius === 0),
          ).toBe(true)
          const emptyProjection = emptySnapshot?.scatterPaint
          expect(emptyProjection).toMatchObject({ gradients: [] })
          expect(emptyProjection?.css).not.toMatch(/NaN|Infinity/u)
        }
      } finally {
        runtime.destroy()
      }
    }),
)
