export { ChoroplethChart, useChoroplethZoom } from './root'

export { ChoroplethFeatureComponent, ChoroplethTooltip, ChoroplethGraticule } from './carriers'

export { ChoroplethProvider, useChoropleth } from './context'

export type {
  ChoroplethChartProps,
  ChoroplethFeatureProps,
  ChoroplethTooltipProps,
  ChoroplethGraticuleProps,
  ChoroplethContextValue,
  ChoroplethFeature,
  ChoroplethFeatureProperties,
  ChoroplethTooltipData,
} from './types'

export type { TransformMatrix } from './zoom'

export type { SvgResource as ChoroplethSvgResource } from './resources'

export type { ChoroplethChartRecipe } from './root'

export type { Inputs as ChoroplethViewInputs } from './block'

export { choroplethContext } from './context'

export type { ChoroplethActions } from './context'

export type { ChoroplethZoomInstance } from './zoom'
