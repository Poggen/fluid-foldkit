// @vitest-environment happy-dom -- real public Program and Tooltip DOM resource boundary
import { TooltipStoryLayer } from './tooltip-story-services.js'
import { it } from '@effect/vitest'
import { Effect, Layer, Option, Schedule, Schema } from 'effect'
import { Block, Program, Runtime, Story } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { expect } from 'vitest'
import {
  DocumentTooltipBlock,
  layer as TooltipLayer,
  makeTooltipDomLayer,
} from '@foldkit-visuals/fluid/tooltip'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'

const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 50, schedule: Schedule.spaced('20 millis') }))

export const TooltipPublicKey = Symbol('TooltipPublicTest')

const Root = Block.make('TooltipPublicTest', {
  key: TooltipPublicKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ tooltips: DocumentTooltipBlock.Model }),
  Message: Schema.Never,
  view: { kind: 'Element' },
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof DocumentTooltipBlock>['programRequirements']
  >(),
})

const Tooltips = Root.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'tooltips',
  init: { contextToArgs: () => [] },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(DocumentTooltipBlock, { Transaction: () => Root.makeNoopStep() }),
})
const composition = Root.makeComposition({ bindings: [Tooltips] })
const keys = ['enabled', 'aria', 'disabled']
const id = (key: string) => `tooltip-public-${key}`

it.live('opens a compound aria-disabled trigger and preserves native disabled suppression', () =>
  Effect.gen(function* publicTooltip() {
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')

        if (descriptor === undefined || !Reflect.deleteProperty(Element.prototype, 'animate')) {
          throw new Error('Tooltip test requires scoped WAAPI capability removal')
        }

        return descriptor
      }),
      (descriptor) =>
        Effect.sync(() => Object.defineProperty(Element.prototype, 'animate', descriptor)),
    )
    const motion = createMotionScope('tooltip-public')
    const init = composition.makeInit(() => ({
      model: {},
      steps: keys.map((key) =>
        Tooltips.requestAdd({
          key: id(key),
          options: { delayDuration: 0 },
        }),
      ),
    }))
    const view = composition.makeView((model, h) =>
      h.block(
        Tooltips.embedView({
          slotId: 'tooltip-public',
          model: model.tooltips,
          viewInputs: {
            renderTrigger: (key, { button }) =>
              button(
                childAttributes([
                  h.Id(`${key}-trigger`),
                  ...(key === id('aria') ? [h.AriaDisabled(true)] : []),
                  ...(key === id('disabled') ? [h.Disabled(true)] : []),
                ]),
                [h.span([], ['Explanation'])],
              ),
            renderDocument: (content, popups) => h.div([], [content, ...popups]),
            render: ({ tooltip }) =>
              h.div(
                [],
                keys.map((key) =>
                  tooltip(id(key), {
                    content: `Explanation for ${key}`,
                    shapeClass: 'rounded-lg',
                    animate: motion.node,
                    reducedMotion: 'always',
                  }),
                ),
              ),
          },
        }),
      ),
    )
    const layer = Root.makeLayer({ init, update: composition.makeUpdate({}), view }).pipe(
      Layer.provide(TooltipLayer),
    )
    const host = document.createElement('div')
    const container = document.createElement('div')
    container.id = 'tooltip-public'
    host.append(container)
    document.body.append(host)
    const program = Runtime.embed(
      Program.makeElement({ block: Root, layer, container }).provide(
        Layer.merge(motion.layer, makeTooltipDomLayer(document, window)),
      ),
    )
    const trigger = (key: string) => {
      const element = document.getElementById(`${id(key)}-trigger`)

      if (element === null) {
        throw new Error(`Missing ${key} trigger`)
      }

      return element
    }
    const move = (key: string) => {
      const label = trigger(key).querySelector('span')

      if (label === null) {
        throw new Error(`Missing ${key} label`)
      }

      trigger(key).dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
      label.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' }))
    }
    const popup = (key: string) => document.getElementById(`${id(key)}-popup`)

    try {
      yield* eventually(() => {
        expect(trigger('enabled').isConnected).toBe(true)
      })
      yield* eventually(() => {
        move('enabled')
        expect(popup('enabled')?.textContent).toBe('Explanation for enabled')
      })
      trigger('enabled').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
      yield* eventually(() => {
        expect(popup('enabled')).toBeNull()
      })
      move('disabled')
      yield* eventually(() => {
        move('aria')
        expect(popup('aria')?.textContent).toBe('Explanation for aria')
      })
      expect(popup('disabled')).toBeNull()
      trigger('aria').dispatchEvent(
        new PointerEvent('pointerleave', {
          pointerType: 'mouse',
          clientX: 1,
          clientY: 1,
        }),
      )
      document.body.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerType: 'mouse',
          clientX: 100,
          clientY: 100,
        }),
      )
      yield* eventually(() => {
        expect(popup('aria')).toBeNull()
      })
    } finally {
      yield* Effect.promise(program.dispose)
      host.remove()
    }
    expect(document.querySelector('[data-tooltip-popup^="tooltip-public-"]')).toBeNull()
  }),
)

