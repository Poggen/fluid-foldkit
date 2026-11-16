import { sunProps, sankeyProps, mapProps } from '../gallery/flow-definitions'
import type { PreviewOptions } from './options'
const build = (options: PreviewOptions) => ({
  sun: { ...sunProps, size: typeof options.size === 'number' ? options.size : sunProps.size },
  sankey: {
    ...sankeyProps,
    aspectRatio: options.aspectRatio ?? sankeyProps.aspectRatio,
    nodeWidth: options.nodeWidth ?? 12,
    nodePadding: options.nodePadding ?? 12,
  },
  map: { ...mapProps, zoomEnabled: options.zoomEnabled ?? true, scale: options.scale ?? 50 },
})
const cache = new WeakMap<PreviewOptions, ReturnType<typeof build>>()
export const flowPreview = (options: PreviewOptions) => {
  const prior = cache.get(options)
  if (prior) return prior
  const value = build(options)
  cache.set(options, value)
  return value
}
