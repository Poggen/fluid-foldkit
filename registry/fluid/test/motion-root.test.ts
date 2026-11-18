// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import type { Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { expect, vi } from 'vitest'
import { createMotionScope } from '../src/motion.js'

const key = Symbol('MotionRootSnapshot')
const Message = defineMessageUnion({ ToggledSize: {}, ChangedUnrelated: {} })
const effects = Block.makeEffectsContract()
const Root = Block.make('MotionRootSnapshot', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ compact: Schema.Boolean, unrelated: Schema.Natural }),
  Message,
  view: { kind: 'Element' },
  effects,
})
const composition = Root.makeComposition()
const init = composition.makeInit(() => ({ model: { compact: false, unrelated: 0 } }))
const update = composition.makeUpdate({
  ToggledSize: (model) => ({ model: { ...model, compact: !model.compact } }),
  ChangedUnrelated: (model) => ({ model: { ...model, unrelated: model.unrelated + 1 } }),
})

interface BoundsRead {
  readonly index: number
  readonly compact: boolean
  readonly left: number
  readonly width: number
}

function subject() {
  const motion = createMotionScope('root-snapshot')
  const events: string[] = []
  const reads: BoundsRead[] = []
  const elements: Element[] = []
  const mounted = Promise.withResolvers<void>()
  const children = [
    { index: 0, key: {} },
    { index: 1, key: {} },
  ]
  const withPreviousHooks: (vnode: Html) => Html = (vnode: Html) => {
    if (vnode === null) throw new Error('Expected the snapshot root')
    return {
      ...vnode,
      data: {
        ...vnode.data,
        hook: {
          ...vnode.data?.hook,
          insert: () => events.push('previous-insert'),
          prepatch: () => events.push('previous-prepatch'),
          postpatch: () => events.push('previous-postpatch'),
          destroy: () => events.push('previous-destroy'),
        },
      },
    }
  }
  const view = composition.makeView((model, h) =>
    motion.root(
      withPreviousHooks(
        h.div(
          [h.Id('snapshot-root'), h.DataAttribute('compact', String(model.compact))],
          [
            h.button([h.Id('toggle-size'), h.OnClick(Message.ToggledSize())], ['Size']),
            h.button(
              [h.Id('unrelated'), h.OnClick(Message.ChangedUnrelated())],
              [String(model.unrelated)],
            ),
            ...children.map(({ index, key: resourceKey }) =>
              motion.node(h.div([h.Id(`snapshot-child-${index}`)], ['Child']), {
                layout: true,
                layoutDependency: model.compact,
                initial: false,
                animate: {},
                transition: { duration: 0.5 },
                resource: {
                  key: resourceKey,
                  mount(visual) {
                    const element = visual.current
                    if (!(element instanceof HTMLElement)) throw new Error('Missing child')
                    elements.push(element)
                    if (elements.length === children.length) mounted.resolve()
                    Object.defineProperty(element, 'getBoundingClientRect', {
                      configurable: true,
                      value: () => {
                        const compact = element.parentElement?.dataset.compact === 'true'
                        const width = compact ? 80 : 120
                        const left = index * (width + 10)
                        events.push(`read-${index}-${compact}`)
                        reads.push({ index, compact, left, width })
                        return new DOMRect(left, 0, width, compact ? 28 : 40)
                      },
                    })
                    return () => events.push(`release-${index}`)
                  },
                },
              }),
            ),
          ],
        ),
      ),
      model.compact,
    ),
  )
  return {
    layer: Root.makeLayer({ init, update, view, EffectsLayer: Layer.empty }).pipe(
      Layer.provide(motion.layer),
    ),
    events,
    reads,
    elements,
    mounted: mounted.promise,
  }
}

const click = (host: HTMLElement, id: string) => {
  const button = host.querySelector(`#${id}`)
  if (button === null) throw new Error(`Missing ${id}`)
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

it.live('root snapshots precede ancestor mutations and preserve geometry through reversal', () =>
  Effect.gen(function* () {
    const fixture = subject()
    const host = document.createElement('div')
    document.body.append(host)
    const container = document.createElement('div')
    container.id = 'motion-root-test'
    host.append(container)
    const app = Runtime.embed(Program.makeElement({ block: Root, layer: fixture.layer, container }))
    try {
      yield* Effect.promise(() => fixture.mounted)
      expect(fixture.elements).toHaveLength(2)
      expect(fixture.events).toContain('previous-insert')
      const original = [...fixture.elements]

      for (const compact of [true, false]) {
        fixture.events.length = 0
        fixture.reads.length = 0
        click(host, 'toggle-size')
        yield* Effect.promise(() =>
          vi.waitFor(() => {
            for (const index of [0, 1]) {
              expect(
                fixture.reads.some((read) => read.index === index && read.compact === compact),
              ).toBe(true)
            }
          }),
        )
        for (const index of [0, 1]) {
          const reads = fixture.reads.filter((read) => read.index === index)
          expect(reads[0]).toEqual({
            index,
            compact: !compact,
            left: index * (compact ? 130 : 90),
            width: compact ? 120 : 80,
          })
          expect(reads.at(-1)).toEqual({
            index,
            compact,
            left: index * (compact ? 90 : 130),
            width: compact ? 80 : 120,
          })
          expect(fixture.events.indexOf(`read-${index}-${!compact}`)).toBeLessThan(
            fixture.events.indexOf('previous-prepatch'),
          )
          expect(host.querySelector(`#snapshot-child-${index}`)).toBe(original[index])
        }
        expect(fixture.events).toContain('previous-postpatch')
      }

      fixture.reads.length = 0
      click(host, 'unrelated')
      yield* Effect.promise(() =>
        vi.waitFor(() => expect(host.querySelector('#unrelated')?.textContent).toBe('1')),
      )
      expect(fixture.reads).toHaveLength(0)
      expect(fixture.elements).toEqual(original)
    } finally {
      yield* Effect.promise(() => app.dispose())
      host.remove()
    }
    expect(fixture.events).toContain('previous-destroy')
    expect(fixture.events).toContain('release-0')
    expect(fixture.events).toContain('release-1')
  }),
)
