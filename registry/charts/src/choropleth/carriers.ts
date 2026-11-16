import type {
  ChoroplethFeatureProps,
  ChoroplethGraticuleProps,
  ChoroplethTooltipProps,
} from './types'

export type ChoroplethCarrier =
  | { readonly role: 'feature'; readonly props: ChoroplethFeatureProps }
  | { readonly role: 'graticule'; readonly props: ChoroplethGraticuleProps }
  | { readonly role: 'tooltip'; readonly props: ChoroplethTooltipProps }

export const ChoroplethFeatureComponent = (
  props: ChoroplethFeatureProps = {},
): ChoroplethCarrier => ({ role: 'feature', props })

export const ChoroplethGraticule = (props: ChoroplethGraticuleProps = {}): ChoroplethCarrier => ({
  role: 'graticule',
  props,
})

export const ChoroplethTooltip = (props: ChoroplethTooltipProps = {}): ChoroplethCarrier => ({
  role: 'tooltip',
  props,
})
