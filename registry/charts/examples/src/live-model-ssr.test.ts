import { Effect } from 'effect'
import { renderToString } from 'foldkit/experimental/server'
import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { liveModelExample } from './live-model-fixture'

it.effect(
  'server-renders the bound LiveLine fixture with its hydration identity and initial data',
  () =>
    Effect.gen(function* liveLineServerBoundary() {
      const { html } = yield* renderToString(
        liveModelExample(1793703293),
        {},
        { runtimeId: 'root', buildId: 'live-model-proof-v1' },
      )

      expect(html).toContain('data-foldkit-app="root"')
      expect(html).toContain('data-foldkit-build="live-model-proof-v1"')
      expect(html).toContain('data-bkm-native-chart="live-model"')
      expect(html).toContain('"rows":40')
      expect(html).toContain('"active":true')
    }),
)
