// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { expect, describe, vi } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Layer, Option, Schema } from 'effect'
import { Story } from 'foldkit'
import { TabsBlock, layer } from '../src/tabs.js'
import { SynchronizeSelection } from '../src/tabs-selection-effects.js'
import {
  acquireSelectedPill,
  SelectedPillDrivers,
  SelectedPillDriversLayer,
  SelectedPillInitializer,
  readSelectedPillInitializer,
  selectedPillInitializerAttribute,
} from '../src/tabs-selected-pill-driver.js'
import { RetargetSelectedPill } from '../src/tabs-selected-pill-effects.js'
import { geometryFromEntries } from '../src/lib/indexed-geometry.js'

const items = [{ value: 'first' }, { value: 'disabled', disabled: true }, { value: 'last' }]

const settleUnmountedSelection = (id: string, selectedIndex: number, generation: number) =>
  Story.steps(
    Story.Command.expectExact(SynchronizeSelection({ id, selectedIndex, generation })),
    Story.Command.resolve(
      SynchronizeSelection({ id, selectedIndex, generation }),
      TabsBlock.Message.ObservedSelectionTabStop({
        selectedIndex,
        generation,
        index: Option.none(),
      }),
    ),
  )

describe('Tabs', () => {
  it.effect(
    'shortcut selection remains controlled, skips disabled items and preserves input focus',
    () =>
      Effect.gen(function* tabsCase1() {
        const model = yield* Story.story(
          { block: TabsBlock, layer },
          Story.init({ id: 'tabs', selectedIndex: 0 }),
          Story.inMessage(
            TabsBlock.InMessage.RequestedNavigate({
              direction: 'Right',
              items,
              focus: false,
            }),
          ),
          Story.expectOutMessage(TabsBlock.OutMessage.Selected({ index: 2 })),
          Story.Command.expectNone(),
        )

        expect(model.selectedIndex).toBe(0)
        const json = Schema.fromJsonString(TabsBlock.Model)
        const serialized = yield* Schema.encodeEffect(json)(model)
        const restored = yield* Schema.decodeEffect(json)(serialized)
        yield* Story.story(
          { block: TabsBlock, layer },
          Story.given(restored),
          Story.inMessage(TabsBlock.InMessage.RequestedSelected({ selectedIndex: 2 })),
          settleUnmountedSelection('tabs', 2, 1),
          Story.Command.expectNone(),
          Story.model((accepted) => {
            expect(accepted.selectedIndex).toBe(2)
          }),
        )
      }),
  )

  it.effect('RTL navigation reverses arrows and all-disabled lists emit no selection', () =>
    Story.story(
      { block: TabsBlock, layer },
      Story.init({ id: 'rtl-tabs', selectedIndex: 0, direction: 'rtl' }),
      Story.inMessage(
        TabsBlock.InMessage.RequestedNavigate({
          direction: 'Left',
          items: [{ value: 'first' }, { value: 'middle' }, { value: 'last' }],
          focus: false,
        }),
      ),
      Story.expectOutMessage(TabsBlock.OutMessage.Selected({ index: 1 })),
      Story.inMessage(
        TabsBlock.InMessage.RequestedNavigate({
          direction: 'Right',
          items: [{ value: 'only', disabled: true }],
          focus: false,
        }),
      ),
      Story.expectNoOutMessage(),
      Story.Command.expectNone(),
    ),
  )

  it.effect('interrupted label exits survive replay and reject old completion', () =>
    Effect.gen(function* tabsCase2() {
      const initial = yield* Story.story(
        { block: TabsBlock, layer },
        Story.init({ id: 'labels', selectedIndex: 0, activeLabel: true }),
        Story.message(
          TabsBlock.Message.CapturedItems({
            items: [0, 1, 2].map((index) => ({
              index,
              disabled: false,
              collapsible: true,
              width: Option.some(50 + index * 10),
            })),
          }),
        ),
      )

      const exiting = yield* Story.story(
        { block: TabsBlock, layer },
        Story.given(initial),
        Story.inMessage(TabsBlock.InMessage.RequestedSelected({ selectedIndex: 2 })),
        settleUnmountedSelection('labels', 2, 1),
        Story.Command.expectNone(),
      )

      const old = exiting.labels.find((slot) => slot.index === 0)

      if (old === undefined) {
        throw new Error('Missing exiting label')
      }

      const json = Schema.fromJsonString(TabsBlock.Model)
      const serialized = yield* Schema.encodeEffect(json)(exiting)
      const restored = yield* Schema.decodeEffect(json)(serialized)
      yield* Story.story(
        { block: TabsBlock, layer },
        Story.given(restored),
        Story.inMessage(TabsBlock.InMessage.RequestedSelected({ selectedIndex: 0 })),
        settleUnmountedSelection('labels', 0, 2),
        Story.Command.expectNone(),
        Story.message(
          TabsBlock.Message.CompletedLabelExit({ index: 0, generation: old.generation }),
        ),
        Story.model((model) => {
          expect(model.labels.find((slot) => slot.index === 0)?.phase).toBe('Present')
        }),
      )
    }),
  )
})

