import { it } from '@effect/vitest'
import { Effect, Result } from 'effect'
import { Story } from 'foldkit'
import { toParentMessageFor } from 'foldkit/test'
import { expect } from 'vitest'
import { prepareGalleryFlags } from './flags'
import { GalleryBlock, layer, test } from './block'
import { defaults } from '../playground/configs/input-message'
import { componentPresentation, defaults as settings } from '../settings'
import { ComposerSamplesQuery } from '../reference/message-assets-query'

const file = { id: 'sample', name: 'sample.pdf', type: 'application/pdf', size: 1, lastModified: 0 }
it.effect(
  'disabling attachment samples cancels their pending query and ignores late completion',
  () =>
    Effect.gen(function* () {
      const flags = yield* prepareGalleryFlags
      yield* Story.withBlock({ block: GalleryBlock, layer }, (gallery) => {
        const configuration = (attachments: boolean) =>
          GalleryBlock.InMessage.InformedOfConfiguration({
            configuration: { ...defaults, attachments },
            presentation: componentPresentation(settings),
          })
        const initial = gallery.init(flags).model
        const configured = gallery.inMessageUpdate(initial, configuration(true)).model
        const disabled = gallery.inMessageUpdate(configured, configuration(false)).model
        const completed = gallery.update(
          disabled,
          toParentMessageFor(gallery)(
            test.ComposerSamples,
            ComposerSamplesQuery.Message.CompletedFetch({
              generation: configured.composerSamples.generation,
              result: Result.succeed([file]),
            }),
          ),
        ).model
        expect(completed.fluid.composer.files).toEqual([])
      })
    }),
)
