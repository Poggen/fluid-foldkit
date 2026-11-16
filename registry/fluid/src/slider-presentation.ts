import type { SliderConfig } from './slider-state.js'
import { sliderSettings } from './slider-state.js'

/** Project an inherited size into checked settings before configuring a bound Slider. */
export function sliderPresentationSettings(
  config: SliderConfig,
  inheritedSize: 'default' | 'compact',
) {
  return sliderSettings({ ...config, size: config.size ?? inheritedSize })
}
