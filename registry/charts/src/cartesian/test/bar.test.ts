// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { it as effectIt } from '@effect/vitest'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { Effect, Option } from 'effect'
import { Window } from 'happy-dom'
import type { SceneNode } from '@tanstack/charts'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { renderChartSvg } from '@tanstack/charts/svg'
import {
  Bar,
  BarSquares,
  BarColumnTrack,
  BarXAxis,
  BarYAxis,
  YAxis,
  BarDepthProvider,
  BarDepthBack,
  BarDepthFront,
  BarPulse,
  ChartTooltip,
} from '../../index'
import type { BarChartProps } from '../../index'
import type { BarSnapshot } from '../../bar/definition'
import { HoverOverlay } from '../hover-overlay'

import { Row, data, root, Chart, subject } from './bar.fixture'

const flatten: (nodes: ReadonlyArray<SceneNode>) => ReadonlyArray<SceneNode> = (
  nodes: ReadonlyArray<SceneNode>,
) => nodes.flatMap((node) => (node.kind === 'group' ? flatten(node.children) : [node]))

const sceneFor = (
  chart: Story.TestBlock<typeof subject>,
  props: BarChartProps<typeof Row.Type>,
) => {
  const initial = chart.init('bar-contract', data, root.configuration(props)).model

  const model = chart.update(
    initial,
    chart.Message.ObservedPhaseTiming({
      generation: initial.generation,
      elapsed: null,
      at: 0,
    }),
  ).model

  const inputs = root.inputs('bar-contract', props)
  let snapshot: BarSnapshot<typeof Row.Type> | undefined

  const definition = inputs.resourceDefinition?.(
    data,
    model,
    (value) => {
      snapshot = value
    },
    () => 0,
  )

  if (definition === undefined) {
    throw new Error('Missing public Bar root scene')
  }

  const runtime = createChartRuntime<
    Parameters<typeof inputs.sourceOf>[0],
    string | number,
    string | number
  >()

  try {
    const scene = runtime.render(definition, { width: 400, height: 200 })

    return { scene, snapshot, model, inputs }
  } finally {
    runtime.destroy()
  }
}

effectIt.effect(
  'preserves category and series identity through grouped, horizontal and signed stacked public scenes',
  () =>
    Story.withBlock(subject, (chart) =>
      Effect.gen(function* groupedBar() {
        const props: BarChartProps<typeof Row.Type> = {
          xDataKey: 'name',
          animationDuration: 0,
          barGap: 0,
          margin: { left: 0, right: 0, top: 0, bottom: 0 },
          children: [
            Bar({ dataKey: 'a', fill: 'red', lineCap: 'butt' }),
            Bar({ dataKey: 'b', fill: 'blue', lineCap: 'butt' }),
            BarXAxis(),
            BarYAxis(),
          ],
        }

        const grouped = sceneFor(chart, props)

        const rects = flatten(grouped.scene.nodes).filter(
          (node) => node.kind === 'rect' && node.key.startsWith('bars:'),
        )

        expect(rects).toHaveLength(2)
        expect(rects.map((node) => (node.kind === 'rect' ? node.width : 0))).toEqual([98, 98])
        expect(
          grouped.scene.points.every(
            (point, index) => grouped.inputs.sourceOf(point.datum) === data[Math.floor(index / 2)],
          ),
        ).toBe(true)
        expect(grouped.scene.points.map((point) => point.datum.seriesIndex)).toEqual([0, 1, 0, 1])
        expect(grouped.scene.scales.x?.domain).toEqual(['A', 'B'])

        yield* Story.story(
          subject,
          Story.given(grouped.model),
          Story.inMessage(Chart.InMessage.RequestedFocus({ index: 1, seriesIndex: 1 })),
          Story.model((model) => {
            expect(Option.getOrNull(model.focusedSeriesIndex)).toBe(1)
            expect(model.data[1]).toEqual(data[1])
          }),
        )
        const horizontal = sceneFor(chart, { ...props, orientation: 'horizontal' }).scene
        expect(horizontal.scales.y?.domain).toEqual(['A', 'B'])
        expect(
          flatten(horizontal.nodes)
            .filter((node) => node.kind === 'rect' && node.key.startsWith('bars:'))
            .map((node) => (node.kind === 'rect' ? node.height : 0)),
        ).toEqual([48, 48, 48])
        const stacked = sceneFor(chart, { ...props, stacked: true }).scene
        expect(
          flatten(stacked.nodes)
            .filter((node) => node.kind === 'rect' && node.key.startsWith('bars:'))
            .map((node) => (node.kind === 'rect' ? node.width : 0)),
        ).toEqual([200, 200])
        expect(stacked.points.map((point) => point.datum.value)).toEqual([20, 10, -10, 0])
      }),
    ),
)

