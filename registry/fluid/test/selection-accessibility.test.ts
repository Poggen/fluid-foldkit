// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Effect, Layer, Schedule, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { expect } from 'vitest'
import { DropdownResourcesServerLayer } from '../src/dropdown-resources.js'
import { DialogResourcesServerLayer } from '../src/dialog-resources.js'
import { SelectBlock, layer as selectLayer } from '../src/select.js'
import { ComboboxBlock, layer as comboboxLayer } from '../src/combobox.js'

const SelectionAccessibilityKey = Symbol('SelectionAccessibility')
const Consumer = Block.make('SelectionAccessibility', {
  key: SelectionAccessibilityKey,
  Model: Schema.Struct({
    select: SelectBlock.Model,
    combo: ComboboxBlock.Model,
    error: Schema.String,
    isRequired: Schema.Boolean,
  }),
  Message: defineMessageUnion({ Validate: {}, Clear: {}, Optional: {} }),
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof SelectBlock>['programRequirements']
    | Block.FactsOf<typeof ComboboxBlock>['programRequirements']
  >(),
})
const items = [{ value: 'apple', label: 'Apple' }]
const Select = Consumer.makeRequiredFieldBinding(SelectBlock, {
  field: 'select',
  init: { contextToArgs: () => [{ id: 'fruit', items, defaultValue: 'apple' }] },
}).withOutMessagePolicy({
  fold: Consumer.makeOutMessageFold(SelectBlock, {
    Selected: Consumer.makeNoopStep,
    OpenChanged: Consumer.makeNoopStep,
  }),
})
const Combo = Consumer.makeRequiredFieldBinding(ComboboxBlock, {
  field: 'combo',
  init: { contextToArgs: () => [{ id: 'search', items, defaultValue: 'apple' }] },
}).withOutMessagePolicy({
  fold: Consumer.makeOutMessageFold(ComboboxBlock, {
    ValuesChanged: Consumer.makeNoopStep,
    Selected: Consumer.makeNoopStep,
    CreateRequested: Consumer.makeNoopStep,
  }),
})
const Composition = Consumer.makeComposition({ bindings: [Select, Combo] })
const layer = Consumer.makeLayer({
  init: Composition.makeInit(() => ({ model: { error: '', isRequired: true } })),
  update: Composition.makeUpdate({
    Validate: Consumer.makeFieldsStep(() => ({ error: () => 'Choose a fruit' })),
    Clear: Consumer.makeFieldsStep(() => ({ error: () => '' })),
    Optional: Consumer.makeFieldsStep(() => ({ isRequired: () => false })),
  }),
  view: Composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.p([h.Id('fruit-help')], ['Fruit instructions']),
        h.p([h.Id('search-help')], ['Search instructions']),
        h.block(
          Select.embedView({
            slotId: 'select',
            model: model.select,
            viewInputs: {
              animate: (node) => node,
              ariaLabel: 'Fruit',
              error: model.error,
              required: model.isRequired,
              attributes: childAttributes([
                h.Id('custom-select-wrapper'),
                h.AriaDescribedBy('fruit-help'),
              ]),
            },
          }),
        ),
        h.block(
          Combo.embedView({
            slotId: 'combo',
            model: model.combo,
            viewInputs: {
              animate: (node) => node,
              ariaLabel: 'Search fruit',
              error: model.error,
              required: model.isRequired,
              attributes: childAttributes([
                h.Id('custom-combo-wrapper'),
                h.AriaDescribedBy('search-help'),
              ]),
            },
          }),
        ),
        h.button([h.OnClick(Consumer.Message.Validate())], ['Validate']),
        h.button([h.OnClick(Consumer.Message.Clear())], ['Clear']),
        h.button([h.OnClick(Consumer.Message.Optional())], ['Optional']),
      ],
    ),
  ),
}).pipe(Layer.provide(Layer.mergeAll(selectLayer, comboboxLayer)))

