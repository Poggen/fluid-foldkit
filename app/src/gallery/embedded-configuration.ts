import { Option, Schema } from 'effect'
import type { ComponentPage } from '../../../lib/catalogue'
import {
  configurationForPage,
  decodeConfiguration,
  PlaygroundConfiguration,
} from '../playground/configuration'
import { editedConfigurationFields } from '../playground/configuration-acceptance'
import type { PreviewOptions } from '../playground/options'

const equal = Schema.toEquivalence(PlaygroundConfiguration)
const record = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Only configuration DTOs enter this merge. Arrays are atomic controlled properties;
// object fields (including appearance and chart options) retain independent input semantics.
const mergeLocation = (previous: unknown, next: unknown, accepted: unknown): unknown => {
  if (JSON.stringify(previous) === JSON.stringify(next)) return accepted
  if (!record(previous) || !record(next) || !record(accepted)) return next
  const keys = new Set([...Object.keys(previous), ...Object.keys(next), ...Object.keys(accepted)])
  return Object.fromEntries(
    [...keys].flatMap((key): ReadonlyArray<readonly [string, unknown]> => {
      if (!(key in next) && key in previous) return []
      if (!(key in next)) return [[key, accepted[key]]]
      return [[key, mergeLocation(previous[key], next[key], accepted[key])]]
    }),
  )
}

export const configurationForEmbeddedPage = (
  page: ComponentPage,
  options: PreviewOptions,
): PlaygroundConfiguration => {
  const decoded =
    options.configuration === undefined ? Option.none() : decodeConfiguration(options.configuration)
  if (Option.isSome(decoded)) {
    const candidate = decoded.value
    if ((candidate._tag === 'chart' ? candidate.slug : candidate._tag) === page.slug)
      return candidate
  }
  return configurationForPage(page, options)
}

type LocationConfiguration =
  | {
      readonly configuration: PlaygroundConfiguration
      readonly intent: 'initialize'
      readonly edited?: never
    }
  | {
      readonly configuration: PlaygroundConfiguration
      readonly intent: 'reconcile'
      readonly edited: ReadonlyArray<string>
    }

export const reconcileEmbeddedLocation = (
  previous: Option.Option<PlaygroundConfiguration>,
  next: PlaygroundConfiguration,
  accepted: Option.Option<PlaygroundConfiguration>,
): LocationConfiguration => {
  if (Option.isNone(previous) || Option.isNone(accepted) || previous.value._tag !== next._tag)
    return { configuration: next, intent: 'initialize' }
  if (previous.value._tag === 'chart' && next._tag === 'chart' && previous.value.slug !== next.slug)
    return { configuration: next, intent: 'initialize' }
  if (equal(previous.value, next))
    return { configuration: accepted.value, edited: [], intent: 'reconcile' }
  // Decode/normalize the merged public DTO before any owning Model changes. Each field
  // comes from a validated same-family configuration; never fall back by discarding local state.
  const configuration = Option.getOrThrow(
    decodeConfiguration(JSON.stringify(mergeLocation(previous.value, next, accepted.value))),
  )
  return {
    configuration,
    edited: editedConfigurationFields(accepted.value, configuration),
    intent: 'reconcile',
  }
}
