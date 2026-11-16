import { expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Cause, Effect, Exit, Layer, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { renderToString } from 'foldkit/experimental/server'
import { CarouselDotsBlock } from '../src/carousel-dots.js'
import { Paint } from '../src/carousel-dots-native.js'
import {
  Card,
  CardHeader,
  CardTitle,
  CardFooter,
  CardGroupBlock,
  CardGroupRefsServerLayer,
  layer as CardLayer,
} from '../src/card.js'
import type { CardGroupRefs } from '../src/card.js'
import { CardRefsBlock, CardRefsLayer } from './companion-ref-parent.js'
import {
  CompanionFixtureBlock,
  CompanionFixtureLayer,
  CompanionOptions,
} from './companion-parent.js'

const CardBoundaryKey = Symbol('CardBoundary')

const cardBoundaryEffects = Block.makeEffectsContract<never, CardGroupRefs>()

const CardBoundaryBlock = Block.make('CardBoundary', {
  key: CardBoundaryKey,
  Model: Schema.Struct({ group: CardGroupBlock.Model }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  effects: cardBoundaryEffects,
  view: { kind: 'Document' },
})

const Group = CardBoundaryBlock.makeRequiredFieldBinding(CardGroupBlock, {
  field: 'group',
  init: { contextToArgs: () => [{ id: 'group-owner' }] },
})

const CardBoundaryComposition = CardBoundaryBlock.makeComposition({ bindings: [Group] })

const CardBoundaryLayer = CardBoundaryBlock.makeLayer({
  init: CardBoundaryComposition.makeInit(() => ({ model: {} })),
  update: CardBoundaryComposition.makeUpdate({}),
  view: CardBoundaryComposition.makeView((model, h) => ({
    title: 'Card context ownership',
    body: h.div(
      [],
      [
        Card(
          {
            className: 'root-only-frame',
            attributes: [h.Id('card-owner'), h.DataAttribute('context-root', 'only')],
            children: (context) => [
              CardHeader(
                {
                  ...context,
                  children: [CardTitle({ ...context, children: ['Header title'] }, h)],
                },
                h,
              ),
              CardFooter({ ...context, children: ['Footer action'] }, h),
            ],
          },
          h,
        ),
        h.block(
          Group.embedView({
            slotId: 'group',
            model: model.group,
            viewInputs: {
              count: 1,
              className: 'group-only-layout',
              attributes: childAttributes([
                h.Id('group-owner'),
                h.DataAttribute('group-boundary', 'only'),
              ]),
              animateHighlight: (node) => node,
              children: (group) => [
                Card(
                  {
                    group,
                    index: 0,
                    children: () => [
                      CardHeader(
                        {
                          ...group,
                          children: [CardTitle({ ...group, children: ['Group title'] }, h)],
                        },
                        h,
                      ),
                      CardFooter({ ...group, children: ['Group footer'] }, h),
                    ],
                  },
                  h,
                ),
              ],
            },
          }),
        ),
      ],
    ),
  })),
}).pipe(Layer.provide(Layer.merge(CardLayer, CardGroupRefsServerLayer)))

test.effect('Card presentation context never forwards root identity or attributes into parts', () =>
  Effect.gen(function* cardContextOwnership() {
    const { html } = yield* renderToString(
      { block: CardBoundaryBlock, layer: CardBoundaryLayer },
      {},
      { isHydratable: false },
    )

    expect(html.match(/id="card-owner"/gu)).toHaveLength(1)
    expect(html.match(/data-context-root="only"/gu)).toHaveLength(1)
    expect(html.match(/root-only-frame/gu)).toHaveLength(1)
    expect(html).toContain('Header title')
    expect(html).toContain('Footer action')
  }),
)

test.effect(
  'CardGroup returned presentation context never forwards its root attributes into parts',
  () =>
    Effect.gen(function* cardGroupContextOwnership() {
      const { html } = yield* renderToString(
        { block: CardBoundaryBlock, layer: CardBoundaryLayer },
        {},
        { isHydratable: false },
      )

      expect(html.match(/id="group-owner"/gu)).toHaveLength(1)
      expect(html.match(/data-group-boundary="only"/gu)).toHaveLength(1)
      expect(html.match(/group-only-layout/gu)).toHaveLength(1)
      expect(html).toContain('Group title')
      expect(html).toContain('Group footer')
    }),
)

test.effect('nested Carousel requires client rendering at the pinned occurrence boundary', () =>
  Effect.gen(function* companionServer() {
    const result = yield* renderToString(
      { block: CompanionFixtureBlock, layer: CompanionFixtureLayer },
      { Flags: CompanionOptions },
      { flags: { count: 3 }, isHydratable: false },
    ).pipe(Effect.exit)

    expect(Exit.isFailure(result)).toBe(true)

    if (Exit.isFailure(result)) {
      expect(Cause.squash(result.cause)).toMatchObject({
        cause: {
          message: '[foldkit] Block binding "slides" emitted before its occurrence was captured.',
        },
      })
    }
  }),
)

test.effect('registered parent operations update only their declared child state', () =>
  Story.story(
    { block: CompanionFixtureBlock, layer: CompanionFixtureLayer },
    Story.init({ count: 3 }),
    Story.message(CompanionFixtureBlock.Message.Change()),
    Story.Command.resolve(Paint, CarouselDotsBlock.Message.Painted()),
    Story.model((model) => {
      expect(model.slides.clock.value).toBe(2)
      expect(model.slides.clock.progress).toBe(0.5)
      expect(model.lastSelected).toBe(-1)
    }),
    Story.message(CompanionFixtureBlock.Message.Resize()),
    Story.model((model) => {
      expect(model.file.size).toBe(96)
      expect(model.file.generation).toBe(0)
    }),
  ),
)

test.effect(
  'stateless Card and title preserve the parent ref mount contract during SSR without acquiring it',
  () =>
    Effect.gen(function* cardRefsServer() {
      const { html } = yield* renderToString(
        { block: CardRefsBlock, layer: CardRefsLayer },
        {},
        { isHydratable: false },
      )

      expect(html).toContain('Title with parent ref')
      expect(html).not.toContain('<button')
      expect(html).not.toContain('data-slot="card-media"')
      const model = yield* Story.story({ block: CardRefsBlock, layer: CardRefsLayer }, Story.init())
      expect(model.refs).toBe(0)
    }),
)

test.effect('empty nested Carousel has the same documented client-only boundary', () =>
  Effect.gen(function* emptyCarouselServer() {
    const result = yield* renderToString(
      { block: CompanionFixtureBlock, layer: CompanionFixtureLayer },
      { Flags: CompanionOptions },
      { flags: { count: 0 }, isHydratable: false },
    ).pipe(Effect.exit)

    expect(Exit.isFailure(result)).toBe(true)

    if (Exit.isFailure(result)) {
      expect(Cause.squash(result.cause)).toMatchObject({
        cause: {
          message: '[foldkit] Block binding "slides" emitted before its occurrence was captured.',
        },
      })
    }
  }),
)
