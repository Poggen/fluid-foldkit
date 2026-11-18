// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Context, Effect, Exit, Fiber, Layer, Schema } from 'effect'
import { Block, Program, Runtime, Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { afterEach, expect, vi } from 'vitest'
import { defineMessageUnion } from 'foldkit/message'
import { Permissions } from 'happy-dom'
import { InputCopyBlock, InputCopyEvent, InMessage, layer } from '../src/input-copy.js'
import type { InputCopyConfig } from '../src/input-copy.js'
import { Copy, Expire } from '../src/input-copy-effects.js'
import { InputCopyResources, createInputCopyLayer } from '../src/input-copy-resources.js'

const subject = { block: InputCopyBlock, layer }

const ModelJson = Schema.fromJsonString(InputCopyBlock.Model)

const InputJson = Schema.fromJsonString(Schema.toCodecJson(InMessage))

const LifetimeMessage = defineMessageUnion({ Toggled: {} })

const InputCopyLifetimeKey = Symbol('InputCopyLifetime')

const lifetimeEffects = Block.makeEffectsContract<never, InputCopyResources>()

const InputCopyLifetimeBlock = Block.make('InputCopyLifetime', {
  key: InputCopyLifetimeKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ copy: InputCopyBlock.Model, visible: Schema.Boolean }),
  Message: LifetimeMessage,
  view: { kind: 'Element' },
  effects: lifetimeEffects,
})

const CopyBinding = InputCopyLifetimeBlock.makeRequiredFieldBinding(InputCopyBlock, {
  field: 'copy',
  init: {
    contextToArgs: () =>
      [{ id: 'physical-copy', value: 'physical value', variant: 'button' }] satisfies [
        InputCopyConfig,
      ],
  },
}).withOutMessagePolicy({
  fold: InputCopyLifetimeBlock.makeOutMessageFold(InputCopyBlock, {
    Events: () => InputCopyLifetimeBlock.makeNoopStep(),
  }),
})

const LifetimeComposition = InputCopyLifetimeBlock.makeComposition({ bindings: [CopyBinding] })

const lifetimeLayer = InputCopyLifetimeBlock.makeLayer({
  init: LifetimeComposition.makeInit(() => ({ model: { visible: true } })),
  update: LifetimeComposition.makeUpdate({
    Toggled: (model) => ({ model: modifyFields(model, { visible: (value) => !value }) }),
  }),
  view: LifetimeComposition.makeView((model, h) =>
    h.div(
      [],
      [
        h.button([h.Id('toggle-copy'), h.OnClick(LifetimeMessage.Toggled())], ['Toggle']),
        model.visible
          ? h.block(
              CopyBinding.embedView({
                slotId: 'copy',
                model: model.copy,
                viewInputs: {
                  animate: (node) => node,
                  tooltip: () => {
                    throw new Error('Button variant must not instantiate a tooltip')
                  },
                },
              }),
            )
          : h.empty,
      ],
    ),
  ),
}).pipe(Layer.provide(layer))

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it.effect(
  'disabled public requests do not copy and configuration survives a model/message round trip',
  () =>
    Effect.gen(function* () {
      const initial = yield* Story.story(
        subject,
        Story.init({ id: 'disabled-copy', value: 'previous', disabled: true }),
        Story.inMessage(InMessage.RequestedCopy()),
        Story.Command.expectNone(),
      )
      const request = InMessage.RequestedConfigure({
        value: 'accepted',
        disabled: false,
        variant: 'button',
        align: 'left',
      })
      const restoredInput = yield* Schema.encodeEffect(InputJson)(request).pipe(
        Effect.flatMap(Schema.decodeEffect(InputJson)),
      )
      const restoredModel = yield* Schema.encodeEffect(ModelJson)(initial).pipe(
        Effect.flatMap(Schema.decodeEffect(ModelJson)),
      )
      const configured = yield* Story.story(subject, Story.given(initial), Story.inMessage(request))
      yield* Story.story(
        subject,
        Story.given(restoredModel),
        Story.inMessage(restoredInput),
        Story.model((model) => {
          expect(model).toEqual(configured)
          expect(model.value).toBe('accepted')
          expect(model.rootRevision).toBe(1)
          expect(model.displayedVariant).toBe('button')
        }),
        Story.inMessage(InMessage.RequestedCopy()),
        Story.Command.expectExactInOrder(Copy({ value: 'accepted', lifetimeRevision: 0 })),
        Story.Command.resolve(
          Copy,
          InputCopyBlock.Message.CompletedCopy({ ok: true, lifetimeRevision: 0 }),
        ),
        Story.Command.expectExactInOrder(
          Expire({ id: 'disabled-copy', copyCount: 1, lifetimeRevision: 0 }),
        ),
        Story.Command.resolve(
          Expire,
          InputCopyBlock.Message.ExpiredResult({ copyCount: 1, lifetimeRevision: 0 }),
        ),
      )
    }),
)

