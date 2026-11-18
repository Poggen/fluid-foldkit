// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { expect, vi } from 'vitest'
import { createMotionScope } from '../src/motion.js'

const Mode = Schema.Literals(['both', 'position', 'absent'])
const Message = defineMessageUnion({ Configure: { mode: Mode }, Refresh: {} })
const key = Symbol('ProjectionAttributes')
const effects = Block.makeEffectsContract()
const Root = Block.make('ProjectionAttributes', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ mode: Mode, revision: Schema.Natural }),
  Message,
  view: { kind: 'Element' },
  effects,
})
const composition = Root.makeComposition()
const init = composition.makeInit(() => ({ model: { mode: 'both', revision: 0 } }))
const update = composition.makeUpdate({
  Configure: (model, message) => ({
    model: { mode: message.mode, revision: model.revision + 1 },
  }),
  Refresh: (model) => ({ model: { ...model, revision: model.revision + 1 } }),
})

function subject() {
  const motion = createMotionScope('projection-attributes')
  const view = composition.makeView((model, h) =>
    h.div(
      [],
      [
        ...(['both', 'position', 'absent'] as const).map((mode) =>
          h.button([h.Id(mode), h.OnClick(Message.Configure({ mode }))], [mode]),
        ),
        h.button([h.Id('refresh'), h.OnClick(Message.Refresh())], ['Refresh']),
        h.span([h.Id('revision')], [String(model.revision)]),
        motion.node(h.div([h.Id('projected')], ['Retained']), {
          layout: model.mode === 'both' ? true : model.mode === 'position' ? 'position' : false,
          ...(model.mode === 'absent' ? {} : { layoutId: model.mode }),
          layoutDependency: model.mode,
          initial: false,
          animate: {},
          transition: { duration: 0 },
        }),
      ],
    ),
  )
  return Root.makeLayer({ init, update, view, EffectsLayer: Layer.empty }).pipe(
    Layer.provide(motion.layer),
  )
}

it.live(
  'preserves layout attributes without repeat mutations and applies changes on the same node',
  () =>
    Effect.gen(function* () {
      const host = document.createElement('div')
      const container = document.createElement('div')
      container.id = 'projection-attributes-test'
      host.append(container)
      document.body.append(host)
      const app = Runtime.embed(Program.makeElement({ block: Root, layer: subject(), container }))
      const records: MutationRecord[] = []
      const observer = new MutationObserver((changes) => records.push(...changes))
      const takeChanges = () => [...records.splice(0), ...observer.takeRecords()]
      let revision = 0
      let disposed = false
      const click = (id: string) =>
        Effect.gen(function* () {
          const button = host.querySelector<HTMLButtonElement>(`#${id}`)
          if (button === null) throw new Error(`Missing ${id}`)
          button.click()
          revision += 1
          yield* Effect.promise(() =>
            vi.waitFor(() =>
              expect(host.querySelector('#revision')?.textContent).toBe(String(revision)),
            ),
          )
        })

      try {
        yield* Effect.promise(() =>
          vi.waitFor(() =>
            expect(host.querySelector('#projected')?.getAttribute('data-layout-id')).toBe(
              'projection-attributes:both',
            ),
          ),
        )
        const element = host.querySelector<HTMLElement>('#projected')
        if (element === null) throw new Error('Missing projection node')
        observer.observe(element, {
          attributes: true,
          attributeFilter: ['data-layout', 'data-layout-id'],
        })

        for (const [mode, layout, layoutId] of [
          ['both', 'true', 'projection-attributes:both'],
          ['position', 'position', 'projection-attributes:position'],
          ['absent', null, null],
          ['both', 'true', 'projection-attributes:both'],
        ] as const) {
          if (revision > 0) {
            yield* click(mode)
            expect(takeChanges().map((change) => change.attributeName)).toEqual(
              expect.arrayContaining(['data-layout', 'data-layout-id']),
            )
          }
          expect(host.querySelector('#projected')).toBe(element)
          expect(element.getAttribute('data-layout')).toBe(layout)
          expect(element.getAttribute('data-layout-id')).toBe(layoutId)
          yield* click('refresh')
          expect(takeChanges()).toHaveLength(0)
        }

        element.dataset.layout = 'size'
        element.dataset.layoutId = 'external'
        takeChanges()
        yield* click('refresh')
        expect(element.dataset.layout).toBe('true')
        expect(element.dataset.layoutId).toBe('projection-attributes:both')
        expect(takeChanges().map((change) => change.attributeName)).toEqual(
          expect.arrayContaining(['data-layout', 'data-layout-id']),
        )

        yield* Effect.promise(() => app.dispose())
        disposed = true
        expect(element.hasAttribute('data-layout')).toBe(false)
        expect(element.hasAttribute('data-layout-id')).toBe(false)
        expect(takeChanges().map((change) => change.attributeName)).toEqual(
          expect.arrayContaining(['data-layout', 'data-layout-id']),
        )
      } finally {
        observer.disconnect()
        if (!disposed) yield* Effect.promise(() => app.dispose())
        host.remove()
      }
    }),
)
