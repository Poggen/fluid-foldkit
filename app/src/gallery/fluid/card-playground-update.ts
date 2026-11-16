import { fluidHoverEnabledOf } from '@foldkit-visuals/fluid/card'
import { Update } from 'foldkit'
import type { Configuration } from '../../playground/configs/card'
import type { ComponentPresentation } from '../../settings'
import { FluidGalleryBlock } from './block'
import { CardGroup } from './core-bindings'
export const reconcileCard = (config: Configuration, _presentation: ComponentPresentation) =>
  FluidGalleryBlock.makeStep((model) =>
    Update.combineSteps(
      fluidHoverEnabledOf(model.cardGroup) === config.fluidHover
        ? []
        : [CardGroup.requestFluidHover({ enabled: config.fluidHover })],
    ),
  )