it.effect(
  'real clipboard execution emits success and retains the old glyph until its own completion',
  () =>
    Effect.scoped(
      Effect.gen(function* () {
        const command = Copy({ value: 'public clipboard value', lifetimeRevision: 0 })
        const completion = yield* command.effect.pipe(
          Effect.provide(
            Copy.layer.pipe(Layer.provide(createInputCopyLayer(document, navigator, window))),
          ),
        )
        expect(yield* Effect.promise(navigator.clipboard.readText.bind(navigator.clipboard))).toBe(
          'public clipboard value',
        )
        yield* Story.story(
          subject,
          Story.init({ id: 'copy-success', value: 'public clipboard value' }),
          Story.inMessage(InMessage.RequestedCopy()),
          Story.Command.expectExactInOrder(command),
          Story.Command.resolve(command, completion),
          Story.expectOutMessage(
            InputCopyBlock.OutMessage.Events({
              events: [
                InputCopyEvent.cases.TooltipChanged.make({
                  enabled: true,
                  forceOpen: false,
                  content: 'Copied',
                }),
                InputCopyEvent.cases.Copied.make({}),
              ],
            }),
          ),
          Story.model((model) => {
            expect(model.status).toBe('copied')
            expect(model.tooltipState).toBe('suppressed')
            expect(model.displayed).toBe('idle')
            expect(model.exiting).toBe(true)
          }),
          Story.message(InputCopyBlock.Message.CapturedMount()),
          Story.model((model) => expect(model.status).toBe('copied')),
          Story.messageWith((model) =>
            InputCopyBlock.Message.CompletedGlyphExit({
              rootRevision: model.rootRevision,
              displayedCount: model.displayedCount,
              displayed: model.displayed,
              displayedVariant: model.displayedVariant,
            }),
          ),
          Story.model((model) => {
            expect(model.displayed).toBe('copied')
            expect(model.glyphInitial).toBe(true)
            expect(model.exiting).toBe(false)
          }),
          Story.Command.expectExactInOrder(
            Expire({ id: 'copy-success', copyCount: 1, lifetimeRevision: 0 }),
          ),
          Story.Command.resolve(
            Expire,
            InputCopyBlock.Message.ExpiredResult({ copyCount: 1, lifetimeRevision: 0 }),
          ),
        )
      }),
    ),
)

it.effect(
  'visible-tooltip presses report copied feedback while stale expiry and glyph generations cannot erase a newer result',
  () =>
    Story.story(
      subject,
      Story.init({ id: 'copy-generations', value: 'value' }),
      Story.inMessage(InMessage.InformedOfTooltipVisibility({ open: true })),
      Story.message(InputCopyBlock.Message.CapturedMount()),
      Story.message(InputCopyBlock.Message.CapturedPointerDown()),
      Story.inMessage(InMessage.RequestedCopy()),
      Story.Command.expectExactInOrder(Copy({ value: 'value', lifetimeRevision: 0 })),
      Story.Command.resolve(
        Copy,
        InputCopyBlock.Message.CompletedCopy({ ok: true, lifetimeRevision: 0 }),
      ),
      Story.inMessage(InMessage.RequestedCopy()),
      Story.Command.expectExactInOrder(
        Expire({ id: 'copy-generations', copyCount: 1, lifetimeRevision: 0 }),
        Copy({ value: 'value', lifetimeRevision: 0 }),
      ),
      Story.Command.resolve(
        Copy,
        InputCopyBlock.Message.CompletedCopy({ ok: false, lifetimeRevision: 0 }),
      ),
      Story.model((model) => {
        expect(model.tooltipState).toBe('copied')
        expect(model.copyCount).toBe(2)
        expect(model.status).toBe('error')
      }),
      Story.Command.expectExactInOrder(
        Expire({ id: 'copy-generations', copyCount: 1, lifetimeRevision: 0 }),
        Expire({ id: 'copy-generations', copyCount: 2, lifetimeRevision: 0 }),
      ),
      Story.models(
        Story.steps(
          Story.Command.resolve(
            Expire({ id: 'copy-generations', copyCount: 1, lifetimeRevision: 0 }),
            InputCopyBlock.Message.ExpiredResult({ copyCount: 1, lifetimeRevision: 0 }),
          ),
        ),
        (before, after) => expect(after).toBe(before),
      ),
      Story.inMessage(
        InMessage.RequestedConfigure({ value: 'value', disabled: false, variant: 'button' }),
      ),
      Story.models(
        Story.steps(
          Story.message(
            InputCopyBlock.Message.CompletedGlyphExit({
              rootRevision: 0,
              displayedCount: 0,
              displayed: 'idle',
              displayedVariant: 'icon',
            }),
          ),
        ),
        (before, after) => expect(after).toBe(before),
      ),
      Story.Command.resolve(
        Expire({ id: 'copy-generations', copyCount: 2, lifetimeRevision: 0 }),
        InputCopyBlock.Message.ExpiredResult({ copyCount: 2, lifetimeRevision: 0 }),
      ),
      Story.model((model) => {
        expect(model.status).toBe('idle')
        expect(model.tooltipState).toBe('suppressed')
      }),
      Story.message(InputCopyBlock.Message.CapturedEnter()),
      Story.model((model) => expect(model.tooltipState).toBe('idle')),
    ),
)

