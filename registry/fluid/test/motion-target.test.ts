// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { it as effectIt } from '@effect/vitest'
import { Data, Effect, Layer, Option, Schema, Schedule } from 'effect'
import { Block, Program, Runtime, Scene } from 'foldkit'
import type { Attribute } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { expect, expectTypeOf, it, vi } from 'vitest'
import { animateSingleValue, cancelFrame, frame, motionValue } from 'motion-dom'
import { createTargetMotionScope, EXIT_COMPLETE_EVENT } from '../src/motion-target.js'
import type { TargetMotionOptions } from '../src/motion-target.js'

const TargetMotionLifetimeKey = Symbol('TargetMotionLifetime')

const Model = Schema.Struct({
  present: Schema.Boolean,
  visible: Schema.Boolean,
  generation: Schema.Finite,
})

const Message = defineMessageUnion({ Show: {}, Hide: {}, Exited: { generation: Schema.Finite } })

const Events =
  Data.taggedEnum<Extract<Attribute<typeof Message.Type>, { readonly _tag: 'OnCustomEvent' }>>()

const effects = Block.makeEffectsContract()

const Root = Block.make('TargetMotionLifetime', {
  key: TargetMotionLifetimeKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects,
})

const composition = Root.makeComposition()

const init = composition.makeInit(() => ({
  model: { present: true, visible: true, generation: 0 },
}))

const update = composition.makeUpdate({
  Show: (model) => ({
    model: { ...model, present: true, visible: true, generation: model.generation + 1 },
  }),
  Hide: (model) => ({ model: { ...model, present: false, generation: model.generation + 1 } }),
  Exited: (model, message) => ({
    model:
      !model.present && message.generation === model.generation
        ? { ...model, visible: false }
        : model,
  }),
})

const subject = () => {
  const motion = createTargetMotionScope('target-lifetime')
  const acquired: Array<Element> = []
  const released: Array<Element> = []
  const completed: Array<Element> = []
  const updated: Array<Element> = []

  const resource = {
    key: {},
    mount(visual: Parameters<NonNullable<TargetMotionOptions['resource']>['mount']>[0]) {
      const element = visual.current

      if (element === null) {
        throw new Error('Motion must mount before its resource')
      }

      acquired.push(element)

      return () => {
        released.push(element)
      }
    },
  }

  const view = composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.button([h.Id('show'), h.OnClick(Message.Show())], ['Show']),
        h.button([h.Id('hide'), h.OnClick(Message.Hide())], ['Hide']),
        ...(model.visible
          ? [
              motion.node(
                h.div(
                  [
                    h.Key('retained'),
                    h.Id('retained'),
                    h.DataAttribute('present', String(model.present)),
                    Events.OnCustomEvent({
                      name: EXIT_COMPLETE_EVENT,
                      f: () => Option.some(Message.Exited({ generation: model.generation })),
                    }),
                  ],
                  ['Retained'],
                ),
                {
                  initial: false,
                  animate: { left: 20 + model.generation },
                  exit: { left: 0 },
                  transition: { duration: 0.15 },
                  present: model.present,
                  resource,
                  onAnimationComplete: (element) => completed.push(element),
                  onUpdate: (_values, element) => updated.push(element),
                },
              ),
            ]
          : []),
      ],
    ),
  )

  const layer = Root.makeLayer({ init, update, view }).pipe(Layer.provide(motion.layer))

  return { block: Root, layer, acquired, released, completed, updated }
}

const click = (container: ParentNode, id: string) => {
  const element = container.querySelector(`#${id}`)

  if (element === null) {
    throw new Error(`Missing ${id}`)
  }

  element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

const waitFor = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 20, schedule: Schedule.spaced('50 millis') }))

it('rejects layout and drag capabilities on the target contract', () => {
  expectTypeOf<{ animate: { left: number }; layout: true }>().not.toExtend<TargetMotionOptions>()
  expectTypeOf<{
    animate: { left: number }
    layoutId: string
  }>().not.toExtend<TargetMotionOptions>()
  expectTypeOf<{ animate: { left: number }; drag: 'x' }>().not.toExtend<TargetMotionOptions>()
})

effectIt.effect('retains the rendered child while an exit is pending and can reverse it', () => {
  const { block, layer } = subject()

  return Scene.scene(
    { block, layer },
    Scene.init(),
    Scene.click(Scene.role('button', { name: 'Hide' })),
    Scene.expect(Scene.selector('#retained')).toHaveAttr('data-present', 'false'),
    Scene.click(Scene.role('button', { name: 'Show' })),
    Scene.expect(Scene.selector('#retained')).toHaveAttr('data-present', 'true'),
  )
})

effectIt.live(
  'retains physical identity on reversal, retires after completion and releases on scope disposal',
  () =>
    Effect.gen(function* retainedLifetime() {
      const { block, layer, acquired, released } = subject()
      const container = document.createElement('div')
      container.id = 'target-motion-test'
      document.body.append(container)
      const handle = Runtime.embed(Program.makeElement({ block, layer, container }))

      try {
        yield* waitFor(() => {
          expect(acquired).toHaveLength(1)
        })
        const original = document.querySelector<HTMLElement>('#retained')
        click(document, 'hide')
        yield* waitFor(() => {
          expect(original?.dataset.present).toBe('false')
        })
        click(document, 'show')
        yield* waitFor(() => {
          expect(document.querySelector<HTMLElement>('#retained')?.dataset.present).toBe('true')
        })
        expect(document.querySelector<HTMLElement>('#retained')).toBe(original)
        expect(acquired).toHaveLength(1)
        expect(released).toHaveLength(0)
        click(document, 'hide')
        yield* waitFor(() => {
          expect(document.querySelector<HTMLElement>('#retained')).toBeNull()
        })
        expect(released).toEqual([original])
        click(document, 'show')
        yield* waitFor(() => {
          expect(acquired).toHaveLength(2)
        })
        expect(document.querySelector<HTMLElement>('#retained')).not.toBe(original)
      } finally {
        yield* Effect.promise(handle.dispose)
        container.remove()
      }

      expect(released).toEqual(acquired)
    }),
)

