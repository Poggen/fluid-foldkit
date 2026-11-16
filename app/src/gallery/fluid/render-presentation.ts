import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import type { FluidGalleryInputs } from './block'
import type { FluidGalleryBlock } from './block'
export const demoPresentation = (
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hoverMode: FluidGalleryInputs['settings']['hover'],
) =>
  createPresentationContext({
    shape,
    size,
    hoverMode,
    surface: 1,
    hasShapeProvider: true,
    hasSizeProvider: true,
    reducedMotion: 'user',
  })
export interface CoreEvents {
  readonly press: typeof FluidGalleryBlock.Message.Refreshed
  readonly pick: typeof FluidGalleryBlock.Message.PickedCarousel
  readonly hovered: typeof FluidGalleryBlock.Message.HoveredCarousel
  readonly copy: typeof FluidGalleryBlock.Message.RequestedCopyBanner
  readonly dismiss: typeof FluidGalleryBlock.Message.DismissedBanner
}
