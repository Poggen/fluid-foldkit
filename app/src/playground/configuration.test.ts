import * as Slider from './configs/slider'
import { expect, test } from 'vitest'
import { Option, Schema } from 'effect'
import { fluidPages } from '../../../lib/catalogue'
import {
  PlaygroundConfiguration,
  configurationForPage,
  decodeConfiguration,
  serializeConfiguration,
  configurationUrl,
  updateConfiguration,
} from './configuration'
import * as Breadcrumb from './configs/breadcrumb'
import { previewOptionsFromUrl } from './options'
import { settingsFromLocation } from '../settings'

test('every Fluid page has a distinct valid default and round-trips its configuration', () => {
  const tags = new Set<string>()
  for (const page of fluidPages) {
    const configuration = configurationForPage(page)
    expect(configuration._tag).toBe(page.slug)
    expect(Schema.is(PlaygroundConfiguration)(configuration)).toBe(true)
    expect(Option.getOrThrow(decodeConfiguration(serializeConfiguration(configuration)))).toEqual(
      configuration,
    )
    tags.add(configuration._tag)
  }
  expect(tags.size).toBe(fluidPages.length)
})

test('Breadcrumb edits enforce the page domain and preserve unrelated configuration', () => {
  const changed = updateConfiguration(Breadcrumb.defaults, 'steps', 2)
  expect(changed).toEqual({ ...Breadcrumb.defaults, steps: 2 })
  expect(updateConfiguration(changed, 'steps', 9)).toBe(changed)
  expect(updateConfiguration(changed, 'variant', 'scrubber')).toBe(changed)
  expect(
    Breadcrumb.visibleItems(changed._tag === 'breadcrumb' ? changed : Breadcrumb.defaults),
  ).toHaveLength(2)
  expect(Option.isNone(decodeConfiguration('{"_tag":"unknown"}'))).toBe(true)
})

test('tagged local overrides survive URL reload without changing root selections', () => {
  const local = Breadcrumb.Configuration.make({
    ...Breadcrumb.defaults,
    appearance: { size: 'compact', shape: 'pill', hover: 'standard' },
  })
  const url = `https://example.test/components/breadcrumb?size=default&shape=sharp&hover=fluid&props=${encodeURIComponent(serializeConfiguration(local))}`
  const flags = previewOptionsFromUrl(url)
  expect(flags.size).toBeUndefined()
  expect(flags.shape).toBeUndefined()
  expect(flags.hover).toBeUndefined()
  expect(settingsFromLocation(url)).toMatchObject({
    size: 'default',
    shape: 'sharp',
    hover: 'fluid',
  })
  expect(Option.getOrThrow(decodeConfiguration(flags.configuration ?? ''))).toEqual(local)
})

test('configuration URL writes preserve root selections, hash and unknown query values', () => {
  const original =
    'https://example.test/components/breadcrumb?theme=system&font=serif&size=default&keep=yes#installation'
  const href = configurationUrl(original, '/components/breadcrumb', {
    ...Breadcrumb.defaults,
    appearance: { size: 'compact' },
    steps: 3,
  })
  const url = new URL(href, 'https://example.test')
  expect(url.searchParams.get('theme')).toBe('system')
  expect(url.searchParams.get('font')).toBe('serif')
  expect(url.searchParams.get('size')).toBe('default')
  expect(url.searchParams.get('keep')).toBe('yes')
  expect(url.hash).toBe('#installation')
  expect(
    Option.getOrThrow(decodeConfiguration(previewOptionsFromUrl(url.href).configuration ?? '')),
  ).toMatchObject({ steps: 3, appearance: { size: 'compact' } })
  expect(configurationUrl(original, '/components/slider', Breadcrumb.defaults)).toBe(original)
})

test('Slider bounds and discrete steps normalize the canonical value on edits and URL restore', () => {
  const bounded = updateConfiguration(Slider.defaults, 'min', 50)
  expect(bounded).toMatchObject({ value: 50, min: 50, max: 100, upperValue: 65 })
  if (bounded._tag !== 'slider') throw new Error('Expected slider configuration')
  expect(Slider.settingsFor(bounded, 'preview-slider', 'default').value).toBe(50)
  const capped = updateConfiguration(bounded, 'max', 60)
  expect(capped).toMatchObject({ value: 50, upperValue: 60, min: 50, max: 60 })
  const decoded = Option.getOrThrow(
    decodeConfiguration(
      JSON.stringify({ ...Slider.defaults, min: 50, max: 80, step: 10, value: 1, upperValue: 99 }),
    ),
  )
  expect(decoded).toMatchObject({ value: 50, upperValue: 80 })
  expect(
    Option.isNone(decodeConfiguration(JSON.stringify({ ...Slider.defaults, min: 100, max: 50 }))),
  ).toBe(true)
  const discrete = updateConfiguration(Slider.defaults, 'stepsPreset', 'quarters')
  expect(discrete).toMatchObject({ value: 25, upperValue: 75, min: 0, max: 100 })
  expect(Option.getOrThrow(decodeConfiguration(serializeConfiguration(discrete)))).toEqual(discrete)
})