describe('Tabs lifecycle', () => {
  it.effect(
    'shortcut selection remains controlled, skips disabled items and preserves input focus',
    () =>
      Effect.gen(function* tabsCase3() {
        const model = yield* Story.story(
          { block: TabsBlock, layer },
          Story.init({ id: 'tabs', selectedIndex: 0 }),
          Story.inMessage(
            TabsBlock.InMessage.RequestedNavigate({
              direction: 'Right',
              items,
              focus: false,
            }),
          ),
          Story.expectOutMessage(TabsBlock.OutMessage.Selected({ index: 2 })),
          Story.Command.expectNone(),
        )

        expect(model.selectedIndex).toBe(0)
        const json = Schema.fromJsonString(TabsBlock.Model)
        const serialized = yield* Schema.encodeEffect(json)(model)
        const restored = yield* Schema.decodeEffect(json)(serialized)
        expect(restored).toEqual(model)
      }),
  )

  it.effect('RTL navigation reverses arrows and all-disabled lists emit no selection', () =>
    Story.story(
      { block: TabsBlock, layer },
      Story.init({ id: 'rtl-tabs', selectedIndex: 0, direction: 'rtl' }),
      Story.inMessage(
        TabsBlock.InMessage.RequestedNavigate({
          direction: 'Left',
          items: [{ value: 'first' }, { value: 'middle' }, { value: 'last' }],
          focus: false,
        }),
      ),
      Story.expectOutMessage(TabsBlock.OutMessage.Selected({ index: 1 })),
      Story.inMessage(
        TabsBlock.InMessage.RequestedNavigate({
          direction: 'Right',
          items: [{ value: 'only', disabled: true }],
          focus: false,
        }),
      ),
      Story.expectNoOutMessage(),
      Story.Command.expectNone(),
    ),
  )
})

const BaseModelJson = Schema.fromJsonString(Schema.toCodecJson(TabsBlock.Model))

