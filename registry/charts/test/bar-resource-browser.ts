import { Block, Story } from 'foldkit'
import { Effect, Schema } from 'effect'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { BarChart } from '../src/index'
import { nativeObservations } from '../src/cartesian/native-resource'
import type { BarDatum } from '../src/bar/model'
import type { BarValue } from '../src/bar/definition'

const Row = Schema.Struct({})

const root = BarChart({ name: 'bar-resource-regression', Row })

export const BarResourceKey = Symbol('BarResource')

const ChartBlock = Block.make(root.namespace, { key: BarResourceKey, ...root.contract })

const subject = { block: ChartBlock, layer: ChartBlock.makeLayer(root.plans(ChartBlock)) }

const expect = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message)
  }
}

export const runBarResourceBrowserRegression = () =>
  Story.withBlock(subject, (chart) =>
    Effect.scoped(
      Effect.gen(function* barResourceBrowserRegression() {
        const data: ReadonlyArray<typeof Row.Type> = []

        let props: Parameters<typeof root.inputs>[1] = {
          children: [],
          status: 'loading',
          aspectRatio: '2 / 1',
          style: { opacity: 1 },
        }

        let model: typeof chart.Model.Type = chart.init(
          'bar-resource-regression',
          data,
          root.configuration(props),
        ).model

        let mounted = 0

        let timing = 0

        const element = yield* Effect.acquireRelease(
          Effect.sync(() => {
            const host = document.createElement('div')

            document.body.append(host)

            return host
          }),
          (host) =>
            Effect.sync(() => {
              host.remove()
            }),
        )

        const inputs = root.inputs('bar-resource-regression', props)

        if (inputs.createResource === undefined || inputs.configureResource === undefined) {
          throw new Error('Native bar root requires paired creation and configuration')
        }

        const { createResource } = inputs

        const resource = yield* Effect.acquireRelease(
          Effect.sync(() =>
            createResource(
              element,
              {
                ...nativeObservations(element),
                sweep: (event) => {
                  if (event.kind === 'mounted') {
                    mounted += 1
                  }

                  model = chart.update(model, chart.Message.ObservedSweepCycle(event)).model
                },
                timing: (generation, elapsed, at) => {
                  timing += 1
                  model = chart.update(
                    model,
                    chart.Message.ObservedPhaseTiming({
                      generation,
                      elapsed,
                      at,
                    }),
                  ).model
                },
              },
              () => performance.now(),
            ),
          ),
          (owned) =>
            Effect.sync(() => {
              owned.destroy()
            }),
        )

        const runtime = yield* Effect.acquireRelease(
          Effect.sync(() => createChartRuntime<BarDatum<typeof Row.Type>, BarValue, BarValue>()),
          (owned) =>
            Effect.sync(() => {
              owned.destroy()
            }),
        )

        const draw = Effect.fn('BarResource.draw')(function* drawFrame() {
          const next = root.inputs('bar-resource-regression', props)

          if (next.configureResource === undefined || next.resourceDefinition === undefined) {
            throw new Error('Bar presentation lost its owned resource contract')
          }

          expect(
            next.configureResource(resource),
            'Equivalent bar inputs must retain the owned resource',
          )
          resource.prepare?.(model, model.data)
          runtime.render(
            next.resourceDefinition(
              model.data,
              model,
              (snapshot) => {
                resource.draw(snapshot)
              },
              () => performance.now(),
            ),
            { width: 320, height: 160 },
          )
          resource.update(model, model.data, null)
          yield* Effect.callback((resume) => {
            queueMicrotask(() => {
              resume(Effect.void)
            })
          })
        })

        yield* draw()

        const sweep = element.querySelector('svg')

        expect(sweep !== null, 'Loading bar creates its actual sweep SVG')
        expect(
          mounted === 1 && timing === 1,
          'Initial resource publishes one mount and one phase clock',
        )
        yield* draw()
        yield* draw()
        yield* draw()
        expect(
          element.querySelector('svg') === sweep,
          'Reconfiguration preserves the live sweep SVG',
        )
        expect(
          mounted === 1 && timing === 1,
          'Unchanged presentations do not restart mount or phase clock',
        )

        props = { ...props, style: { opacity: 0.5 } }
        yield* draw()
        expect(element.style.opacity === '0.5', 'Changed bar options update the retained resource')
        expect(
          element.querySelector('svg') === sweep && mounted === 1,
          'Changed options preserve sweep ownership',
        )

        const before = model

        model = chart.update(
          model,
          chart.Message.ObservedSweepCycle({
            kind: 'mounted',
            seriesId: 'bar-skeleton',
            generation: model.generation,
          }),
        ).model
        expect(model === before, 'Duplicate mounted observation is an identity no-op')

        model = chart.inMessageUpdate(
          model,
          ChartBlock.InMessage.RequestedConfigure({
            configuration: { ...root.configuration(props), status: 'ready' },
          }),
        ).model
        yield* draw()
        expect(
          element.dataset.bkmStatus === undefined,
          'Real ready transition still updates bar presentation',
        )
        expect(sweep?.style.display === 'none', 'Ready transition hides the same loading SVG')

        return { mounted, timing, retained: element.querySelector('svg') === sweep }
      }),
    ),
  )
