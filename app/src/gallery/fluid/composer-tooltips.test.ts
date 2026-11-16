import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { Story } from 'foldkit'
import { toParentMessageFor } from 'foldkit/test'
import { expect } from 'vitest'
import { InputMessageBlock, inputMessageTooltipEntries } from '@foldkit-visuals/fluid/input-message'
import { prepareGalleryFlags } from '../flags'
import { componentPresentation, defaults as settings } from '../../settings'
import { defaults } from '../../playground/configs/input-message'
import { FluidGalleryBlock, layer } from './index'
import { Composer } from './interactive-bindings'

const subject = { block: FluidGalleryBlock, layer }
const file = {
  id: 'sample/photo.png',
  name: 'photo.png',
  type: 'image/png',
  size: 10,
  lastModified: 1,
}
const fileKey = 'preview-composer-files-remove-sample%2Fphoto.png'
const configure = FluidGalleryBlock.InMessage.InformedOfConfiguration({
  configuration: defaults,
  presentation: componentPresentation(settings),
})

it.effect(
  'registers loaded attachment tooltips before rendering and preserves unrelated tooltips',
  () =>
    Effect.gen(function* () {
      const flags = yield* prepareGalleryFlags
      yield* Story.withBlock(subject, (gallery) => {
        const configured = gallery.inMessageUpdate(gallery.init(flags).model, configure).model
        const loaded = gallery.update(
          configured,
          FluidGalleryBlock.Message.InformedOfComposerSamples({ files: [file] }),
        ).model
        expect(inputMessageTooltipEntries(loaded.composer).map((entry) => entry.key)).toContain(
          fileKey,
        )
        expect(loaded.tooltips.rows[fileKey]).toBeDefined()
        for (const key of ['basic', 'copy', 'composer'])
          expect(loaded.tooltips.rows[key]).toBeDefined()
      })
    }),
)

it.effect(
  'registers captured attachment tooltips after the parent acknowledges the files event',
  () =>
    Effect.gen(function* () {
      const flags = yield* prepareGalleryFlags
      yield* Story.withBlock(subject, (gallery) => {
        const configured = gallery.inMessageUpdate(gallery.init(flags).model, configure).model
        const message = toParentMessageFor(gallery)(
          Composer,
          InputMessageBlock.Message.CapturedFiles({
            batchId: 'upload',
            files: [file],
          }),
        )
        const captured = gallery.update(configured, message).model
        expect(captured.composer.files).toEqual([file])
        expect(captured.tooltips.rows[fileKey]).toBeDefined()
      })
    }),
)