it.effect(
  'remount rejects pending clipboard and expiry completions from the retired lifetime',
  () =>
    Story.story(
      subject,
      Story.init({ id: 'copy-remount', value: 'value', variant: 'button' }),
      Story.message(InputCopyBlock.Message.CapturedMount()),
      Story.inMessage(InMessage.RequestedCopy()),
      Story.Command.resolve(
        Copy,
        InputCopyBlock.Message.CompletedCopy({ ok: true, lifetimeRevision: 0 }),
      ),
      Story.inMessage(InMessage.RequestedCopy()),
      Story.Command.expectExactInOrder(
        Expire({ id: 'copy-remount', copyCount: 1, lifetimeRevision: 0 }),
        Copy({ value: 'value', lifetimeRevision: 0 }),
      ),
      Story.message(InputCopyBlock.Message.CapturedMount()),
      Story.model((model) => {
        expect(model.value).toBe('value')
        expect(model.variant).toBe('button')
        expect(model.status).toBe('idle')
        expect(model.displayed).toBe('idle')
        expect(model.tooltipState).toBe('idle')
        expect(model.lifetimeRevision).toBe(1)
      }),
      Story.models(
        Story.steps(
          Story.Command.resolve(
            Copy,
            InputCopyBlock.Message.CompletedCopy({ ok: true, lifetimeRevision: 0 }),
          ),
          Story.Command.resolve(
            Expire,
            InputCopyBlock.Message.ExpiredResult({ copyCount: 1, lifetimeRevision: 0 }),
          ),
          Story.message(
            InputCopyBlock.Message.CompletedGlyphExit({
              rootRevision: 0,
              displayedCount: 0,
              displayed: 'idle',
              displayedVariant: 'button',
            }),
          ),
        ),
        (before, after) => expect(after).toBe(before),
      ),
    ),
)

it.effect(
  'handler construction is passive and denied clipboard without a legacy API cleans up its textarea',
  () =>
    Effect.scoped(
      Effect.gen(function* clipboardFallback() {
        const permissions = navigator.permissions
        if (!(permissions instanceof Permissions)) throw new Error('HappyDOM permissions required')
        const permission = yield* Effect.promise(() =>
          permissions.query({ name: 'clipboard-write' }),
        )
        const previous = permission.state
        permission.state = 'denied'
        const denied = vi.spyOn(navigator.clipboard, 'writeText')
        const created = vi.spyOn(document, 'createElement')
        const selected = vi.spyOn(HTMLTextAreaElement.prototype, 'select')

        try {
          yield* Story.withBlock(subject, (copy) =>
            Effect.scoped(
              Layer.build(
                copy.EffectsLayer.pipe(
                  Layer.provide(createInputCopyLayer(document, navigator, window)),
                ),
              ),
            ),
          )
          expect(created).not.toHaveBeenCalled()
          const context = yield* Layer.build(createInputCopyLayer(document, navigator, window))
          const resources = Context.get(context, InputCopyResources)
          expect('execCommand' in document).toBe(false)
          expect(yield* resources.copy('fallback value')).toBe(false)
          expect(denied).toHaveBeenCalledWith('fallback value')
          expect(created).toHaveBeenCalledExactlyOnceWith('textarea')
          const textarea = created.mock.results[0]?.value
          if (!(textarea instanceof HTMLTextAreaElement)) throw new Error('Real textarea required')
          expect(selected).toHaveBeenCalledOnce()
          expect(textarea.value).toBe('fallback value')
          expect(textarea.readOnly).toBe(true)
          expect(textarea.selectionStart).toBe(0)
          expect(textarea.selectionEnd).toBe(textarea.value.length)
          expect(textarea.isConnected).toBe(false)
          expect(document.querySelector('textarea')).toBeNull()
        } finally {
          permission.state = previous
        }
      }),
    ),
)

