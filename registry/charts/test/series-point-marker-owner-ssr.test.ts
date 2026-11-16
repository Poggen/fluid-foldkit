import { Effect } from 'effect'
import { renderToString } from 'foldkit/experimental/server'
import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { Story } from 'foldkit'
import { PublicConsumer } from '../examples/src/series-point-marker-public-consumer'

it.effect('public parent Binding preserves signed zero and NaN epoch requests', () =>
  Story.story(
    PublicConsumer,
    Story.init(),
    Story.message(PublicConsumer.block.Message.RequestedEpoch({ epoch: -0 })),
    Story.model((model) =>
      expect(Object.is(model.marker.configuration.revealEpoch, -0)).toBe(true),
    ),
    Story.message(PublicConsumer.block.Message.RequestedEpoch({ epoch: Number.NaN })),
    Story.model((model) =>
      expect(Object.is(model.marker.configuration.revealEpoch, Number.NaN)).toBe(true),
    ),
  ),
)

it.effect('public SSR paints outline, core, ring without acquiring browser resources', () =>
  Effect.gen(function* seriesMarkerPublicSSR() {
    const { html } = yield* renderToString(PublicConsumer, {}, { isHydratable: false })

    const radii = [...html.matchAll(/<circle\b[^>]*>/gu)].map(
      (match) => /\br="(?<radius>[^"]*)"/u.exec(match[0])?.groups?.radius,
    )

    expect(radii).toEqual(['11', '5', '8'])
    expect(html).toContain('translate(24, 48)')
  }),
)
