// @vitest-environment happy-dom -- the checked Program owns physical DOM resources
import { it } from '@effect/vitest'
import { Effect, Schedule, Schema } from 'effect'
import { compile } from '@tailwindcss/node'
import { Block, Program, Runtime, Story } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { renderToString } from 'foldkit/experimental/server'
import { ReorderBlock, layer, reorderItemAttributes } from '../src/reorder.js'
import { expect } from 'vitest'
import {
  ReorderExampleBlock,
  createReorderExampleLayer,
} from '../examples/src/reorder-example-block.js'

const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 50, schedule: Schedule.spaced('20 millis') }))

it.live(
  'preserves physical rows across layout capability changes and reacquires drag-enabled rows after removal',
  () =>
    Effect.gen(function* reorderLifetime() {
      const container = document.createElement('div')
      container.id = 'reorder-runtime-test'
      const host = document.createElement('div')
      host.append(container)
      document.body.append(host)

      const program = Runtime.embed(
        Program.makeElement({
          block: ReorderExampleBlock,
          layer: createReorderExampleLayer(),
          container,
        }),
      )

      const row = () => host.querySelector<HTMLLIElement>('[data-reorder-id="Research notes"]')

      const click = (id: string) => {
        const button = host.querySelector<HTMLButtonElement>(`#${id}`)

        if (button === null) {
          throw new Error(`Missing ${id}`)
        }

        button.click()
      }

      try {
        yield* eventually(() => {
          expect(row()?.getAttribute('draggable')).toBe('false')
          expect(row()?.dataset.layoutId).toBe('reorder-example:Research notes')
        })
        const original = row()
        expect(original?.dataset.layoutId).toBe('reorder-example:Research notes')
        click('reorder-shared')
        yield* eventually(() => {
          expect(row()?.dataset.layoutId !== undefined).toBe(false)
        })
        expect(row()).toBe(original)
        click('reorder-shared')
        yield* eventually(() => {
          expect(row()?.dataset.layoutId).toBe('reorder-example:Research notes')
        })
        expect(row()).toBe(original)
        click('reorder-reverse')
        yield* eventually(() => {
          expect(host.querySelector<HTMLLIElement>('[data-reorder-id]')?.dataset.reorderId).toBe(
            'Next steps',
          )
        })
        expect(row()).toBe(original)
        click('reorder-mount')
        yield* eventually(() => {
          expect(row()).toBeNull()
        })
        expect(original?.isConnected).toBe(false)
        click('reorder-mount')
        yield* eventually(() => {
          expect(row()?.getAttribute('draggable')).toBe('false')
        })
        expect(row()).not.toBe(original)
      } finally {
        yield* Effect.promise(program.dispose)
        host.remove()
      }
    }),
)

it.effect('keeps proposed drag order unaccepted until the parent configures it', () =>
  Story.story(
    { block: ReorderBlock, layer },
    Story.init({ id: 'controlled-order', ids: ['first', 'second'] }),
    Story.message(ReorderBlock.Message.ObservedOrder({ ids: ['second', 'first'] })),
    Story.expectOutMessage(ReorderBlock.OutMessage.OrderRequested({ ids: ['second', 'first'] })),
    Story.model((model) => {
      expect(model.ids).toEqual(['first', 'second'])
    }),
    Story.inMessage(ReorderBlock.InMessage.RequestedConfigure({ ids: ['first', 'second'] })),
    Story.model((model) => {
      expect(model.ids).toEqual(['first', 'second'])
    }),
    Story.message(ReorderBlock.Message.ObservedOrder({ ids: ['second', 'first'] })),
    Story.model((model) => {
      expect(model.ids).toEqual(['first', 'second'])
    }),
    Story.inMessage(ReorderBlock.InMessage.RequestedConfigure({ ids: ['second', 'first'] })),
    Story.model((model) => {
      expect(model.ids).toEqual(['second', 'first'])
    }),
  ),
)

