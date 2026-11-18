// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Effect, Layer, Schedule, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { expect } from 'vitest'
import { ColorPopupBlock, layer as colorLayer } from '../src/color-picker-popup.js'
import { createColorPickerLayer } from '../src/color-picker-environment.js'
import { PopupBlock, layer as dateLayer } from '../src/date-picker-popup.js'
import { TimeFieldBlock, layer as timeLayer } from '../src/date-picker-time.js'
import { PopupAuthorityLayer } from '../src/date-picker-popup-authority.js'

const PopupAccessibilityKey = Symbol('PopupAccessibility')
const Consumer = Block.make('PopupAccessibility', {
  key: PopupAccessibilityKey,
  Model: Schema.Struct({
    popup: ColorPopupBlock.Model,
    date: PopupBlock.Model,
    time: TimeFieldBlock.Model,
  }),
  Message: defineMessageUnion({ OpenTime: {} }),
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof ColorPopupBlock>['programRequirements']
    | Block.FactsOf<typeof PopupBlock>['programRequirements']
  >(),
})
const Popup = Consumer.makeRequiredFieldBinding(ColorPopupBlock, {
  field: 'popup',
  init: {
    contextToArgs: () =>
      [{ id: 'color', kind: 'popover', defaultOpen: true }] satisfies Block.FactsOf<
        typeof ColorPopupBlock
      >['initArgs'],
  },
}).withOutMessagePolicy({
  fold: Consumer.makeOutMessageFold(ColorPopupBlock, {
    OpenChanged: Consumer.makeNoopStep,
    FocusChanged: Consumer.makeNoopStep,
    Selected: Consumer.makeNoopStep,
  }),
})
const DatePicker = Consumer.makeRequiredFieldBinding(PopupBlock, {
  field: 'date',
  init: {
    contextToArgs: () =>
      [
        { id: 'date-popup', anchorId: 'positioning-key', kind: 'trigger', align: 'start' },
        true,
        false,
      ] satisfies Block.FactsOf<typeof PopupBlock>['initArgs'],
  },
}).withOutMessagePolicy({
  fold: Consumer.makeOutMessageFold(PopupBlock, {
    DismissRequested: Consumer.makeNoopStep,
    Released: Consumer.makeNoopStep,
  }),
})
const Time = Consumer.makeRequiredFieldBinding(TimeFieldBlock, {
  field: 'time',
  init: {
    contextToArgs: () => [
      {
        id: 'start-time',
        value: null,
        display: '',
        slots: [{ minutes: 540, label: '9:00 AM', duration: null }],
        widestLabels: ['9:00 AM'],
        fallback: 540,
        disabled: false,
        label: 'Start time',
        placeholder: 'Select time',
      },
    ],
  },
}).withOutMessagePolicy({
  fold: Consumer.makeOutMessageFold(TimeFieldBlock, { Committed: Consumer.makeNoopStep }),
})
const Composition = Consumer.makeComposition({ bindings: [Popup, DatePicker, Time] })
const makeLayer = (custom: boolean, explicit: boolean) =>
  Consumer.makeLayer({
    init: Composition.makeInit(() => ({ model: {} })),
    update: Composition.makeUpdate({
      OpenTime: Time.requestAction({ action: { _tag: 'Opened' } }),
    }),
    view: Composition.makeView((model, h) => ({
      title: 'Popup accessibility',
      body: h.main(
        [],
        [
          h.block(
            Popup.embedView({
              slotId: 'popup',
              model: model.popup,
              viewInputs: {
                animate: (node) => node,
                triggerContent: () => [h.span([], ['Theme color'])],
                ...(custom
                  ? { triggerAttributes: childAttributes([h.Id('custom-color-trigger')]) }
                  : {}),
                ...(explicit
                  ? { contentAttributes: childAttributes([h.AriaLabel('Custom palette')]) }
                  : {}),
                content: () => [h.p([], ['Palette'])],
              },
            }),
          ),
          h.button(
            [h.Id('custom-date-trigger'), h.DataAttribute('date-picker-anchor', 'positioning-key')],
            ['Choose a date'],
          ),
          h.block(
            DatePicker.embedView({
              slotId: 'date',
              model: model.date,
              viewInputs: {
                animate: (node) => node,
                ariaLabelledBy: 'custom-date-trigger',
                content: () => [h.p([], ['Calendar'])],
              },
            }),
          ),
          h.block(
            Time.embedView({
              slotId: 'time',
              model: model.time,
              viewInputs: {
                animate: (node) => node,
                highlight: (node) => node,
                compact: false,
                segmentClass: '',
              },
            }),
          ),
          h.button([h.Id('open-time'), h.OnClick(Consumer.Message.OpenTime())], ['Open time']),
        ],
      ),
    })),
  }).pipe(Layer.provide(Layer.mergeAll(colorLayer, dateLayer, timeLayer)))
const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 80, schedule: Schedule.spaced('10 millis') }))
const mount = (custom: boolean, explicit: boolean) =>
  Effect.gen(function* () {
    const container = yield* Effect.acquireRelease(
      Effect.sync(() => {
        const node = document.createElement('div')
        node.id = 'popup-accessibility'
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
          Program.make({
            block: Consumer,
            layer: makeLayer(custom, explicit),
            container: container.querySelector<HTMLElement>('#popup-accessibility'),
          }).provide(Layer.mergeAll(PopupAuthorityLayer, createColorPickerLayer(document))),
        ),
      ),
      (runtime) => Effect.promise(runtime.dispose),
    )
    yield* eventually(() => expect(container.querySelector('#open-time')).not.toBeNull())
    return container
  })

it.live('date and color popup names honor custom trigger IDs and explicit names', () =>
  Effect.gen(function* () {
    for (const [custom, explicit] of [
      [false, false],
      [true, false],
      [true, true],
    ] as const) {
      yield* Effect.scoped(
        Effect.gen(function* () {
          yield* mount(custom, explicit)
          const date = document.querySelector('#date-popup')
          expect(date?.getAttribute('role')).toBe('dialog')
          expect(date?.getAttribute('aria-labelledby')).toBe('custom-date-trigger')
          expect(document.getElementById('custom-date-trigger')?.textContent).toContain(
            'Choose a date',
          )
          const color = document.querySelector('#color [role="dialog"]')
          expect(color).not.toBeNull()
          if (explicit) {
            expect(color?.getAttribute('aria-label')).toBe('Custom palette')
            expect(color?.hasAttribute('aria-labelledby')).toBe(false)
          } else {
            const triggerId = custom ? 'custom-color-trigger' : 'color-trigger'
            expect(color?.getAttribute('aria-labelledby')).toBe(triggerId)
            expect(document.getElementById(triggerId)?.textContent).toBe('Theme color')
          }
        }),
      )
    }
  }),
)

it.live('an opened time popup uses its input label rather than the positioning wrapper text', () =>
  Effect.gen(function* () {
    const container = yield* mount(false, false)
    container.querySelector<HTMLButtonElement>('#open-time')?.click()
    yield* eventually(() => {
      const popup = document.querySelector('#start-time-popup')
      expect(popup?.getAttribute('role')).toBe('dialog')
      expect(popup?.getAttribute('aria-label')).toBe('Start time')
      expect(popup?.hasAttribute('aria-labelledby')).toBe(false)
    })
  }),
)
