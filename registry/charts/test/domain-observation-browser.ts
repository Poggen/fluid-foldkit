import { Block, Story } from 'foldkit'
import { DateTime, Effect, Schema } from 'effect'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { Line, LineChart } from '../src/index'
import { buildTimeSeriesDefinition } from '../src/cartesian/definition'
import { mountTimeSeriesResource } from '../src/cartesian/time-series-resource'
import { nativeObservations } from '../src/cartesian/native-resource'

const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })

const root = LineChart({ name: 'domain-resource-regression', Row })

export const DomainResourceKey = Symbol('DomainResource')

const ChartBlock = Block.make(root.namespace, { key: DomainResourceKey, ...root.contract })

const subject = { block: ChartBlock, layer: ChartBlock.makeLayer(root.plans(ChartBlock)) }

const expect = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message)
  }
}

export const runDomainObservationBrowserRegression = () =>
  Story.withBlock(subject, (chart) =>
    Effect.scoped(
      Effect.gen(function* domainObservationBrowserRegression() {
        let data = [1, 2, 3].map((value, index) =>
          Row.make({
            date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 86_400_000)),
            value,
          }),
        )

        let model: typeof chart.Model.Type = chart.init('domain-resource-regression', data).model

        let delivered = 0

        const element = yield* Effect.acquireRelease(
          Effect.sync(() => {
            const hostElement = document.createElement('div')

            document.body.append(hostElement)

            return hostElement
          }),
          (hostElement) =>
            Effect.sync(() => {
              hostElement.remove()
            }),
        )

        const props = { animationDuration: 0, children: [Line({ dataKey: 'value' })] }

        const resource = yield* Effect.acquireRelease(
          Effect.sync(() =>
            mountTimeSeriesResource<typeof Row.Type>(
              { drawingHost: element, visualRoot: undefined },
              {
                ...nativeObservations(element),
                domains: (current, target, viewport) => {
                  delivered += 1
                  model = chart.update(
                    model,
                    chart.Message.ObservedDomains(
                      viewport === undefined ? { current, target } : { current, target, viewport },
                    ),
                  ).model
                },
              },
              props,
              'domain-resource-regression',
              () => performance.now(),
              { modelViewport: 'RenderContext' },
            ),
          ),
          (ownedResource) =>
            Effect.sync(() => {
              ownedResource.destroy()
            }),
        )

        const runtime = yield* Effect.acquireRelease(
          Effect.sync(() => createChartRuntime<typeof Row.Type, Date, number>()),
          (ownedRuntime) =>
            Effect.sync(() => {
              ownedRuntime.destroy()
            }),
        )

        const draw = Effect.fn('DomainObservation.draw')(function* drawFrame(width: number) {
          resource.prepare?.(model, data)
          runtime.render(
            buildTimeSeriesDefinition(data, {
              id: 'domain-resource-regression',
              x: (row) => row.date,
              children: props.children,
              onBuilt: (snapshot) => {
                resource.draw(snapshot)
              },
            }),
            { width, height: 180 },
          )
          yield* Effect.callback((resume) => {
            queueMicrotask(() => {
              resume(Effect.void)
            })
          })
        })

        const reconfigureAndDraw = Effect.fn('DomainObservation.reconfigureAndDraw')(
          function* reconfigureFrame() {
            resource.configure?.({ ...props, children: [...props.children] })
            yield* draw(320)
          },
        )

        yield* draw(320)
        expect(delivered === 1, 'Initial real draw must publish its measurements')

        const initial = model

        yield* reconfigureAndDraw()
        yield* reconfigureAndDraw()
        yield* reconfigureAndDraw()
        expect(delivered === 1 && model === initial, 'Equal reconfiguration must settle')

        data = data.map((row) => ({ ...row }))
        model = chart.inMessageUpdate(model, ChartBlock.InMessage.RequestedData({ data })).model
        expect(model.updateStep === 'snap', 'Data change must require a snap acknowledgement')
        resource.configure?.({ ...props })
        yield* draw(320)
        expect(
          delivered === 2 && model.updateStep === 'none',
          'Equal real draw must acknowledge snap',
        )
        yield* draw(320)
        expect(delivered === 2, 'Acknowledged snap must not continue publishing')

        data = data.map((row) => ({ ...row, value: row.value * 10 }))
        model = chart.inMessageUpdate(model, ChartBlock.InMessage.RequestedData({ data })).model
        resource.configure?.({ ...props, width: 480 })
        yield* draw(480)
        expect(delivered === 3, 'Changed data and viewport must publish')
        expect(
          element.style.getPropertyValue('--bkm-native-width') === '480px',
          'Changed resource options must apply',
        )
        yield* draw(480)
        expect(delivered === 3, 'Changed measurements must settle after acknowledgement')

        return { passed: 3, delivered, updateStep: model.updateStep }
      }),
    ),
  )
