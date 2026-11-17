import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { BannerBlock, test as bannerTest } from '@foldkit-visuals/fluid/banner'
import { ThinkingStepsBlock } from '@foldkit-visuals/fluid/thinking-steps'
import { FluidGalleryBlock, layer } from '../gallery/fluid'
import { Steps } from '../gallery/fluid/details-bindings'
import { prepareGalleryFlags } from '../gallery/flags'
import { componentPresentation, defaults as settings } from '../settings'
import { defaults } from './configs/thinking-steps'
import { acceptConfiguration } from './configuration-acceptance'

const subject = { block: FluidGalleryBlock, layer }
it.effect('playground accepts real manual choices without adopting running-driven defaults', () =>
  Effect.gen(function* () {
    const flags = yield* prepareGalleryFlags
    const initial = yield* Story.story(
      subject,
      Story.init(flags),
      Story.Command.resolve(
        bannerTest.CaptureReducedMotion,
        BannerBlock.Message.CapturedReducedMotion({ value: false, mountGeneration: 0 }),
      ),
    )
    yield* Story.story(
      subject,
      Story.given(initial),
      Story.models(
        Story.steps(Story.messageIn(Steps, ThinkingStepsBlock.Message.Toggled())),
        (before, after) =>
          expect(acceptConfiguration(defaults, before, after)).toMatchObject({ open: false }),
      ),
    )
    const finished = { ...defaults, running: 'finished' as const }
    yield* Story.story(
      subject,
      Story.given(initial),
      Story.models(
        Story.steps(
          Story.inMessage(
            FluidGalleryBlock.InMessage.InformedOfConfiguration({
              configuration: finished,
              presentation: componentPresentation(settings),
              edited: ['running'],
            }),
          ),
        ),
        (before, after) => {
          expect(after.steps.open).toBe(false)
          expect(acceptConfiguration(finished, before, after)).toBe(finished)
        },
      ),
    )
  }),
)
