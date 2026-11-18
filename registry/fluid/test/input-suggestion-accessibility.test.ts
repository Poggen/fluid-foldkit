// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Layer, Schedule, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import {
  InputMessageBlock,
  layer as InputMessageLayer,
  createInputMessageLayer,
  createInputMessageFileRegistry,
} from '../src/input-message.js'
import { makeFileThumbnailResourcesLayer } from '../src/file-thumbnail-resources.js'
import { ColorSwatch } from '../src/color-picker-parts.js'
import { createMotionScope } from '../src/motion.js'
import { createReorderScope } from '../src/reorder.js'

const AccessibilityKey = Symbol('InputSuggestionAccessibility')
const AccessibilityBlock = Block.make('InputSuggestionAccessibility', {
  key: AccessibilityKey,
  Model: Schema.Struct({ input: InputMessageBlock.Model }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof InputMessageBlock>['programRequirements']
  >(),
})
const InputBinding = AccessibilityBlock.makeRequiredFieldBinding(InputMessageBlock, {
  field: 'input',
  init: {
    contextToArgs: () => [
      { id: 'composer', value: '', reduceMotion: true, suggestions: ['Explain this', 'Summarize'] },
    ],
  },
}).withOutMessagePolicy({
  fold: AccessibilityBlock.makeOutMessageFold(InputMessageBlock, {
    Events: AccessibilityBlock.makeNoopStep,
    PresentationChanged: AccessibilityBlock.makeNoopStep,
  }),
})
const AccessibilityComposition = AccessibilityBlock.makeComposition({ bindings: [InputBinding] })
const makeAccessibilityLayer = () => {
  const motion = createMotionScope('input-suggestion-accessibility')
  const reorder = createReorderScope(motion)
  return AccessibilityBlock.makeLayer({
    init: AccessibilityComposition.makeInit(() => ({
      model: {},
      steps: [InputBinding.requestHighlight({ index: 0 })],
    })),
    update: AccessibilityComposition.makeUpdate({}),
    view: AccessibilityComposition.makeView((model, h) =>
      h.div(
        [],
        [
          h.block(
            InputBinding.embedView({
              slotId: 'input',
              model: model.input,
              viewInputs: {
                animate: motion.node,
                getReorder: () => reorder,
                tooltip: ({ trigger }) =>
                  trigger({
                    attributes: [],
                    button: (attributes, children) => h.button(attributes, children),
                    anchor: (attributes, children) => h.a(attributes, children),
                    span: (attributes, children) => h.span(attributes, children),
                    div: (attributes, children) => h.div(attributes, children),
                  }),
              },
            }),
          ),
          ColorSwatch({ color: '#ff0000', selected: true }, h),
          ColorSwatch({ color: '#0000ff' }, h),
        ],
      ),
    ),
  }).pipe(Layer.provide(InputMessageLayer), Layer.provide(Layer.merge(motion.layer, reorder.layer)))
}

it.live(
  'suggestions expose an owned active option and swatches expose selection to assistive technology',
  () =>
    Effect.scoped(
      Effect.gen(function* () {
        const registry = createInputMessageFileRegistry()
        const container = document.createElement('div')
        container.id = 'input-suggestion-accessibility'
        const host = document.createElement('div')
        host.append(container)
        document.body.append(host)
        const program = Runtime.embed(
          Program.makeElement({
            block: AccessibilityBlock,
            layer: makeAccessibilityLayer(),
            container,
          }).provide(
            Layer.merge(
              createInputMessageLayer(document, window, registry),
              makeFileThumbnailResourcesLayer({ file: registry.file }),
            ),
          ),
        )
        yield* Effect.addFinalizer(() =>
          Effect.promise(program.dispose).pipe(
            Effect.andThen(
              Effect.sync(() => {
                host.remove()
                registry.dispose()
              }),
            ),
          ),
        )
        yield* Effect.try(() => {
          const textarea = host.querySelector('textarea')
          const listbox = host.querySelector('[role="listbox"]')
          expect(textarea?.getAttribute('aria-autocomplete')).toBe('list')
          expect(listbox?.id).toBe('composer-suggestions')
          expect(textarea?.getAttribute('aria-controls')).toBe(listbox?.id)
          const activeId = textarea?.getAttribute('aria-activedescendant')
          expect(activeId).toBe('composer-suggestions-0')
          expect(listbox?.querySelector(`[id="${activeId}"]`)?.getAttribute('role')).toBe('option')
          expect(
            host.querySelector('[aria-label="Select color #ff0000"]')?.getAttribute('aria-pressed'),
          ).toBe('true')
          expect(
            host.querySelector('[aria-label="Select color #0000ff"]')?.getAttribute('aria-pressed'),
          ).toBe('false')
        }).pipe(Effect.retry({ times: 40, schedule: Schedule.spaced('10 millis') }))
      }),
    ),
)
