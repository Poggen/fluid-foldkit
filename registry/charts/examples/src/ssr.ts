import { Effect, Schema } from 'effect'
import { renderToString } from 'foldkit/experimental/server'
import { GaugeConfiguration } from '@foldkit-visuals/charts/gauge'
import fixtures from './fixtures.json'
import { ChartHydrationShowcaseBlock, ChartHydrationShowcaseLayer } from './hydration-root'

export const renderFixture = Effect.fn('Charts.renderFixture')(function* (fixture: string) {
  const selected = fixtures.find((candidate) => candidate.id === fixture)
  if (selected === undefined) throw new Error('Unknown chart fixture')
  const configuration = yield* Schema.decodeUnknownEffect(GaugeConfiguration)(selected.props)
  return yield* renderToString(
    { block: ChartHydrationShowcaseBlock, layer: ChartHydrationShowcaseLayer },
    { Flags: GaugeConfiguration },
    { flags: configuration, buildId: 'charts-hydration-v1' },
  )
})
export const renderPage = (fixture: string) => Effect.runPromise(renderFixture(fixture))
