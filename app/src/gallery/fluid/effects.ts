import { Effect, Schema } from 'effect'
import { SiteEnvironment } from '../../environment'
import { FluidGalleryBlock } from './block'
export const WaitBeforeRestoreBanner = FluidGalleryBlock.makeCommand('WaitBeforeRestoreBanner', {
  args: { generation: Schema.Natural },
  messages: [FluidGalleryBlock.Message.CompletedWaitBeforeRestoreBanner],
  *handler() {
    return ({ generation }) =>
      Effect.sleep('1200 millis').pipe(
        Effect.as(FluidGalleryBlock.Message.CompletedWaitBeforeRestoreBanner({ generation })),
      )
  },
})
export const CopyBanner = FluidGalleryBlock.makeCommand('CopyBanner', {
  messages: [FluidGalleryBlock.Message.CompletedCopyBanner],
  *handler() {
    const environment = yield* SiteEnvironment
    return () =>
      environment
        .copy('bunx shadcn@4.23.0 add @fluid-foldkit/banner')
        .pipe(Effect.map((success) => FluidGalleryBlock.Message.CompletedCopyBanner({ success })))
  },
})
