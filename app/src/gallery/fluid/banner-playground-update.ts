import { FluidGalleryBlock } from './block'
import type { Configuration } from '../../playground/configs/banner'
import type { ComponentPresentation } from '../../settings'
export const reconcileBanner = (_config: Configuration, _presentation: ComponentPresentation) =>
  FluidGalleryBlock.makeStep((model) => ({ model }))