const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 80, schedule: Schedule.spaced('10 millis') }))
it.live(
  'selection controls expose required state independently of validation and clear stale semantics',
  () =>
    Effect.gen(function* () {
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          const descriptor = Object.getOwnPropertyDescriptor(document, 'fonts')
          Object.defineProperty(document, 'fonts', { configurable: true, value: new EventTarget() })
          return descriptor
        }),
        (descriptor) =>
          Effect.sync(() => {
            if (descriptor) Object.defineProperty(document, 'fonts', descriptor)
            else Reflect.deleteProperty(document, 'fonts')
          }),
      )
      const container = yield* Effect.acquireRelease(
        Effect.sync(() => {
          const node = document.createElement('div')
          node.id = 'selection-accessibility'
          const wrapper = document.createElement('div')
          wrapper.append(node)
          document.body.append(wrapper)
          return wrapper
        }),
        (node) => Effect.sync(() => node.remove()),
      )
      yield* Effect.acquireRelease(
        Effect.sync(() =>
          Runtime.embed(
            Program.makeElement({
              block: Consumer,
              layer,
              container: container.querySelector<HTMLElement>('#selection-accessibility'),
            }).provide(Layer.mergeAll(DropdownResourcesServerLayer, DialogResourcesServerLayer)),
          ),
        ),
        (runtime) => Effect.promise(runtime.dispose),
      )
      const control = (label: string) =>
        container.querySelector(`[role="combobox"][aria-label="${label}"]`)
      yield* eventually(() => expect(control('Fruit')).not.toBeNull())
      expect(control('Fruit')?.getAttribute('aria-required')).toBe('true')
      expect(control('Search fruit')?.getAttribute('aria-required')).toBe('true')
      expect(control('Search fruit')?.hasAttribute('required')).toBe(false)
      expect(control('Fruit')?.hasAttribute('aria-describedby')).toBe(false)
      expect(control('Search fruit')?.hasAttribute('aria-describedby')).toBe(false)
      const click = (text: string) => {
        const button = [...container.querySelectorAll('button')].find(
          (node) => node.textContent === text,
        )
        if (!button) throw new Error(`Missing ${text} button`)
        button.click()
      }
      click('Validate')
      yield* eventually(() =>
        expect(control('Fruit')?.getAttribute('aria-describedby')).toBe('fruit-error'),
      )
      expect(control('Search fruit')?.getAttribute('aria-describedby')).toBe('search-error')
      for (const id of ['fruit-error', 'search-error']) {
        expect(container.querySelector(`#${id}`)?.getAttribute('role')).toBe('alert')
        expect(container.querySelector(`#${id}`)?.textContent).toBe('Choose a fruit')
      }
      expect(
        container.querySelector('#custom-select-wrapper')?.getAttribute('aria-describedby'),
      ).toBe('fruit-help')
      expect(
        container.querySelector('#custom-combo-wrapper')?.getAttribute('aria-describedby'),
      ).toBe('search-help')
      click('Clear')
      yield* eventually(() => expect(container.querySelector('#fruit-error')).toBeNull())
      expect(container.querySelector('#search-error')).toBeNull()
      expect(control('Fruit')?.getAttribute('aria-required')).toBe('true')
      expect(control('Search fruit')?.getAttribute('aria-required')).toBe('true')
      expect(control('Search fruit')?.hasAttribute('required')).toBe(false)
      expect(control('Fruit')?.hasAttribute('aria-describedby')).toBe(false)
      expect(control('Search fruit')?.hasAttribute('aria-describedby')).toBe(false)
      expect(
        container.querySelector('#custom-select-wrapper')?.getAttribute('aria-describedby'),
      ).toBe('fruit-help')
      expect(
        container.querySelector('#custom-combo-wrapper')?.getAttribute('aria-describedby'),
      ).toBe('search-help')
      click('Optional')
      yield* eventually(() => expect(control('Fruit')?.hasAttribute('aria-required')).toBe(false))
      expect(control('Search fruit')?.hasAttribute('aria-required')).toBe(false)
    }),
)
