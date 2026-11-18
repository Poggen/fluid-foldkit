// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom -- Native registration requires browser class definitions before imports.
import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { expect } from 'vitest'
import { defineChartBrushBlock } from '../src/brush/block'
import { choroplethRecipe } from '../src/choropleth/block'
import { defineHeatmapRecipe } from '../src/heatmap/block'
import { defineLiveLineRecipe } from '../src/live-line/block'
import { polarRecipe } from '../src/pie/private/block'
import { sankeyRecipe } from '../src/sankey/block'
import { sunburstRecipe } from '../src/sunburst/block'

const checkRegistration = <R>(tag: string, handlers: Layer.Layer<R>) =>
  Effect.gen(function* () {
    expect(customElements.get(tag)).toBeUndefined()
    yield* Effect.scoped(Layer.build(handlers))
    const constructor = customElements.get(tag)
    expect(constructor).toBeDefined()
    if (constructor === undefined) throw new Error(`Missing native registration for ${tag}`)
    expect(document.createElement(tag)).toBeInstanceOf(constructor)
    yield* Effect.scoped(Layer.build(handlers))
    expect(customElements.get(tag)).toBe(constructor)
  })

const Row = Schema.Struct({ value: Schema.Finite })
const brush = defineChartBrushBlock({ name: 'registration-brush', Row })
const BrushKey = Symbol('Brush')
const Brush = Block.make(brush.namespace, { key: BrushKey, ...brush.contract })

it.effect('registers Brush before rendering and keeps graph acquisition passive', () =>
  Story.withBlock({ block: Brush, layer: Brush.makeLayer(brush.plans(Brush)) }, (acquired) =>
    checkRegistration('fk-bklit-registration-brush', acquired.EffectsLayer),
  ),
)

const choropleth = choroplethRecipe('registration-choropleth')
const ChoroplethKey = Symbol('Choropleth')
const Choropleth = Block.make(choropleth.namespace, {
  key: ChoroplethKey,
  ...choropleth.contract,
})

it.effect('registers Choropleth before rendering and keeps graph acquisition passive', () =>
  Story.withBlock(
    { block: Choropleth, layer: Choropleth.makeLayer(choropleth.plans(Choropleth)) },
    (acquired) => checkRegistration('fk-choropleth-registration-choropleth', acquired.EffectsLayer),
  ),
)

const heatmap = defineHeatmapRecipe('registration-heatmap')
const HeatmapKey = Symbol('Heatmap')
const Heatmap = Block.make(heatmap.namespace, { key: HeatmapKey, ...heatmap.contract })

it.effect('registers Heatmap before rendering and keeps graph acquisition passive', () =>
  Story.withBlock(
    { block: Heatmap, layer: Heatmap.makeLayer(heatmap.plans(Heatmap)) },
    (acquired) => checkRegistration('fk-heatmap-registration-heatmap', acquired.EffectsLayer),
  ),
)

const liveLine = defineLiveLineRecipe('registration-live-line')
const LiveLineKey = Symbol('LiveLine')
const LiveLine = Block.make(liveLine.namespace, { key: LiveLineKey, ...liveLine.contract })

it.effect('registers LiveLine before rendering and keeps graph acquisition passive', () =>
  Story.withBlock(
    { block: LiveLine, layer: LiveLine.makeLayer(liveLine.plans(LiveLine)) },
    (acquired) => checkRegistration('fk-liveline-registration-live-line', acquired.EffectsLayer),
  ),
)

const polar = polarRecipe({ name: 'registration-polar', Row })
const PolarKey = Symbol('Polar')
const Polar = Block.make(polar.namespace, { key: PolarKey, ...polar.contract })

it.effect('registers Polar before rendering and keeps graph acquisition passive', () =>
  Story.withBlock({ block: Polar, layer: Polar.makeLayer(polar.plans(Polar)) }, (acquired) =>
    checkRegistration('fk-polar-registration-polar', acquired.EffectsLayer),
  ),
)

const sankey = sankeyRecipe('registration-sankey')
const SankeyKey = Symbol('Sankey')
const Sankey = Block.make(sankey.namespace, { key: SankeyKey, ...sankey.contract })

it.effect('registers Sankey before rendering and keeps graph acquisition passive', () =>
  Story.withBlock({ block: Sankey, layer: Sankey.makeLayer(sankey.plans(Sankey)) }, (acquired) =>
    checkRegistration('fk-sankey-registration-sankey', acquired.EffectsLayer),
  ),
)

const sunburst = sunburstRecipe('registration-sunburst')
const SunburstKey = Symbol('Sunburst')
const Sunburst = Block.make(sunburst.namespace, { key: SunburstKey, ...sunburst.contract })

it.effect('registers Sunburst before rendering and keeps graph acquisition passive', () =>
  Story.withBlock(
    { block: Sunburst, layer: Sunburst.makeLayer(sunburst.plans(Sunburst)) },
    (acquired) => checkRegistration('fk-sunburst-registration-sunburst', acquired.EffectsLayer),
  ),
)
