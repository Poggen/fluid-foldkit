// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom -- public Program, split tooltip views and real motion resources
import { it } from '@effect/vitest'
import { Effect, Layer, Schedule, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { childAttributes } from 'foldkit/html'
import { expect } from 'vitest'
import {
  DocumentTooltipBlock,
  layer as TooltipLayer,
  makeTooltipDomLayer,
} from '@foldkit-visuals/fluid/tooltip'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'

const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 100, schedule: Schedule.spaced('20 millis') }))
const Message = defineMessageUnion({ Open: {}, Close: {}, Refresh: {}, Selected: {}, Toggle: {} })
export const SplitTooltipKey = Symbol('SplitTooltipTest')
const Root = Block.make('SplitTooltipTest', {
  key: SplitTooltipKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    tooltips: DocumentTooltipBlock.Model,
    revision: Schema.Natural,
    clicks: Schema.Natural,
    shown: Schema.Boolean,
  }),
  Message,
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
const key = 'split-tooltip'

it.live('split views retain one tooltip lifetime and use current popup callbacks', () =>
  Effect.gen(function* splitTooltip() {
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
    const motion = createMotionScope('split-tooltip-test')
    const layer = Root.makeLayer({
      init: composition.makeInit(() => ({
        model: { revision: 0, clicks: 0, shown: true },
        steps: [Tooltips.requestAdd({ key, options: { delayDuration: 0 } })],
      })),
      update: composition.makeUpdate({
        Open: Tooltips.requestVisibility({ key, next: true, reason: 'application' }),
        Close: Tooltips.requestVisibility({ key, next: false, reason: 'application' }),
        Refresh: (model) => ({ model: { ...model, revision: model.revision + 1 } }),
        Selected: (model) => ({ model: { ...model, clicks: model.clicks + 1 } }),
        Toggle: (model) => ({ model: { ...model, shown: !model.shown } }),
      }),
      view: composition.makeView((model, h) => {
        const triggers = model.shown
          ? h.block(
              Tooltips.embedView({
                slotId: 'trigger-slot',
                model: model.tooltips,
                viewInputs: {
                  part: 'triggers',
                  render: ({ tooltip }) => h.div([], [tooltip(key)]),
                  renderTrigger: (_key, { button }) =>
                    button(
                      childAttributes([h.Id('split-trigger'), h.OnClick(Message.Selected())]),
                      ['Select'],
                    ),
                },
              }),
            )
          : h.empty
        const popups = model.shown
          ? h.block(
              Tooltips.embedView({
                slotId: 'popup-slot',
                model: model.tooltips,
                viewInputs: {
                  part: 'popups',
                  entries: [{ key, shapeClass: 'rounded-lg', reducedMotion: 'never' }],
                  animate: (node, options) =>
                    h.div(
                      [h.DataAttribute('animation-revision', String(model.revision))],
                      [motion.node(node, options)],
                    ),
                  renderContent: () => h.span([], [`Revision ${model.revision}`]),
                  renderPopups: (nodes) => h.div([], nodes),
                },
              }),
            )
          : h.empty
        return h.div(
          [],
          [
            h.button([h.Id('split-open'), h.OnClick(Message.Open())], ['Open']),
            h.button([h.Id('split-close'), h.OnClick(Message.Close())], ['Close']),
            h.button([h.Id('split-refresh'), h.OnClick(Message.Refresh())], ['Refresh']),
            h.button([h.Id('split-toggle'), h.OnClick(Message.Toggle())], ['Toggle']),
            h.output([h.Id('split-clicks')], [String(model.clicks)]),
            triggers,
            popups,
          ],
        )
      }),
    }).pipe(Layer.provide(TooltipLayer))
    const host = document.createElement('div')
    host.id = 'split-tooltip-host'
    document.body.append(host)
    const program = Runtime.embed(
      Program.makeElement({ block: Root, layer, container: host }).provide(
        Layer.merge(motion.layer, makeTooltipDomLayer(document, window)),
      ),
    )
    const click = (id: string) => {
      const element = document.getElementById(id)
      if (element === null) throw new Error(`Missing ${id}`)
      element.click()
    }
    const popup = () => document.getElementById(`${key}-popup`)

    try {
      yield* eventually(() => expect(document.getElementById('split-trigger')).not.toBeNull())
      const trigger = document.getElementById('split-trigger')
      expect(popup()).toBeNull()
      click('split-refresh')
      yield* eventually(() => {
        expect(document.getElementById('split-trigger')).toBe(trigger)
      })
      click('split-trigger')
      yield* eventually(() => {
        expect(document.getElementById('split-clicks')?.textContent).toBe('1')
      })
      click('split-open')
      yield* eventually(() => expect(popup()?.textContent).toBe('Revision 1'))
      const opened = popup()
      click('split-refresh')
      yield* eventually(() => {
        expect(popup()).toBe(opened)
        expect(popup()?.textContent).toBe('Revision 2')
        expect(popup()?.querySelector('[data-animation-revision="2"]')).not.toBeNull()
      })
      click('split-close')
      yield* eventually(() => {
        expect(popup()).toBe(opened)
        expect(popup()?.dataset.state).toBe('closed')
      })
      click('split-open')
      yield* eventually(() => {
        expect(popup()).toBe(opened)
        expect(popup()?.dataset.state).toBe('open')
      })
      click('split-close')
      yield* eventually(() => expect(popup()).toBeNull())
      click('split-open')
      yield* eventually(() => expect(popup()).not.toBeNull())
      click('split-toggle')
      yield* eventually(() => {
        expect(document.getElementById('split-trigger')).toBeNull()
        expect(popup()).toBeNull()
      })
      click('split-toggle')
      yield* eventually(() => {
        expect(document.getElementById('split-trigger')?.dataset.state).toBe('closed')
        expect(popup()).toBeNull()
      })
    } finally {
      yield* Effect.promise(program.dispose)
      host.remove()
    }
    expect(popup()).toBeNull()
  }),
)
