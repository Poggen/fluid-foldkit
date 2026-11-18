import { expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Cause, Effect, Exit, Layer, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { defineMessageUnion } from 'foldkit/message'
import { Badge } from '../src/badge.js'
import { Button } from '../src/button.js'
import { Elevated } from '../src/elevated.js'
import {
  PresentationProviderBlock,
  test as providerTest,
  layer as ProviderLayer,
} from '../src/fluid-provider.js'
import type { PresentationProviderConfig } from '../src/fluid-provider.js'
import { popupShape, shapeMap } from '../src/lib/shape.js'
import { defaultIcons } from '../src/icons.js'
import { createPresentationContext, resolvePresentation } from '../src/presentation.js'
import * as Presentation from '../src/presentation-context.js'

test('explicit native context preserves source inheritance, provider resets and partial icon resets', () => {
  const inherited = createPresentationContext({
    shape: 'pill',
    size: 'compact',
    surface: 4,
    icons: { ...defaultIcons, x: defaultIcons.check, info: defaultIcons.star },
  })

  expect(resolvePresentation({ context: inherited }).size.controlHeight).toBe(28)
  expect(
    resolvePresentation({ context: inherited, shape: 'rounded', size: 'default' }).shape.bgRadius,
  ).toBe(8)
  expect(Presentation.useSizeVariant(inherited, null)).toBe('compact')
  expect(Presentation.useTypeScale(inherited)).toEqual({
    display: 24,
    title: 15,
    subtitle: 13,
    body: 12,
    caption: 11,
    micro: 10,
  })
  Presentation.ShapeProvider({
    context: inherited,
    children: (context) => {
      expect(context().shape).toBe('rounded')
      expect(context().size).toBe('compact')

      return null
    },
  })
  Presentation.SizeProvider({
    context: inherited,
    children: (context) => {
      expect(context().size).toBe('default')
      expect(context().shape).toBe('pill')

      return null
    },
  })
  Presentation.IconProvider({
    context: inherited,
    icons: { x: defaultIcons.plus },
    children: (context) => {
      expect(Presentation.useIcons(context).x).toBe(defaultIcons.plus)
      expect(Presentation.useIcons(context).info).toBe(defaultIcons.info)
      expect(context().size).toBe('compact')

      return null
    },
  })
  Presentation.FluidProvider({
    context: inherited,
    children: (context) => {
      expect(context().shape).toBe('rounded')
      expect(context().size).toBe('default')
      expect(context().surface).toBe(4)
      expect(context().reducedMotion).toBe('user')

      return null
    },
  })
  Presentation.SurfaceProvider({
    value: 3.5,
    children: (context) => {
      expect(Presentation.useSurface(context)).toBe(3.5)

      return null
    },
  })
  expect(() => Presentation.useShapeContext(undefined, (appearance) => appearance)).toThrow(
    'within a ShapeProvider',
  )
  expect(() => Presentation.useSizeContext(createPresentationContext(), (size) => size)).toThrow(
    'within a SizeProvider',
  )
})

test.effect(
  'controlled size ignores writes, releases to unchanged local state and survives JSON/public-operation replay',
  () =>
    Effect.gen(function* providerReplay() {
      const subject = { block: PresentationProviderBlock, layer: ProviderLayer }
      const codec = Schema.fromJsonString(PresentationProviderBlock.Model)
      const replay = (model: typeof PresentationProviderBlock.Model.Type) =>
        Schema.decodeSync(codec)(Schema.encodeSync(codec)(model))
      const initial = yield* Story.story(
        subject,
        Story.init({ id: 'sizes', defaultSize: 'default', size: 'compact' }),
      )
      const controlled = yield* Story.story(
        subject,
        Story.given(replay(initial)),
        Story.inMessage(PresentationProviderBlock.InMessage.RequestedSize({ size: 'compact' })),
        Story.model((model) => {
          expect(model.localSize).toBe('default')
        }),
      )
      const released = yield* Story.story(
        subject,
        Story.given(replay(controlled)),
        Story.inMessage(
          PresentationProviderBlock.InMessage.RequestedControlledSize({ size: null }),
        ),
      )
      const compact = yield* Story.story(
        subject,
        Story.given(replay(released)),
        Story.inMessage(PresentationProviderBlock.InMessage.RequestedSize({ size: 'compact' })),
        Story.model((model) => {
          expect(model.localSize).toBe('compact')
        }),
      )
      const shaped = yield* Story.story(
        subject,
        Story.given(replay(compact)),
        Story.inMessage(PresentationProviderBlock.InMessage.RequestedShape({ shape: 'pill' })),
        Story.Command.expectExact(
          providerTest.PublishShape({ id: 'sizes', shape: 'pill', publishRadius: true }),
        ),
        Story.Command.resolve(
          providerTest.PublishShape,
          PresentationProviderBlock.Message.PublishedShape(),
        ),
        Story.model((model) => {
          expect(model.shape).toBe('pill')
        }),
      )
      const reset = yield* Story.story(
        subject,
        Story.given(replay(shaped)),
        Story.inMessage(PresentationProviderBlock.InMessage.RequestedReset()),
        Story.model((model) => {
          expect(model.shape).toBe('rounded')
          expect(model.localSize).toBe('default')
        }),
      )
      yield* Story.story(
        subject,
        Story.given(reset),
        Story.message(
          PresentationProviderBlock.Message.CapturedPreference({
            value: true,
            mountGeneration: shaped.mountGeneration,
          }),
        ),
        Story.model((model) => {
          expect(model.prefersReducedMotion).toBe(false)
        }),
        Story.message(
          PresentationProviderBlock.Message.CapturedPreference({
            value: true,
            mountGeneration: reset.mountGeneration,
          }),
        ),
        Story.model((model) => {
          expect(model.prefersReducedMotion).toBe(true)
        }),
      )
      yield* Story.story(
        subject,
        Story.init({ id: 'shape-only', mode: 'shape' }),
        Story.inMessage(PresentationProviderBlock.InMessage.RequestedSize({ size: 'compact' })),
        Story.model((model) => {
          expect(model.localSize).toBe('default')
        }),
      )
    }),
)

const Model = Schema.Struct({ provider: PresentationProviderBlock.Model })

const Message = defineMessageUnion({ Noop: {} })

export const PresentationServerKey = Symbol('PresentationServer')

const PresentationServerBlock = Block.make('PresentationServer', {
  key: PresentationServerKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const Provider = PresentationServerBlock.makeRequiredFieldBinding(PresentationProviderBlock, {
  field: 'provider',
  init: {
    contextToArgs: () =>
      [{ id: 'server-provider', defaultShape: 'pill', defaultSize: 'compact' }] satisfies [
        PresentationProviderConfig,
      ],
  },
})

const PresentationServerComposition = PresentationServerBlock.makeComposition({
  bindings: [Provider],
})

const init = PresentationServerComposition.makeInit(() => ({ model: {} }))

const update = PresentationServerComposition.makeUpdate({
  Noop: PresentationServerBlock.makeNoopStep(),
})

const view = PresentationServerComposition.makeView((model, h) => ({
  title: 'Presentation SSR',
  body: h.block(
    Provider.embedView({
      slotId: model.provider.id,
      model: model.provider,
      viewInputs: {
        tag: 'main',
        content: (context) => [
          Button({ context, children: ['Inherited'] }, h),
          Badge({ context, children: ['Compact pill'] }, h),
          Elevated(
            {
              context,
              offset: 4,
              shadowLevel: 3,
              children: (raised) => [
                Elevated(
                  {
                    context: raised,
                    offset: 9,
                    children: (nested) => [
                      h.p(
                        [h.DataAttribute('surface', String(Presentation.useSurface(nested)))],
                        ['Raised'],
                      ),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ],
      },
    }),
  ),
}))

const ServerLayer = PresentationServerBlock.makeLayer({ init, update, view }).pipe(
  Layer.provide(ProviderLayer),
)

test.effect(
  'native provider SSR renders inherited controls and raised shells without browser resource acquisition',
  () =>
    Effect.gen(function* serverRendersProvider() {
      const exit = yield* Effect.exit(
        renderToString(
          { block: PresentationServerBlock, layer: ServerLayer },
          {},
          { isHydratable: true, buildId: 'presentation-test' },
        ),
      )

      if (Exit.isFailure(exit)) {
        throw new Error(Cause.pretty(exit.cause), { cause: exit.cause })
      }

      const result = exit.value
      expect(result.html).toContain('<main ')
      expect(result.html).toContain('rounded-[20px]')
      expect(result.html).toContain('h-7')
      expect(result.html).toContain('bg-surface-5 shadow-surface-3')
      expect(result.html).toContain('bg-surface-8 shadow-surface-8')
      expect(result.html).toContain('data-surface="8"')
    }),
)

test('sharp surfaces retain one pixel corners and popup shapes cap pill at rounded', () => {
  const context = createPresentationContext({ shape: 'sharp', hoverMode: 'standard' })
  expect(resolvePresentation({ context }).shape).toBe(shapeMap.sharp)
  expect(shapeMap.sharp.bgRadius).toBe(1)
  expect(shapeMap.sharp.containerRadius).toBe(1)
  expect(shapeMap.sharp.mergedRadius).toBe(1)
  expect(shapeMap.sharp.focusRing).toBe('rounded-[3px]')
  expect(Presentation.usePopupShape(context)).toBe(shapeMap.sharp)
  expect(popupShape('pill')).toBe(shapeMap.rounded)
  expect(resolvePresentation({ context }).hoverMode).toBe('standard')
  expect(resolvePresentation().shape).toBe(shapeMap.rounded)
  expect(resolvePresentation().hoverMode).toBe('fluid')
})
