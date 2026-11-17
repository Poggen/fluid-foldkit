import { it } from '@effect/vitest'
import { Effect, Option } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { prepareGalleryFlagsFor } from '../gallery/flags'
import { decodeConfiguration } from '../playground/configuration'
import * as Tooltip from '../playground/configs/tooltip'
import { componentPresentation, defaults } from '../settings'
import { ComponentReferenceBlock } from './block'
import { layer } from './layer'

const oldUrl = {
  _tag: 'tooltip',
  appearance: { shape: 'sharp' },
  label: 'Saved tooltip label',
  triggerLabel: 'Saved trigger',
  side: 'right',
  sideOffset: 17,
  delayDuration: 750,
  followCursor: 'y',
}

it.effect('old tagged Tooltip URLs preserve caller values through reference initialization', () =>
  Effect.gen(function* () {
    const flags = yield* prepareGalleryFlagsFor({ configuration: JSON.stringify(oldUrl) })
    yield* Story.withBlock({ block: ComponentReferenceBlock, layer }, (reference) =>
      Effect.sync(() => {
        const model = reference.init(
          '/components/tooltip',
          flags,
          componentPresentation(defaults),
        ).model
        expect(model.configuration).toEqual({
          ...oldUrl,
          presentation: 'independent',
          hoverable: true,
          shortcut: '',
        })
      }),
    )
  }),
)

it.effect(
  'explicit invalid Tooltip URL fields reject instead of acquiring missing-key defaults',
  () =>
    Effect.gen(function* () {
      for (const changed of [
        { presentation: 'unknown' },
        { hoverable: 'false' },
        { shortcut: 42 },
      ]) {
        const serialized = JSON.stringify({ ...oldUrl, ...changed })
        expect(Option.isNone(decodeConfiguration(serialized))).toBe(true)
        const flags = yield* prepareGalleryFlagsFor({ configuration: serialized })
        yield* Story.withBlock({ block: ComponentReferenceBlock, layer }, (reference) =>
          Effect.sync(() => {
            const model = reference.init(
              '/components/tooltip',
              flags,
              componentPresentation(defaults),
            ).model
            expect(model.configuration).toEqual(Tooltip.defaults)
          }),
        )
      }
    }),
)