effectIt.effect(
  'renders quantized squares, tracks and depth surfaces from the source rows after the checked first-paint clock',
  () =>
    Story.withBlock(subject, (chart) => {
      const common = {
        xDataKey: 'name',
        animationDuration: 0,
        barGap: 0.2,
        margin: { left: 0, right: 0, top: 0, bottom: 0 },
      } satisfies Omit<BarChartProps<typeof Row.Type>, 'children'>

      const squares = sceneFor(chart, {
        ...common,
        children: [BarSquares({ dataKey: 'a', squareGap: 3 }), BarColumnTrack()],
      }).scene

      expect(flatten(squares.nodes).filter((node) => node.key.startsWith('squares:'))).toHaveLength(
        1,
      )
      expect(squares.points.every((point) => data.includes(point.datum.source))).toBe(true)
      expect(squares.points.some((point) => point.datum.source === data[1])).toBe(true)

      const depth = sceneFor(chart, {
        ...common,
        children: [
          Bar({ dataKey: 'a' }),
          BarDepthProvider(),
          BarDepthBack({ dataKey: 'a' }),
          BarDepthFront({ dataKey: 'a' }),
          BarPulse({ dataKey: 'a', activeIndex: 0 }),
        ],
      }).scene

      expect(flatten(depth.nodes).filter((node) => node.key.includes(':lid'))).toHaveLength(6)
      expect(depth.gradients).toHaveLength(6)
      expect(depth.points.every((point) => data.includes(point.datum.source))).toBe(true)
    }),
)

effectIt.effect(
  'uses the explicit YAxis carrier for numeric labels without reinterpreting BarYAxis',
  () =>
    Story.withBlock(subject, (chart) => {
      const categoryOnly = sceneFor(chart, { children: [Bar({ dataKey: 'a' }), BarYAxis()] })

      const categoryLabels = flatten(categoryOnly.scene.nodes).filter(
        (node) => node.kind === 'label' && node.key.startsWith('y-tick-label:'),
      )

      expect(categoryLabels).toHaveLength(0)

      const numeric = sceneFor(chart, {
        children: [
          Bar({ dataKey: 'a' }),
          YAxis({ formatValue: (value) => `cost:${value}`, numTicks: 3 }),
        ],
      })

      const numericLabels = flatten(numeric.scene.nodes).filter(
        (node) => node.kind === 'label' && node.key.startsWith('y-tick-label:'),
      )

      expect(numericLabels.length).toBeGreaterThan(0)
      expect(
        numericLabels.every((label) => label.kind === 'label' && label.text.startsWith('cost:')),
      ).toBe(true)
      expect(
        numericLabels.every(
          (label) =>
            label.kind === 'label' && label.anchor === 'end' && label.baseline === 'middle',
        ),
      ).toBe(true)
    }),
)

effectIt.effect('replays the Bar reveal through its public configuration signature', () => {
  const props = { children: [Bar({ dataKey: 'a' })] }
  return Story.story(
    subject,
    Story.init('bar-replay', data, root.configuration(props)),
    Story.messageWith((model: typeof Chart.Model.Type) =>
      Chart.Message.CompletedReveal({ generation: model.generation }),
    ),
    Story.models(
      Story.steps(
        Story.inMessage(
          Chart.InMessage.RequestedConfigure({
            configuration: root.configuration({ ...props, revealSignature: 'second' }),
          }),
        ),
      ),
      (before, after) => {
        expect(after.configuration.revealSignature).toBe('second')
        expect(after.generation).toBeGreaterThan(before.generation)
        expect(after.revealReady).toBe(false)
      },
    ),
  )
})