it.effect(
  'bare and explicitly shared Tooltip providers preserve their authored cooldown defaults and overrides',
  () =>
    Effect.gen(function* cooldowns() {
      const subject = { block: DocumentTooltipBlock, layer: TooltipLayer }
      const cases: ReadonlyArray<{
        readonly key: string
        readonly groupKey?: string
        readonly skipDelayDuration?: number
        readonly expected: number
      }> = [
        { key: 'bare', expected: 400 },
        { key: 'shared', groupKey: 'provider', expected: 300 },
        { key: 'bare-custom', skipDelayDuration: 75, expected: 75 },
        { key: 'shared-custom', groupKey: 'custom-provider', skipDelayDuration: 75, expected: 75 },
      ]
      for (const entry of cases) {
        const groupKey = entry.groupKey ?? `local:${entry.key}`
        const cooling = yield* Story.story(
          subject,
          Story.init(),
          Story.inMessage(
            DocumentTooltipBlock.InMessage.RequestedAdd({
              key: entry.key,
              ...(entry.groupKey === undefined ? {} : { groupKey: entry.groupKey }),
              ...(entry.skipDelayDuration === undefined
                ? {}
                : { group: { skipDelayDuration: entry.skipDelayDuration } }),
            }),
          ),
          Story.inMessage(
            DocumentTooltipBlock.InMessage.RequestedVisibility({
              key: entry.key,
              next: true,
              reason: 'focus',
            }),
          ),
          Story.inMessage(
            DocumentTooltipBlock.InMessage.RequestedVisibility({
              key: entry.key,
              next: false,
              reason: 'blur',
            }),
          ),
          Story.model((model) => {
            const clock = model.clocks[groupKey]
            if (!clock) throw new Error(`Missing Tooltip provider clock for ${entry.key}`)
            expect(Option.getOrThrow(clock.pending).delay).toBe(entry.expected)
          }),
        )
        const clock = cooling.clocks[groupKey]
        if (!clock) throw new Error(`Missing Tooltip provider clock for ${entry.key}`)
        const previousGeneration = Option.getOrThrow(clock.pending).generation
        yield* Story.story(
          subject,
          Story.given(cooling),
          Story.inMessage(
            DocumentTooltipBlock.InMessage.RequestedGroup({ groupKey, skipDelayDuration: 25 }),
          ),
          Story.model((model) => {
            const rearmed = model.clocks[groupKey]
            if (!rearmed) throw new Error(`Missing reconfigured provider ${groupKey}`)
            expect(Option.getOrThrow(rearmed.pending)).toEqual({
              delay: 25,
              generation: previousGeneration + 1,
            })
          }),
          Story.inMessage(
            DocumentTooltipBlock.InMessage.RequestedGroup({ groupKey, skipDelayDuration: 0 }),
          ),
          Story.model((model) => {
            const canceled = model.clocks[groupKey]
            const provider = model.groups[groupKey]
            if (!canceled || !provider) throw new Error(`Missing zero-timeout provider ${groupKey}`)
            expect(Option.isNone(canceled.pending)).toBe(true)
            expect(Option.isNone(provider.active)).toBe(true)
            expect(provider.cooldownGeneration).toBe(previousGeneration + 2)
          }),
          Story.Command.expectNone(),
        )
      }
    }).pipe(Effect.provide(TooltipStoryLayer)),
)
