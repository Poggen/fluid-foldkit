import { it } from '@effect/vitest'
// @vitest-environment happy-dom -- mounted Brush owner and its actual responsive strip resource
import { DateTime, Effect, Layer, Option, Schedule, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { expect } from 'vitest'
import { Area, ChartBrush } from '../src/index'
import { fontAdmissionEnvironment } from './font-admission-environment'

const eventually = (check: () => void) =>
  Effect.try(check).pipe(Effect.retry({ times: 50, schedule: Schedule.spaced('20 millis') }))

const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })

const dates = [0, 1, 2].map((day) => DateTime.toDateUtc(DateTime.makeUnsafe(day * 86_400_000)))

const rows = dates.map((date, index) => ({ date, value: (index + 1) * 10 }))

const recipe = ChartBrush({ name: 'viewport-brush-owner', Row })

const BrushKey = Symbol('ViewportBrush')

const Brush = Block.make(recipe.namespace, { key: BrushKey, ...recipe.contract })

const ParentKey = Symbol('ViewportBrushParent')

const Message = defineMessageUnion({ Select: {} })

const Parent = Block.make('ViewportBrushParent', {
  key: ParentKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ brush: Brush.Model }),
  Message,
  view: { kind: 'Element' },
})

const plotProps = { height: 80, animationDuration: 0, children: [Area({ dataKey: 'value' })] }

const brushProps = {
  initialSelection: {
    start: DateTime.toDateUtc(DateTime.makeUnsafe(0)),
    end: DateTime.toDateUtc(DateTime.makeUnsafe(86_400_000)),
  },
}

const owner = recipe.configuration({ enabled: true }, plotProps, brushProps)

const inputs = recipe.inputs(recipe.plot('brush-strip', plotProps, brushProps))

const binding = Parent.makeRequiredFieldBinding(Brush, {
  field: 'brush',
  init: { contextToArgs: () => ['brush', rows, owner] },
}).withOutMessagePolicy({
  fold: Parent.makeOutMessageFold(Brush, {
    SelectionObserved: Parent.makeNoopStep,
    ViewportChanged: Parent.makeNoopStep,
  }),
})

const composition = Parent.makeComposition({ bindings: [binding] })

const layer = Parent.makeLayer({
  init: composition.makeInit(() => ({ model: {} })),
  update: composition.makeUpdate({
    Select: binding.requestSelection({
      range: Option.some({ start: 86_400_000, end: 172_800_000 }),
    }),
  }),
  view: composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.button([h.DataAttribute('select', ''), h.OnClick(Message.Select())], ['Select']),
        h.output(
          [h.DataAttribute('selection', '')],
          [
            Option.match(model.brush.brushSelection, {
              onNone: () => '',
              onSome: (range) => `${range.start}:${range.end}`,
            }),
          ],
        ),
        h.block(binding.embedView({ slotId: 'brush', model: model.brush, viewInputs: inputs })),
      ],
    ),
  ),
}).pipe(Layer.provide(Brush.makeLayer(recipe.plans(Brush))))

it.live(
  'Brush without renderContext keeps track and handle geometry current through native resize and controlled selection',
  () =>
    Effect.gen(function* brushNativeResize() {
      const environment = fontAdmissionEnvironment()
      const mount = document.createElement('div')
      mount.id = 'viewport-brush'
      environment.container.append(mount)
      const runtime = Runtime.embed(Program.makeElement({ block: Parent, layer, container: mount }))

      const handles = () => [
        ...environment.container.querySelectorAll<HTMLElement>('[data-chart-brush-handle-pill]'),
      ]

      const resize = (width: number) => {
        const observer = environment.observers.find(
          (item) => item.target?.classList.contains('ts-chart-host') === true,
        )

        if (observer === undefined) {
          throw new Error('Missing Brush native ResizeObserver')
        }

        observer.deliver(width, 80)
        environment.flush()
      }

      try {
        yield* eventually(() => {
          environment.flush()
          expect(handles()).toHaveLength(2)
        })
        resize(400)
        yield* eventually(() => {
          environment.flush()
          expect(handles()[1]?.style.getPropertyValue('--bkm-brush-pill-left')).toBe('200px')
        })
        const svg = environment.container.querySelector('svg.ts-chart')
        resize(600)
        yield* eventually(() => {
          environment.flush()
          expect(handles()[1]?.style.getPropertyValue('--bkm-brush-pill-left')).toBe('300px')
        })
        expect(environment.container.querySelector('svg.ts-chart')).toBe(svg)
        expect(svg?.getAttribute('viewBox')).toContain('600')

        const pane = environment.container.querySelector<HTMLElement>(
          '.bkm-brush-track-overlay-pane',
        )

        expect(pane?.style.getPropertyValue('--bkm-brush-pane-width')).toBe('258px')
        environment.container.querySelector<HTMLButtonElement>('[data-select]')?.click()
        yield* eventually(() => {
          environment.flush()
          expect(environment.container.querySelector('[data-selection]')?.textContent).toBe(
            '86400000:172800000',
          )
        })
        expect(handles()[0]?.style.getPropertyValue('--bkm-brush-pill-left')).toBe('38px')
        expect(handles()[1]?.style.getPropertyValue('--bkm-brush-pill-left')).toBe('300px')
      } finally {
        yield* Effect.promise(runtime.dispose)
        environment.destroy()
      }
    }),
)
