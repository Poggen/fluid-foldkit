import { expect, it as test } from '@effect/vitest'
import { Cause, Effect, Exit, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { defineMessageUnion } from 'foldkit/message'
import { ScrollAreaBlock, layer as ScrollLayer } from '../src/scroll-area.js'
import { ScrollAreaModel } from '../src/scroll-area-state.js'
import { HoverBlock, layer as HoverLayer } from '../src/hover.js'

const Mode = Schema.Literals(['callback', 'nested', 'ordinary'])

const Model = Schema.Struct({ mode: Mode, scroll: ScrollAreaModel, hover: HoverBlock.Model })

const Message = defineMessageUnion({})

const effects = Block.makeEffectsContract()

export const DropdownScrollFixtureKey = Symbol('DropdownScrollFixture')

const DropdownScrollFixture = Block.make('DropdownScrollFixture', {
  key: DropdownScrollFixtureKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([Mode]),
  view: { kind: 'Document' },
  effects,
})

const FluidDropdownScrollFixtureDefinition = DropdownScrollFixture

const Scroll = FluidDropdownScrollFixtureDefinition.makeRequiredFieldBinding(ScrollAreaBlock, {
  field: 'scroll',
  init: { contextToArgs: () => [{ id: 'scroll-content' }] },
}).withOutMessagePolicy({
  fold: FluidDropdownScrollFixtureDefinition.makeOutMessageFold(ScrollAreaBlock, {
    Scrolled: () => FluidDropdownScrollFixtureDefinition.makeNoopStep(),
  }),
})

const Hover = FluidDropdownScrollFixtureDefinition.makeRequiredFieldBinding(HoverBlock, {
  field: 'hover',
  init: { contextToArgs: () => [{ id: 'mounted-child' }] },
}).withOutMessagePolicy({
  fold: FluidDropdownScrollFixtureDefinition.makeOutMessageFold(HoverBlock, {
    Changed: () => FluidDropdownScrollFixtureDefinition.makeNoopStep(),
  }),
})

const FluidDropdownScrollFixtureComposition = FluidDropdownScrollFixtureDefinition.makeComposition({
  bindings: [Scroll, Hover],
})

const DropdownScrollFixtureLayer = DropdownScrollFixture.makeLayer({
  init: FluidDropdownScrollFixtureComposition.makeInit(
    (mode: 'callback' | 'nested' | 'ordinary') => ({ model: { mode }, childInitContext: mode }),
  ),
  update: FluidDropdownScrollFixtureComposition.makeUpdate({}),
  view: FluidDropdownScrollFixtureComposition.makeView((model, h) => {
    const { mode } = model

    const mountedChild = () =>
      h.block(
        Hover.embedView({
          slotId: model.hover.id,
          model: model.hover,
          viewInputs: { content: () => [h.span([], ['Mounted row'])] },
        }),
      )

    return {
      title: 'Scroll content',
      body: h.block(
        Scroll.embedView({
          slotId: model.scroll.id,
          model: model.scroll,
          viewInputs:
            mode === 'callback'
              ? { children: [], content: () => [mountedChild()] }
              : {
                  children: mode === 'nested' ? [mountedChild()] : [h.span([], ['Ordinary row'])],
                },
        }),
      ),
    }
  }),
}).pipe(Layer.provide(Layer.merge(ScrollLayer, HoverLayer)))

const render = (mode: 'callback' | 'nested' | 'ordinary') =>
  renderToString(
    { block: DropdownScrollFixture, layer: DropdownScrollFixtureLayer },
    { Flags: Mode },
    { flags: mode, isHydratable: true, buildId: 'scroll-content-fixture' },
  )

test.effect('a mounted checked child renders through the top-level Scroll content capability', () =>
  Effect.gen(function* rendersMountedContent() {
    expect((yield* render('callback')).html).toContain('Mounted row')
    expect((yield* render('callback')).html).toContain('id="mounted-child"')
    expect((yield* render('ordinary')).html).toContain('Ordinary row')
  }),
)

test.effect('a nested function-bearing VNode still fails the existing ViewInputs guard', () =>
  Effect.gen(function* rejectsNestedFunctionContent() {
    const exit = yield* Effect.exit(render('nested'))
    expect(Exit.isFailure(exit)).toBe(true)

    if (Exit.isFailure(exit)) {
      expect(Cause.pretty(exit.cause)).toContain('viewInputs.children')
    }
  }),
)
