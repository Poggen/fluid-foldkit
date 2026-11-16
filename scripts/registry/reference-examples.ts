import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { componentPages } from '../../lib/catalogue.ts'
import { root } from './config.ts'
import type { Family } from './config.ts'

export const compositionSources = (family: Family, slug: string) => {
  if (!componentPages.some((page) => page.family === family && page.slug === slug)) return []
  const chartFamily = [
    'gauge',
    'line',
    'area',
    'bar',
    'composed',
    'scatter',
    'candlestick',
  ].includes(slug)
    ? 'cartesian'
    : ['pie', 'ring', 'radar', 'funnel', 'heatmap', 'live-line'].includes(slug)
      ? 'polar'
      : ['sunburst', 'sankey', 'choropleth'].includes(slug)
        ? 'flows'
        : 'companions'
  const files =
    family === 'fluid'
      ? [
          'gallery/fluid/block.ts',
          'gallery/fluid/composition.ts',
          'gallery/fluid/index.ts',
          'gallery/fluid/core-bindings.ts',
          'gallery/fluid/core-view.ts',
          'gallery/fluid/details-bindings.ts',
          'gallery/fluid/details-view.ts',
          'gallery/fluid/interactive-bindings.ts',
          'gallery/fluid/interactive-view.ts',
          'gallery/fluid/dates-bindings.ts',
          'gallery/fluid/dates-view.ts',
          'gallery/flags.ts',
          'gallery/fluid/settings.ts',
          'gallery/fluid/configuration-update.ts',
          'gallery/fluid/configuration-reset.ts',
          'gallery/fluid/configuration-presentation.ts',
          'gallery/fluid/configured-view.ts',
          'reference/control.ts',
          'reference/control-bindings.ts',
          'playground/configuration-acceptance.ts',
          'reference/authored.ts',
          'reference/accordion-data.ts',
          'gallery/fluid/core-content-view.ts',
          'playground/configuration.ts',
          'playground/control-definition.ts',
          'playground/configs/presentation.ts',
          `playground/configs/${slug}.ts`,
          ...['view', 'update']
            .map((part) => `gallery/fluid/${slug}-playground-${part}.ts`)
            .filter((file) => existsSync(path.join(root, 'app/src', file))),
        ]
      : [
          `gallery/${chartFamily}.ts`,
          `gallery/${chartFamily === 'companions' ? 'companion' : chartFamily === 'flows' ? 'flow' : chartFamily}-definitions.ts`,
          ...(chartFamily === 'companions' ? [] : [`playground/${chartFamily}.ts`]),
        ]
  return files.map((file) => ({
    path: `showcase/${file}`,
    content: readFileSync(path.join(root, 'app/src', file), 'utf8'),
  }))
}
