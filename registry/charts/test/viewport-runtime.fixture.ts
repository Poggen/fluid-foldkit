import { DateTime, Effect, Layer, Predicate, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Area, AreaChart, Line, LineChart } from '../src/index'
import type { CartesianViewInputs } from '../src/cartesian/block'
import type { ChartContainerRef, ChartContextRenderer } from '../src/cartesian/chart-context'
import { fontAdmissionEnvironment } from './font-admission-environment'

const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })

const rows = [10, 20, 15].map((value, index) => ({
  date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 86_400_000)),
  value,
}))

export const viewportFixture = (
  name: string,
  family: 'line' | 'area',
  mode: 'native' | 'authored' | 'derived' = 'native',
  shared?: {
    readonly environment: ReturnType<typeof fontAdmissionEnvironment>
    readonly inputs: Readonly<
      Record<'native' | 'authored' | 'derived', CartesianViewInputs<typeof Row.Type>>
    >
  },
) => {
  const environment = shared?.environment ?? fontAdmissionEnvironment()
  const host = document.createElement('section')
  host.className = 'viewport-test-host'
  environment.container.append(host)
  const recipe = (family === 'line' ? LineChart : AreaChart)({ name, Row })
  const ChartKey = Symbol(name)
  const Chart = Block.make(recipe.namespace, { key: ChartKey, ...recipe.contract })
  const ParentKey = Symbol(`${name}-parent`)

  const Message = defineMessageUnion({
    Mode: { mode: Schema.Literals(['native', 'authored', 'derived']) },
    Data: {},
  })

  const Parent = Block.make('ViewportParent', {
    key: ParentKey,
    InitArgs: Schema.Tuple([]),
    Model: Schema.Struct({
      chart: Chart.Model,
      mode: Schema.Literals(['native', 'authored', 'derived']),
    }),
    Message,
    view: { kind: 'Element' },
  })

  const contexts: Array<HTMLDivElement> = []
  const contextRefs: Array<Readonly<ChartContainerRef>> = []

  const renderer: ChartContextRenderer<typeof Row.Type> = (context, h) => {
    contextRefs.push(context.stable.containerRef)

    if (context.stable.containerRef.current !== null) {
      contexts.push(context.stable.containerRef.current)
    }

    return h.output([h.DataAttribute('viewport', '')], [String(context.stable.width)])
  }

  const props = {
    height: 240,
    animationDuration: 0,
    children: [(family === 'line' ? Line : Area)({ dataKey: 'value', showMarkers: true })],
  }

  const original = recipe.inputs('plot', props)

  const inputs = shared?.inputs ?? {
    native: original,
    authored: recipe.inputs('plot', { ...props, renderContext: renderer }),
    derived: original.withRenderContext(renderer),
  }

  const binding = Parent.makeRequiredFieldBinding(Chart, {
    field: 'chart',
    init: { contextToArgs: () => ['plot', rows, recipe.configuration(props)] },
  })

  const composition = Parent.makeComposition({ bindings: [binding] })

  const layer = Parent.makeLayer({
    init: composition.makeInit(() => ({ model: { mode } })),
    update: composition.makeUpdate({
      Mode: (model, message) => ({ model: { ...model, mode: message.mode } }),
      Data: binding.requestData({ data: rows.map((row) => ({ ...row, value: row.value * 10 })) }),
    }),
    view: composition.makeView((model, h) =>
      h.div(
        [],
        [
          ...(['native', 'authored', 'derived'] as const).map((nextMode) =>
            h.button(
              [h.DataAttribute('mode', nextMode), h.OnClick(Message.Mode({ mode: nextMode }))],
              [nextMode],
            ),
          ),
          h.button([h.DataAttribute('data', ''), h.OnClick(Message.Data())], ['data']),
          h.block(
            binding.embedView({
              slotId: 'chart',
              model: model.chart,
              viewInputs: inputs[model.mode],
            }),
          ),
        ],
      ),
    ),
  }).pipe(Layer.provide(Chart.makeLayer(recipe.plans(Chart))))

  type Model = typeof Parent.Model.Type

  const updates: Array<Model> = []
  let views = 0
  let publications = 0
  host.addEventListener(
    'domains-observed',
    () => {
      publications += 1
    },
    true,
  )
  const mount = document.createElement('div')
  mount.id = name
  host.append(mount)

  const runtime = Runtime.embed(
    Program.makeElement({
      block: Parent,
      layer,
      container: mount,
      devTools: false,
      slow: {
        show: 'Always',
        measuredPhases: ['Update', 'View'],
        thresholdOverrides: { Update: 0, View: 0 },
        onSlow: (context) => {
          if (Predicate.isTagged(context, 'View')) {
            views += 1
          }

          if (Predicate.isTagged(context, 'Update')) {
            updates.push(context.nextModel)
          }
        },
      },
    }),
  )

  return {
    ...environment,
    contexts,
    contextRefs,
    environment,
    inputs,
    host,
    get model() {
      return updates.at(-1)
    },
    get views() {
      return views
    },
    get publications() {
      return publications
    },
    resize: (width: number) => {
      const surface = host.querySelector('svg.ts-chart')?.parentElement
      const observer = environment.observers.find(
        (item) => surface !== undefined && item.target === surface,
      )

      if (observer === undefined) {
        throw new Error('Missing real chart ResizeObserver')
      }

      observer.deliver(width, 240)
      environment.flush()
    },
    dispose: () =>
      Effect.promise(runtime.dispose).pipe(
        Effect.andThen(
          Effect.sync(() => {
            host.remove()

            if (shared === undefined) {
              environment.destroy()
            }
          }),
        ),
      ),
  }
}