it.live(
  'real retarget commands reject restored leases and stale revisions without moving a replacement owner',
  () =>
    Story.withBlock({ block: TabsBlock, layer }, (tabs) =>
      Effect.gen(function* selectedPillLease() {
        const handlers = yield* Layer.build(
          Layer.merge(tabs.EffectsLayer, RetargetSelectedPill.layer).pipe(
            Layer.provideMerge(SelectedPillDriversLayer),
          ),
        )

        const drivers = yield* Effect.provide(SelectedPillDrivers, handlers)
        const element = document.createElement('div')
        document.body.append(element)
        const origin = { left: 0, top: 0, width: 100, height: 36, opacity: 1 }
        const destination = { ...origin, left: 100 }

        const originInitializer = yield* Schema.encodeEffect(SelectedPillInitializer)({
          target: origin,
          revision: 0,
          policy: 'always',
        })

        const destinationInitializer = yield* Schema.encodeEffect(SelectedPillInitializer)({
          target: destination,
          revision: 1,
          policy: 'always',
        })

        try {
          element.setAttribute(selectedPillInitializerAttribute, originInitializer)

          const retiredLease = yield* Effect.scoped(
            acquireSelectedPill(drivers, element, {
              id: 'leases',
              target: origin,
              revision: 0,
              policy: 'always',
            }).pipe(
              Effect.tap(() =>
                Effect.sync(() => {
                  element.setAttribute(selectedPillInitializerAttribute, destinationInitializer)
                }),
              ),
              Effect.map((driver) => driver.lease),
            ),
          )

          expect(element.style.left).toBe('100px')
          expect(Object.hasOwn(element.dataset, 'tabsPillLiveLease')).toBe(false)
          element.setAttribute(selectedPillInitializerAttribute, originInitializer)
          const freshInitializer = yield* readSelectedPillInitializer(element)

          const current = yield* acquireSelectedPill(drivers, element, {
            id: 'leases',
            ...freshInitializer,
          })

          expect(current.lease).not.toBe(retiredLease)
          const initial = tabs.init({ id: 'leases', selectedIndex: 0 }).model

          const snapshot = {
            ...initial,
            hover: {
              ...initial.hover,
              isMeasured: true,
              itemRects: geometryFromEntries([
                { index: 0, rect: origin },
                { index: 1, rect: destination },
              ]),
            },
            selectedPillLease: Option.some(retiredLease),
          }

          const serialized = yield* Schema.encodeEffect(BaseModelJson)(snapshot)
          const restored = yield* Schema.decodeEffect(BaseModelJson)(serialized)

          const requested = tabs.inMessageUpdate(
            restored,
            TabsBlock.InMessage.RequestedSelected({ selectedIndex: 1 }),
          )

          const oldCommand = requested.commands?.find((command) =>
            Option.isSome(Story.Command.argsOf(RetargetSelectedPill)(command)),
          )

          if (oldCommand === undefined) {
            throw new Error('Missing actual retarget command')
          }

          const oldArgs = Story.Command.argsOf(RetargetSelectedPill)(oldCommand)

          if (Option.isNone(oldArgs)) {
            throw new Error('Missing typed retarget arguments')
          }

          const refused = yield* Effect.provide(
            RetargetSelectedPill(oldArgs.value).effect,
            handlers,
          )

          expect(refused.applied).toBe(false)
          expect(element.style.left).toBe('0px')

          const acquired = tabs.update(
            requested.model,
            TabsBlock.Message.CapturedSelectedPillLease({ lease: current.lease }),
          )

          const liveCommand = acquired.commands?.find((command) =>
            Option.isSome(Story.Command.argsOf(RetargetSelectedPill)(command)),
          )

          if (liveCommand === undefined) {
            throw new Error('Missing fresh-lease command')
          }

          const liveArgs = Story.Command.argsOf(RetargetSelectedPill)(liveCommand)

          if (Option.isNone(liveArgs)) {
            throw new Error('Missing fresh typed arguments')
          }

          const accepted = yield* Effect.provide(
            RetargetSelectedPill(liveArgs.value).effect,
            handlers,
          )

          expect(accepted.applied).toBe(true)
          yield* Effect.promise(
            vi.waitFor.bind(
              vi,
              () => {
                expect(element.style.left).toBe('100px')
              },
              undefined,
            ),
          )

          const stale = yield* Effect.provide(
            RetargetSelectedPill({ ...liveArgs.value, revision: 0, target: origin }).effect,
            handlers,
          )

          const retired = yield* Effect.provide(
            RetargetSelectedPill({
              ...liveArgs.value,
              lease: retiredLease,
              revision: 100,
              target: origin,
            }).effect,
            handlers,
          )

          expect(stale.applied).toBe(false)
          expect(retired.applied).toBe(false)
          expect(element.style.left).toBe('100px')
        } finally {
          element.remove()
        }
      }),
    ),
)
