// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Effect, Layer, Schedule, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { expect, vi } from 'vitest'
import {
  CodeBlock,
  CodeBlockBlock,
  layer as codeLayer,
  createCodeBlockLayer,
} from '../src/code-block.js'

const Message = defineMessageUnion({ Changed: {} })
const Key = Symbol('CodeBlockConsumer')
const Consumer = Block.make('CodeBlockConsumer', {
  key: Key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ code: CodeBlockBlock.Model, copies: Schema.Natural }),
  Message,
  view: { kind: 'Element' },
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof CodeBlockBlock>['programRequirements']
  >(),
})
const Code = Consumer.makeRequiredFieldBinding(CodeBlockBlock, {
  field: 'code',
  init: { contextToArgs: () => [{ id: 'sample', code: '<script>unsafe()</script>\nsecond\n' }] },
}).withOutMessagePolicy({
  fold: Consumer.makeOutMessageFold(CodeBlockBlock, {
    Copied: () => Consumer.makeFieldsStep(() => ({ copies: (count) => count + 1 })),
  }),
})
const Composition = Consumer.makeComposition({ bindings: [Code] })
const layer = Consumer.makeLayer({
  init: Composition.makeInit(() => ({ model: { copies: 0 } })),
  update: Composition.makeUpdate({ Changed: Code.requestCode({ code: 'replacement' }) }),
  view: Composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.block(
          Code.embedView({
            slotId: 'sample',
            model: model.code,
            viewInputs: {
              className: 'consumer-code-block',
              attributes: childAttributes([h.DataAttribute('public-code-block', 'root')]),
              filename: 'sample.ts',
              language: 'ts',
              lineNumbers: true,
              wrap: true,
              maxHeight: 120,
              reducedMotion: 'always',
              hideHeader: model.code.copy.copy.value === 'replacement',
              ...(model.code.copy.copy.value === 'replacement'
                ? {
                    children: [
                      h.pre([], [h.code([], [h.span([h.Class('highlighted')], ['replacement'])])]),
                    ],
                  }
                : {}),
            },
          }),
        ),
        h.button([h.Id('change-code'), h.OnClick(Message.Changed())], ['Change']),
        h.output([], [String(model.copies)]),
        CodeBlock({ code: 'static', hideHeader: true, className: 'presentation-code-block' }, h),
      ],
    ),
  ),
}).pipe(Layer.provide(codeLayer))
const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 80, schedule: Schedule.spaced('20 millis') }))

it.live(
  'native composition numbers escaped code, scrolls, copies exact current text and reports failures',
  () =>
    Effect.gen(function* () {
      const animation = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')
      if (animation === undefined || !Reflect.deleteProperty(Element.prototype, 'animate'))
        throw new Error('Test requires scoped WAAPI capability removal')
      const write = vi.fn((_value: string) => Promise.resolve())
      const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: write },
      })
      const host = document.createElement('div')
      const container = document.createElement('div')
      container.id = 'code-block-test'
      host.append(container)
      document.body.append(host)
      const handle = Runtime.embed(
        Program.makeElement({ block: Consumer, layer, container }).provide(
          createCodeBlockLayer(document, navigator, window),
        ),
      )
      const clickCopy = () => {
        const button = host.querySelector<HTMLButtonElement>('#sample-copy-button')
        if (button === null) throw new Error('Missing copy button')
        button.click()
      }
      try {
        yield* eventually(() => expect(host.querySelectorAll('[data-code-line]')).toHaveLength(2))
        expect(host.querySelector('script')).toBeNull()
        expect(host.querySelectorAll('[data-public-code-block]')).toHaveLength(1)
        expect(host.querySelectorAll('.consumer-code-block')).toHaveLength(1)
        expect(host.querySelectorAll('.presentation-code-block')).toHaveLength(1)
        expect(
          host.querySelector('[data-slot="scroll-area-viewport"]')?.getAttribute('aria-label'),
        ).toBe('sample.ts')
        expect(host.querySelector('[data-code-line="1"]')?.textContent).toContain(
          '<script>unsafe()</script>',
        )
        clickCopy()
        yield* eventually(() => {
          expect(write).toHaveBeenCalledWith('<script>unsafe()</script>\nsecond\n')
          expect(host.querySelector('output')?.textContent).toBe('1')
        })
        host.querySelector<HTMLButtonElement>('#change-code')?.click()
        yield* eventually(() =>
          expect(host.querySelector('pre')?.textContent).toContain('replacement'),
        )
        expect(host.querySelectorAll('[data-code-line]')).toHaveLength(0)
        expect(host.querySelector('.highlighted')?.textContent).toBe('replacement')
        expect(host.querySelector('.code-block-filename')).toBeNull()
        expect(host.querySelector('#sample-copy-button')?.getAttribute('aria-label')).toBe(
          'Copy code',
        )
        clickCopy()
        yield* eventually(() => expect(write).toHaveBeenLastCalledWith('replacement'))
        write.mockRejectedValueOnce(new Error('Permission denied'))
        clickCopy()
        yield* eventually(() =>
          expect(host.querySelector('[role="status"]')?.textContent).toContain('Copy failed'),
        )
        expect(host.querySelector('output')?.textContent).toBe('2')
      } finally {
        yield* Effect.promise(() => handle.dispose())
        host.remove()
        Object.defineProperty(Element.prototype, 'animate', animation)
        if (clipboard === undefined) Reflect.deleteProperty(navigator, 'clipboard')
        else Object.defineProperty(navigator, 'clipboard', clipboard)
      }
    }),
)
