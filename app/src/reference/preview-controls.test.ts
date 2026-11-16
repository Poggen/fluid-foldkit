import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { expect, vi } from 'vitest'
import {
  PreviewControlsBlock,
  layer as PreviewControlsLayer,
} from '../../../components/docs/preview-controls'
import { previewCodeTabsViewInputs } from '../../../components/docs/preview-code-tabs'
import { docSection } from '../../../registry/fluid/examples/src/doc-section'

const key = Symbol('PreviewControlsExample')
const Example = Block.make('PreviewControlsExample', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ controls: PreviewControlsBlock.Model, draft: Schema.String }),
  Message: defineMessageUnion({ EditedDraft: { value: Schema.String } }),
  view: { kind: 'Element' },
})
const Controls = Example.makeRequiredFieldBinding(PreviewControlsBlock, {
  field: 'controls',
  init: {
    contextToArgs: () => [
      { id: 'controls-example', idPrefix: 'controls-example', selectedIndex: 0 },
    ],
  },
})
const Composition = Example.makeComposition({ bindings: [Controls] })
const layer = Example.makeLayer({
  init: Composition.makeInit(() => ({ model: { draft: 'Initial draft' } })),
  update: Composition.makeUpdate({
    EditedDraft: (model, { value }) => ({ model: { ...model, draft: value } }),
  }),
  view: Composition.makeView((model, h) =>
    h.div(
      [],
      [
        docSection(h, {
          title: 'Editable preview',
          source: 'const example = true',
          presentation: {},
          pane: model.controls.tabs.selectedIndex === 1 ? 'code' : 'preview',
          tabsId: 'controls-example',
          tabs: h.block(
            Controls.embedView({
              slotId: 'controls',
              model: model.controls,
              viewInputs: previewCodeTabsViewInputs(h, {
                animate: (node) => node,
                ariaLabel: 'Example view',
              }),
            }),
          ),
          children: [
            h.textarea([
              h.Id('preview-draft'),
              h.AriaLabel('Draft'),
              h.Value(model.draft),
              h.OnInput((value) => Example.Message.EditedDraft({ value })),
            ]),
          ],
        }),
        h.div(
          [h.Class('authored-frame')],
          [h.div([h.Role('tabpanel')], [h.button([h.Id('other-preview')], ['Other preview'])])],
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(PreviewControlsLayer))
const waitFor = (assertion: () => void) => Effect.promise(() => vi.waitFor(assertion))

it.live(
  'sample controls preserve drafts and ARIA targets across panes, contain inspection, and dispose observers',
  () =>
    Effect.gen(function* () {
      const observe = vi.spyOn(ResizeObserver.prototype, 'observe')
      const disconnect = vi.spyOn(ResizeObserver.prototype, 'disconnect')
      const container = document.createElement('div')
      container.id = 'preview-controls-runtime'
      const host = document.createElement('div')
      host.append(container)
      document.body.append(host)
      const program = Runtime.embed(Program.makeElement({ block: Example, layer, container }))
      try {
        yield* waitFor(() => expect(host.querySelectorAll('[role="tab"]')).toHaveLength(2))
        const draft = host.querySelector<HTMLTextAreaElement>('#preview-draft')
        const outside = host.querySelector('#other-preview')
        const toggle = host.querySelector('[role="switch"]')
        const tabs = host.querySelectorAll('[role="tab"]')
        if (draft === null || outside === null || toggle === null)
          throw new Error('Missing sample controls')
        draft.value = 'Keep this draft'
        draft.dispatchEvent(new Event('input', { bubbles: true }))
        draft.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
        expect(host.querySelector('[role="status"]')).toBeNull()
        expect(observe).not.toHaveBeenCalledWith(draft)
        tabs[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        yield* waitFor(() => expect(tabs[1]?.getAttribute('aria-selected')).toBe('true'))
        expect(tabs[1]?.getAttribute('aria-controls')).toBe('controls-example-panel-1')
        expect(host.querySelector('#controls-example-panel-1')?.classList.contains('hidden')).toBe(
          false,
        )
        expect(host.querySelector('#preview-draft')).toBe(draft)
        tabs[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        yield* waitFor(() => expect(tabs[0]?.getAttribute('aria-selected')).toBe('true'))
        expect(draft.value).toBe('Keep this draft')
        toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        yield* waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('true'))
        outside.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
        expect(observe).not.toHaveBeenCalledWith(outside)
        draft.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
        yield* waitFor(() =>
          expect(host.querySelector('[role="status"]')?.textContent).toContain('textarea'),
        )
        expect(observe).toHaveBeenCalledWith(draft)
        const panel = draft.parentElement
        if (panel === null) throw new Error('Missing draft panel')
        disconnect.mockClear()
        yield* Effect.promise(() => program.dispose())
        expect(disconnect).toHaveBeenCalled()
        observe.mockClear()
        const releasedTarget = document.createElement('input')
        panel.append(releasedTarget)
        releasedTarget.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
        expect(observe).not.toHaveBeenCalled()
      } finally {
        yield* Effect.promise(() => program.dispose())
        host.remove()
        observe.mockRestore()
        disconnect.mockRestore()
      }
    }),
)