const ClassFixtureModel = Schema.Struct({ phase: Schema.Finite })
type ClassFixtureModel = typeof ClassFixtureModel.Type
const ClassFixtureMessage = defineMessageUnion({ ClickedNext: {} })
const ClassFixtureKey = Symbol('ReorderItemClassFixture')
const classFixtureEffects = Block.makeEffectsContract()
const ClassFixture = Block.make('ReorderItemClassFixture', {
  key: ClassFixtureKey,
  Model: ClassFixtureModel,
  Message: ClassFixtureMessage,
  InitArgs: Schema.Tuple([]),
  effects: classFixtureEffects,
  view: { kind: 'Document' },
})
const ClassComposition = ClassFixture.makeComposition({})
const classFixtureLayer = ClassFixture.makeLayer({
  init: ClassComposition.makeInit(() => ({ model: { phase: 0 } })),
  update: ClassComposition.makeUpdate({
    ClickedNext: (model) => ({ model: { phase: model.phase + 1 } }),
  }),
  view: ClassComposition.makeView((model, h) => ({
    title: 'Reorder item class composition',
    body: h.main(
      [],
      [
        h.button(
          [h.Id('reorder-class-next'), h.OnClick(ClassFixtureMessage.ClickedNext())],
          ['Next'],
        ),
        h.div([
          ...reorderItemAttributes(),
          h.Id('reorder-class-item'),
          h.Class(model.phase === 0 ? '[padding:8px]' : model.phase === 1 ? '[padding:16px]' : ''),
        ]),
      ],
    ),
  })),
})

it.live('preserves item drag styling when a caller changes and removes its own classes', () =>
  Effect.gen(function* reorderItemClasses() {
    const rendered = yield* renderToString(
      { block: ClassFixture, layer: classFixtureLayer },
      {},
      { isHydratable: false },
    )
    const serialized = document.createElement('div')
    serialized.innerHTML = rendered.html
    const candidates = Array.from(serialized.querySelectorAll('[class]')).flatMap((element) =>
      Array.from(element.classList),
    )
    const compiler = yield* Effect.promise(() =>
      compile("@import 'tailwindcss/utilities';", {
        base: import.meta.dirname,
        onDependency: () => {},
      }),
    )
    const sheet = document.createElement('style')
    sheet.textContent = compiler.build([...candidates, '[padding:16px]'])
    const container = document.createElement('div')
    container.id = 'reorder-class-runtime'
    const host = document.createElement('div')
    host.append(container)
    document.head.append(sheet)
    document.body.append(host)
    const item = (root: ParentNode) => {
      const element = root.querySelector<HTMLElement>('#reorder-class-item')
      if (element === null) throw new Error('Missing reordered item')
      return element
    }
    const assertDragStyles = (element: HTMLElement) => {
      const style = getComputedStyle(element)
      expect(style.getPropertyValue('touch-action')).toBe('pan-x')
      expect(style.userSelect).toBe('none')
    }
    const program = Runtime.embed(
      Program.make({ block: ClassFixture, layer: classFixtureLayer, container }),
    )
    try {
      host.append(serialized)
      assertDragStyles(item(serialized))
      serialized.remove()
      yield* eventually(() => {
        assertDragStyles(item(host))
        expect(getComputedStyle(item(host)).paddingTop).toBe('8px')
      })
      const original = item(host)
      for (const padding of ['16px', '']) {
        const button = host.querySelector<HTMLButtonElement>('#reorder-class-next')
        if (button === null) throw new Error('Missing class change control')
        button.click()
        yield* eventually(() => {
          expect(item(host)).toBe(original)
          expect(getComputedStyle(original).paddingTop).toBe(padding)
          assertDragStyles(original)
        })
      }
    } finally {
      try {
        yield* Effect.promise(program.dispose)
      } finally {
        serialized.remove()
        sheet.remove()
        host.remove()
      }
    }
  }),
)
