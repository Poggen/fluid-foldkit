import {
  pieProps,
  ringProps,
  radarProps,
  funnelProps,
  heatProps,
  liveProps,
} from '../gallery/polar-definitions'
import type { PreviewOptions } from './options'
const build = (options: PreviewOptions) => ({
  pie: { ...pieProps, innerRadius: options.innerRadius ?? pieProps.innerRadius },
  ring: {
    ...ringProps,
    strokeWidth: options.strokeWidth ?? 16,
    ringGap: options.ringGap ?? 8,
    baseInnerRadius: options.baseInnerRadius ?? 30,
  },
  radar: {
    ...radarProps,
    children: radarProps.children.filter((_, index) => index !== 2 || options.showLabels !== false),
  },
  funnel: {
    ...funnelProps,
    edges: options.edges ?? 'curved',
    labelLayout: options.labelLayout ?? 'spread',
    orientation: options.orientation ?? funnelProps.orientation,
    showLabels: options.showLabels ?? true,
    showValues: options.showValue ?? true,
  },
  heat: { ...heatProps, aspectRatio: options.aspectRatio ?? heatProps.aspectRatio },
  live: { ...liveProps, style: { height: options.height ?? 210 } },
})
const cache = new WeakMap<PreviewOptions, ReturnType<typeof build>>()
export const polarPreview = (options: PreviewOptions) => {
  const prior = cache.get(options)
  if (prior) return prior
  const value = build(options)
  cache.set(options, value)
  return value
}