it.effect(
  'repeated copy windows restart at 2000ms and resource disposal cancels pending browser timers',
  () =>
    Effect.gen(function* resultTimerOwnership() {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      let completed = 0

      yield* Effect.scoped(
        Effect.gen(function* resultWindows() {
          const resources = yield* InputCopyResources

          const windowResult = () =>
            resources.waitForResultWindow('same-copy').pipe(
              Effect.tap(() =>
                Effect.sync(() => {
                  completed += 1
                }),
              ),
            )

          const first = yield* Effect.forkScoped(windowResult())
          yield* Effect.yieldNow
          vi.advanceTimersByTime(1500)
          const second = yield* Effect.forkScoped(windowResult())
          yield* Effect.yieldNow
          expect(Exit.isFailure(yield* Fiber.await(first))).toBe(true)
          vi.advanceTimersByTime(1999)
          expect(completed).toBe(0)
          vi.advanceTimersByTime(1)
          yield* Fiber.join(second)
          expect(completed).toBe(1)
          yield* Effect.forkScoped(resources.waitForResultWindow('dispose-copy'))
          yield* Effect.yieldNow
          expect(vi.getTimerCount()).toBe(1)
        }).pipe(Effect.provide(createInputCopyLayer(document, navigator, window))),
      )

      expect(vi.getTimerCount()).toBe(0)
    }),
)

it.live('physical hide cancels its timer and remount starts with Source-fresh idle feedback', () =>
  Effect.gen(function* physicalCopyLifetime() {
    const container = document.createElement('div')
    container.id = 'input-copy-lifetime-root'
    const host = document.createElement('div')
    host.append(container)
    document.body.append(host)
    const scheduled = vi.spyOn(window, 'setTimeout')
    const cleared = vi.spyOn(window, 'clearTimeout')

    const handle = Runtime.embed(
      Program.makeElement({
        block: InputCopyLifetimeBlock,
        layer: lifetimeLayer,
        container,
      }).provide(createInputCopyLayer(document, navigator, window)),
    )

    const click = (id: string) => {
      const button = host.querySelector<HTMLButtonElement>(`#${id}`)

      if (button === null) {
        throw new Error(`Missing actual button ${id}`)
      }

      button.click()
    }

    try {
      yield* Effect.promise(
        vi.waitFor.bind(
          vi,
          () => {
            expect(host.querySelector('#physical-copy-button')).not.toBeNull()
          },
          undefined,
        ),
      )
      click('physical-copy-button')
      yield* Effect.promise(
        vi.waitFor.bind(
          vi,
          () => {
            expect(host.querySelector('#physical-copy-button')?.getAttribute('aria-label')).toBe(
              'Copied',
            )
          },
          undefined,
        ),
      )
      const timerIndex = scheduled.mock.calls.findIndex(([, delay]) => delay === 2000)
      expect(timerIndex).toBeGreaterThanOrEqual(0)
      const timer: unknown = scheduled.mock.results[timerIndex]?.value
      click('toggle-copy')
      yield* Effect.promise(
        vi.waitFor.bind(
          vi,
          () => {
            expect(host.querySelector('#physical-copy')).toBeNull()
            expect(cleared).toHaveBeenCalledWith(timer)
          },
          undefined,
        ),
      )
      click('toggle-copy')
      yield* Effect.promise(
        vi.waitFor.bind(
          vi,
          () => {
            expect(host.querySelector('#physical-copy-button')?.getAttribute('aria-label')).toBe(
              'Copy to clipboard',
            )
          },
          undefined,
        ),
      )
    } finally {
      yield* Effect.promise(handle.dispose.bind(handle))
      host.remove()
    }
  }),
)
