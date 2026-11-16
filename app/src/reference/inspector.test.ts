import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { expect, vi } from 'vitest'
import { InspectorBlock, layer as InspectorLayer } from '../../../components/docs/inspector'

const key = Symbol('InspectorExample')
const InspectorExampleBlock = Block.make('InspectorExample', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ inspector: InspectorBlock.Model, clicks: Schema.Natural }),
  Message: defineMessageUnion({ Clicked: {} }),
  view: { kind: 'Element' },
})
const Inspector = InspectorExampleBlock.makeRequiredFieldBinding(InspectorBlock, {
  field: 'inspector',
  init: { contextToArgs: () => ['example-inspect'] },
})
const InspectorExampleComposition = InspectorExampleBlock.makeComposition({ bindings: [Inspector] })
const layer = InspectorExampleBlock.makeLayer({
  init: InspectorExampleComposition.makeInit(() => ({ model: { clicks: 0 } })),
  update: InspectorExampleComposition.makeUpdate({
    Clicked: (model) => ({ model: { ...model, clicks: model.clicks + 1 } }),
  }),
  view: InspectorExampleComposition.makeView((model, h) =>
    h.div(
      [h.Class('reference-preview-card')],
      [
        h.block(
          Inspector.embedView({
            slotId: 'inspector',
            model: model.inspector,
            viewInputs: { animate: (node) => node },
          }),
        ),
        h.div(
          [h.Role('tabpanel')],
          [
            h.button(
              [h.Id('sample-button'), h.OnClick(InspectorExampleBlock.Message.Clicked())],
              [`Clicked ${model.clicks}`],
            ),
          ],
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(InspectorLayer))
const waitFor = (assertion: () => void) => Effect.promise(() => vi.waitFor(assertion))

it.live(
  'inspection is inactive by default, releases observation when disabled, and leaves preview clicks live',
  () =>
    Effect.gen(function* () {
      const observe = vi.spyOn(ResizeObserver.prototype, 'observe')
      const disconnect = vi.spyOn(ResizeObserver.prototype, 'disconnect')
      const host = document.createElement('div')
      const container = document.createElement('div')
      container.id = 'inspector-runtime'
      host.append(container)
      document.body.append(host)
      const program = Runtime.embed(
        Program.makeElement({ block: InspectorExampleBlock, layer, container }),
      )
      try {
        yield* waitFor(() => expect(host.querySelector('[role="switch"]')).not.toBeNull())
        const toggle = host.querySelector('[role="switch"]')
        const sample = host.querySelector('#sample-button')
        if (toggle === null || sample === null) throw new Error('Missing example controls')
        sample.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
        expect(observe).not.toHaveBeenCalled()
        expect(host.querySelector('[role="status"]')).toBeNull()
        toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        yield* waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('true'))
        sample.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
        yield* waitFor(() =>
          expect(host.querySelector('[role="status"]')?.textContent).toContain('button'),
        )
        expect(observe).toHaveBeenCalledWith(sample)
        sample.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        yield* waitFor(() => expect(sample.textContent).toBe('Clicked 1'))
        toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        yield* waitFor(() => expect(host.querySelector('[role="status"]')).toBeNull())
        expect(disconnect).toHaveBeenCalled()
        observe.mockClear()
        sample.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
        sample.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
        expect(observe).not.toHaveBeenCalled()
        expect(host.querySelector('[role="status"]')).toBeNull()
      } finally {
        yield* Effect.promise(() => program.dispose())
        host.remove()
        observe.mockRestore()
        disconnect.mockRestore()
      }
    }),
)