effectIt.live(
  'independent Programs do not advance an unrelated Motion owner twice per browser frame',
  () =>
    Effect.gen(function* independentFrameOwners() {
      const first = subject()
      const second = subject()
      const containers = [document.createElement('div'), document.createElement('div')]

      for (const container of containers) {
        document.body.append(container)
      }

      const [firstContainer, secondContainer] = containers

      if (firstContainer === undefined || secondContainer === undefined) {
        throw new Error('Missing containers')
      }

      const firstMount = document.createElement('div')
      const secondMount = document.createElement('div')
      firstMount.id = 'target-frame-first'
      secondMount.id = 'target-frame-second'
      firstContainer.append(firstMount)
      secondContainer.append(secondMount)

      const handles = [
        Runtime.embed(
          Program.makeElement({ block: first.block, layer: first.layer, container: firstMount }),
        ),
        Runtime.embed(
          Program.makeElement({ block: second.block, layer: second.layer, container: secondMount }),
        ),
      ]

      let browserFrame = 0
      let raf = 0
      let observing = true

      const observe = () => {
        browserFrame += 1

        if (observing) {
          raf = requestAnimationFrame(observe)
        }
      }

      raf = requestAnimationFrame(observe)
      const unrelated = motionValue(0)
      const advances: Array<{ frame: number; value: number }> = []

      const record = unrelated.on('change', (value) => {
        advances.push({ frame: browserFrame, value })
      })

      const keepAlive = ({ delta }: { delta: number }) => {
        unrelated.set(unrelated.get() + delta)
      }

      const completion = vi.fn()
      const animated = motionValue(0)

      const animation = animateSingleValue(animated, 100, {
        duration: 0.6,
        ease: 'linear',
        onComplete: () => {
          completion()
        },
      })

      frame.update(keepAlive, true)

      try {
        yield* waitFor(() => {
          expect(first.acquired).toHaveLength(1)
          expect(second.acquired).toHaveLength(1)
        })
        advances.length = 0

        const originals = containers.map((container) =>
          container.querySelector<HTMLElement>('#retained'),
        )

        for (const container of containers) {
          click(container, 'hide')
        }

        yield* waitFor(() => {
          for (const container of containers) {
            expect(container.querySelector<HTMLElement>('#retained')?.dataset.present).toBe('false')
          }
        })

        for (const container of containers) {
          click(container, 'show')
        }

        yield* waitFor(() => {
          for (const container of containers) {
            expect(container.querySelector<HTMLElement>('#retained')?.dataset.present).toBe('true')
          }
        })
        expect(
          containers.map((container) => container.querySelector<HTMLElement>('#retained')),
        ).toEqual(originals)

        for (const container of containers) {
          click(container, 'hide')
        }

        yield* Effect.all(
          handles.map((handle) => Effect.promise(handle.dispose)),
          { concurrency: 'unbounded' },
        )
        expect(first.released).toEqual(first.acquired)
        expect(second.released).toEqual(second.acquired)
        yield* waitFor(() => {
          expect(completion).toHaveBeenCalledTimes(1)
        })
        expect(animated.get()).toBe(100)

        const repeated = advances.filter((sample, index) => {
          const previous = advances[index - 1]

          return (
            previous !== undefined &&
            previous.frame === sample.frame &&
            previous.value !== sample.value
          )
        })

        expect(
          repeated,
          'Unrelated delta-integrated owner must not advance twice in one browser frame',
        ).toEqual([])
      } finally {
        observing = false
        cancelAnimationFrame(raf)
        cancelFrame(keepAlive)
        animation.stop()
        record()
        unrelated.destroy()
        animated.destroy()
        yield* Effect.all(
          handles.map((handle) => Effect.promise(handle.dispose)),
          { concurrency: 'unbounded' },
        )

        for (const container of containers) {
          container.remove()
        }
      }
    }),
)

effectIt.live(
  'present target updates still notify completion and updates without dispatching exit',
  () =>
    Effect.gen(function* () {
      const fixture = subject()
      const host = document.createElement('div')
      const container = document.createElement('div')
      container.id = 'present-motion-callback-test'
      host.append(container)
      document.body.append(host)
      const handle = Runtime.embed(
        Program.makeElement({ block: fixture.block, layer: fixture.layer, container }),
      )
      let exits = 0
      try {
        yield* waitFor(() => expect(fixture.acquired).toHaveLength(1))
        const original = host.querySelector<HTMLElement>('#retained')
        if (original === null) throw new Error('Missing retained target')
        original.addEventListener(EXIT_COMPLETE_EVENT, () => {
          exits += 1
        })
        fixture.completed.length = 0
        fixture.updated.length = 0
        click(host, 'show')
        yield* waitFor(() => {
          expect(original.style.left).toBe('21px')
          expect(fixture.completed).toContain(original)
        })
        expect(fixture.updated).toContain(original)
        expect(exits).toBe(0)
        expect(host.querySelector('#retained')).toBe(original)
        expect(fixture.released).toEqual([])
      } finally {
        yield* Effect.promise(handle.dispose)
        host.remove()
      }
      expect(fixture.released).toEqual(fixture.acquired)
    }),
)