for (const variant of ['dot', 'ring'] satisfies ReadonlyArray<'dot' | 'ring'>) {
  effectIt.effect(
    `rendered Bar and BarSquares ${variant} markers use stroke while preserving fill`,
    () =>
      Story.withBlock(subject, (owner) => {
        const rendered = sceneFor(owner, {
          animationDuration: 0,
          children: [
            Bar({ dataKey: 'a', fill: 'url(#paint)', stroke: '#ff5500' }),
            BarSquares({ dataKey: 'b', fill: 'blue', stroke: '#00aa88' }),
            ChartTooltip({ dotVariant: variant }),
          ],
        })
        const snapshot = rendered.snapshot

        if (snapshot?.overlay === undefined || snapshot.overlay === null) {
          throw new Error('The public Bar renderer must publish its tooltip overlay')
        }

        expect(
          flatten(rendered.scene.nodes).find((node) => node.key.startsWith('bars:'))?.style?.fill,
        ).toBe('url(#paint)')
        const overlay = new HoverOverlay<typeof Row.Type>('bar-tooltip-paint', () => 0)

        try {
          const plot = {
            height: snapshot.height,
            innerWidth: snapshot.width - snapshot.margin.left - snapshot.margin.right,
            innerHeight: snapshot.height - snapshot.margin.top - snapshot.margin.bottom,
            xDomain: [0, 1] satisfies readonly [number, number],
            yDomains: { y: snapshot.valueDomain },
          }

          overlay.update(snapshot.overlay, plot, snapshot.margin)
          overlay.focus(0, data[0] ?? null)
          const marks = [
            ...overlay.root.querySelectorAll<SVGElement>('.bkm-hov-dot circle, .bkm-hov-dot rect'),
          ]

          expect(overlay.root.dataset.on).toBe('')
          expect(
            marks.map((mark) =>
              mark.style.getPropertyValue(
                variant === 'ring' ? '--bkm-dot-stroke' : '--bkm-dot-fill',
              ),
            ),
          ).toEqual(['#ff5500', '#00aa88'])

          if (variant === 'ring') {
            const override = sceneFor(owner, {
              children: [
                Bar({ dataKey: 'a', fill: 'blue', stroke: 'red' }),
                ChartTooltip({ dotVariant: 'ring', dotColor: '#123456' }),
              ],
            }).snapshot?.overlay

            if (override === undefined || override === null)
              throw new Error('Missing override overlay')
            overlay.update(override, plot, snapshot.margin)
            expect(
              overlay.root
                .querySelector<SVGElement>('.bkm-hov-dot rect')
                ?.style.getPropertyValue('--bkm-dot-stroke'),
            ).toBe('#123456')
          }
        } finally {
          overlay.destroy()
        }
      }),
  )
}

effectIt.effect(
  'disabled square entrances paint immediately across clock updates and owner remounts',
  () =>
    Effect.gen(function* () {
      const props: BarChartProps<typeof Row.Type> = {
        animationDuration: 1100,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        children: [
          BarSquares({ dataKey: 'a', fill: 'red', animate: false }),
          BarSquares({ dataKey: 'b', fill: 'blue', animate: true }),
        ],
      }
      const inputs = root.inputs('static-square-entrance', props)
      const runtime = createChartRuntime<
        Parameters<typeof inputs.sourceOf>[0],
        string | number,
        string | number
      >()
      const paint = (model: typeof Chart.Model.Type) => {
        const definition = inputs.resourceDefinition?.(
          model.data,
          model,
          () => {},
          () => 0,
        )

        if (definition === undefined)
          throw new Error('Bar must provide its real drawing definition')
        const browser = new Window()
        browser.document.body.innerHTML = renderChartSvg(
          runtime.render(definition, { width: 400, height: 400 }),
          { ariaLabel: 'Static and animated squares' },
        )
        const geometry = (fill: string) =>
          [...browser.document.querySelectorAll(`rect[fill="${fill}"]`)].map((rect) =>
            ['y', 'width', 'height'].map((name) => Number(rect.getAttribute(name))),
          )

        return { disabled: geometry('red'), enabled: geometry('blue') }
      }

      try {
        yield* Story.story(
          subject,
          Story.init('static-square-entrance', data, root.configuration(props)),
          Story.model((model) => {
            const first = paint(model)
            expect(first.disabled.length).toBeGreaterThan(0)
            expect(first.enabled.length).toBeGreaterThan(0)
            expect(
              first.disabled.every(
                ([, width, height]) => width !== undefined && width > 0 && height === width,
              ),
            ).toBe(true)
            expect(first.enabled.every(([, , height]) => height === 0)).toBe(true)
          }),
          Story.models(
            Story.steps(
              Story.models(
                Story.steps(
                  Story.messageWith((model: typeof Chart.Model.Type) =>
                    Chart.Message.ObservedPhaseTiming({
                      generation: model.generation,
                      elapsed: null,
                      at: 0,
                    }),
                  ),
                ),
                (before: typeof Chart.Model.Type, after: typeof Chart.Model.Type) => {
                  expect(paint(after).disabled).toEqual(paint(before).disabled)
                  expect(paint(after).enabled.every(([, width, height]) => height === width)).toBe(
                    true,
                  )
                },
              ),
              Story.message(Chart.Message.CompletedPrepare()),
              Story.messageWith((model: typeof Chart.Model.Type) =>
                Chart.Message.CompletedReveal({ generation: model.generation }),
              ),
              Story.message(Chart.Message.Unmounted()),
              Story.message(Chart.Message.CompletedPrepare()),
            ),
            (before: typeof Chart.Model.Type, after: typeof Chart.Model.Type) =>
              expect(paint(after)).toEqual(paint(before)),
          ),
        )
      } finally {
        runtime.destroy()
      }
    }),
)
