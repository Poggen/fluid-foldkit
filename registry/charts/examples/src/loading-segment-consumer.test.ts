// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment node
import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { it as effectIt } from '@effect/vitest'
import { expect } from 'vitest'
import {
  PublicLoadingSegmentConsumerBlock,
  PublicLoadingSegmentConsumerLayer,
  FocusReplay,
} from './loading-segment-consumer'

type LoadingModel = typeof PublicLoadingSegmentConsumerBlock.Model.Type
const subject = {
  block: PublicLoadingSegmentConsumerBlock,
  layer: PublicLoadingSegmentConsumerLayer,
}

effectIt.effect(
  'keeps loading data independent and emits the focus command after conceal completion',
  () =>
    Story.story(
      subject,
      Story.init({ reducedMotion: false }),
      Story.model((model) => {
        expect(model.placeholder.data).toHaveLength(0)
        expect(model.placeholder.configuration.status).toBe('loading')
        expect(model.placeholder.phase).toBe('loading')
        expect(model.line.data).toHaveLength(3)
      }),
      Story.models(
        Story.steps(
          Story.message(PublicLoadingSegmentConsumerBlock.Message.ClickedPlaceholderReady()),
        ),
        (before: LoadingModel, after) => {
          expect(after.placeholder.configuration.status).toBe('ready')
          expect(after.placeholder.phase).toBe('ready')
          expect(after.placeholder.data).toBe(before.placeholder.data)
          expect(after.line).toBe(before.line)
        },
      ),
      Story.models(
        Story.steps(
          Story.message(PublicLoadingSegmentConsumerBlock.Message.ClickedPlaceholderLoading()),
        ),
        (before: LoadingModel, after) => {
          expect(after.placeholder.phase).toBe('loading')
          expect(after.placeholder.data).toBe(before.placeholder.data)
        },
      ),
      Story.message(PublicLoadingSegmentConsumerBlock.Message.ClipConcealed()),
      Story.Command.expectExact(FocusReplay()),
      Story.Command.resolve(
        FocusReplay,
        PublicLoadingSegmentConsumerBlock.Message.CompletedFocusReplay(),
      ),
      Story.model((model) => expect(model.placeholder.phase).toBe('ready')),
      Story.Command.expectNone(),
    ),
)

effectIt.effect(
  'routes focus through the line Binding while keeping the loading child independent',
  () =>
    Story.story(
      subject,
      Story.init({ reducedMotion: false }),
      Story.models(
        Story.steps(
          Story.models(
            Story.steps(
              Story.message(PublicLoadingSegmentConsumerBlock.Message.ClickedFocusLast()),
            ),
            (before: LoadingModel, after) => {
              expect(Option.getOrNull(after.line.focusedIndex)).toBe(2)
              expect(after.placeholder).toBe(before.placeholder)
            },
          ),
          Story.message(PublicLoadingSegmentConsumerBlock.Message.ClickedClearFocus()),
        ),
        (before: LoadingModel, after) => {
          expect(Option.isNone(after.line.focusedIndex)).toBe(true)
          expect(after.line.data).toBe(before.line.data)
        },
      ),
      Story.Command.expectNone(),
    ),
)

const Model = Schema.Struct({ consumer: PublicLoadingSegmentConsumerBlock.Model })

effectIt.effect(
  'initializes independent sweep occurrences and directs standalone requests to its Binding',
  () =>
    Story.story(
      subject,
      Story.init({ reducedMotion: true }),
      Story.model((model) => {
        expect(model.standaloneSweep.reducedMotion).toBe(true)
        expect(model.contextSweep.reducedMotion).toBe(true)
        expect(model.standaloneSweep).not.toBe(model.contextSweep)
      }),
      Story.models(
        Story.steps(Story.message(PublicLoadingSegmentConsumerBlock.Message.ClickedSweepExit())),
        (before: LoadingModel, after) => {
          expect(after.standaloneSweep.configuration.mode).toBe('exit')
          expect(after.contextSweep).toBe(before.contextSweep)
          expect(after.sweepCompletions).toBe(0)
        },
      ),
      Story.Command.expectNone(),
    ),
)

export const PublicLoadingSegmentServerHostKey = Symbol('PublicLoadingSegmentServerHost')

const PublicLoadingSegmentServerHostBlock = Block.make('PublicLoadingSegmentServerHost', {
  key: PublicLoadingSegmentServerHostKey,
  Model,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const Binding = PublicLoadingSegmentServerHostBlock.makeRequiredFieldBinding(
  PublicLoadingSegmentConsumerBlock,
  {
    field: 'consumer',
    init: { contextToArgs: () => [{ reducedMotion: false }] },
  },
)

const PublicLoadingSegmentServerHostComposition =
  PublicLoadingSegmentServerHostBlock.makeComposition({ bindings: [Binding] })

const PublicLoadingSegmentServerHostLayer = PublicLoadingSegmentServerHostBlock.makeLayer({
  init: PublicLoadingSegmentServerHostComposition.makeInit(() => ({ model: {} })),
  update: PublicLoadingSegmentServerHostComposition.makeUpdate({}),
  view: PublicLoadingSegmentServerHostComposition.makeView((model, h) => ({
    title: 'Public loading consumer',
    body: h.div([], [h.block(Binding.embedView({ slotId: 'consumer', model: model.consumer }))]),
  })),
}).pipe(Layer.provide(PublicLoadingSegmentConsumerLayer))

effectIt.effect('renders the normal package consumer through a genuine nested parent Binding', () =>
  Effect.gen(function* publicConsumerServerContract() {
    const { html } = yield* renderToString(
      { block: PublicLoadingSegmentServerHostBlock, layer: PublicLoadingSegmentServerHostLayer },
      {},
      { isHydratable: false },
    )

    expect(html).toContain('data-bkm-native-chart="public-loading-bar"')
    expect(html).toContain('data-bkm-native-chart="public-loading-line"')
    expect(html).toContain('line-loading-gradient-public-first-pulse')
    expect(html).toContain('line-loading-gradient-public-second-pulse')
    expect(html).toContain('id="public-loading-clip"')
    expect(html).toContain('Loading preview')
    expect(html).toContain('Placeholder loading; rows 0; cycles 0; epoch 0; focus none')
    expect(html).toContain('75, 23, 53, 42')
  }),
)
