import { CarouselDotsBlock } from './carousel-dots-native.js'
export { CarouselDotsBlock, CarouselDotsKey, InMessage, layer } from './carousel-dots-native.js'
export type { CarouselDotsProps } from './carousel-dots-native.js'

export {
  CarouselClock,
  advanceCarousel,
  carouselClock,
  carouselFillAt,
} from './carousel-dots-state.js'
export type { CarouselDotsAutoplay, CarouselDotsConfig } from './carousel-dots-state.js'

export {
  CarouselDotsResources,
  CarouselDotsResourcesServerLayer,
  CarouselDotsResourcesDefaultLayer,
  makeCarouselDotsResourcesLayer,
  CarouselObservation,
} from './carousel-dots-resources.js'
export type { CarouselProgress, CarouselCapabilities } from './carousel-dots-resources.js'

export const hoverModeOf = (model: typeof CarouselDotsBlock.Model.Type) => model.hover.mode
