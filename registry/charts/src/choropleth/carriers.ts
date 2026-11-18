import type {
  ChoroplethFeatureProps,
  ChoroplethGraticuleProps,
  ChoroplethTooltipProps,
} from './types'

export type ChoroplethCarrier =
  | { readonly role: 'feature'; readonly props: ChoroplethFeatureProps }
  | { readonly role: 'graticule'; readonly props: ChoroplethGraticuleProps }
  | { readonly role: 'tooltip'; readonly props: ChoroplethTooltipProps }

export const ChoroplethFeatureComponent: (props?: ChoroplethFeatureProps) => ChoroplethCarrier = (
  props: ChoroplethFeatureProps = {},
) => ({ role: 'feature', props }) satisfies ChoroplethCarrier

export const ChoroplethGraticule: (props?: ChoroplethGraticuleProps) => ChoroplethCarrier = (
  props: ChoroplethGraticuleProps = {},
) =>
  ({
    role: 'graticule',
    props,
  }) satisfies ChoroplethCarrier

export const ChoroplethTooltip: (props?: ChoroplethTooltipProps) => ChoroplethCarrier = (
  props: ChoroplethTooltipProps = {},
) =>
  ({
    role: 'tooltip',
    props,
  }) satisfies ChoroplethCarrier
