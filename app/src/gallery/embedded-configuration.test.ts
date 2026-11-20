import { it as effectIt } from '@effect/vitest'
import { InputBlock } from '@foldkit-visuals/fluid/input'
import { Effect } from 'effect'
import { Story } from 'foldkit'
import { toParentMessageFor } from 'foldkit/test'
import { GalleryBlock, layer as galleryLayer, test as galleryTest } from './block'
import { Input as InputBinding } from './fluid/core-bindings'
import { prepareGalleryFlags } from './flags'
import { componentPresentation, defaults as siteDefaults } from '../settings'
import { Option } from 'effect'
import { describe, expect, it } from 'vitest'
import { componentPages, pageAt } from '../../../lib/catalogue'
import * as Input from '../playground/configs/input'
import * as Button from '../playground/configs/button'
import * as Calendar from '../playground/configs/calendar'
import { type PlaygroundConfiguration, decodeConfiguration } from '../playground/configuration'
import { configurationForEmbeddedPage, reconcileEmbeddedLocation } from './embedded-configuration'

const accept = (
  previous: PlaygroundConfiguration,
  next: PlaygroundConfiguration,
  local: PlaygroundConfiguration,
) => reconcileEmbeddedLocation(Option.some(previous), next, Option.some(local))

describe('embedded URI configuration DTO reconciliation', () => {
  it('changes explicit input values, preserves local edits on unrelated props, and applies removed source defaults', () => {
    const previous = Input.Configuration.make({
      ...Input.defaults,
      value: 'URI A',
      placeholder: 'First',
    })
    const local = Input.Configuration.make({ ...previous, value: 'Local edit' })
    const next = Input.Configuration.make({ ...previous, placeholder: 'Second' })
    const result = accept(previous, next, local)
    expect(result.configuration).toMatchObject({
      _tag: 'input',
      value: 'Local edit',
      placeholder: 'Second',
    })
    expect(result.edited).toEqual(['placeholder'])
    expect(
      accept(next, Input.Configuration.make({ ...next, value: 'URI B' }), result.configuration)
        .configuration,
    ).toMatchObject({ value: 'URI B', placeholder: 'Second' })
    expect(accept(previous, Input.defaults, local).configuration).toEqual(Input.defaults)
  })

  it('treats appearance properties and their removal independently of accepted sibling fields', () => {
    const previous = Button.Configuration.make({
      ...Button.defaults,
      appearance: { shape: 'rounded', hover: 'fluid' },
    })
    const local = Button.Configuration.make({
      ...previous,
      label: 'Accepted label',
      appearance: { shape: 'rounded', hover: 'standard', size: 'compact' },
    })
    const next = Button.Configuration.make({ ...previous, appearance: { hover: 'fluid' } })
    expect(accept(previous, next, local).configuration).toMatchObject({
      _tag: 'button',
      label: 'Accepted label',
      appearance: { hover: 'standard', size: 'compact' },
    })
    const result = accept(previous, next, local).configuration
    if (result._tag !== 'button') throw new Error('Expected button configuration')
    expect('shape' in result.appearance).toBe(false)
  })

  it('delivers Calendar layout while leaving its opaque date state to the existing public operation', () => {
    const next = Calendar.Configuration.make({
      ...Calendar.defaults,
      orientation: 'vertical',
      showWeekNumber: true,
    })
    const result = accept(Calendar.defaults, next, Calendar.defaults)
    expect(result.configuration).toEqual(next)
    expect(result.edited).toEqual(['orientation', 'showWeekNumber'])
    expect(result.intent).toBe('reconcile')
  })

  it('merges chart option fields independently and removes absent controlled options', () => {
    const previous: PlaygroundConfiguration = {
      _tag: 'chart',
      slug: 'bar',
      options: { showGrid: true, showLabels: false },
    }
    const local: PlaygroundConfiguration = {
      _tag: 'chart',
      slug: 'bar',
      options: { showGrid: true, showLabels: true, height: 240 },
    }
    const next: PlaygroundConfiguration = {
      _tag: 'chart',
      slug: 'bar',
      options: { showGrid: false },
    }
    expect(accept(previous, next, local).configuration).toEqual({
      _tag: 'chart',
      slug: 'bar',
      options: { showGrid: false, height: 240 },
    })
  })

  it('uses the same tagged/default decoder for every catalogue page and rejects foreign tagged configuration', () => {
    for (const page of componentPages) {
      const configuration = configurationForEmbeddedPage(page, {})
      expect(Option.isSome(decodeConfiguration(JSON.stringify(configuration)))).toBe(true)
      if (page.family === 'ramka') expect(configuration._tag).toBe('none')
      else expect(configuration._tag).not.toBe('none')
      expect(reconcileEmbeddedLocation(Option.none(), configuration, Option.none())).toEqual({
        configuration,
        intent: 'initialize',
      })
      expect(accept(configuration, configuration, configuration).configuration).toBe(configuration)
    }
    const input = pageAt('/components/input')
    if (input === undefined) throw new Error('Expected the actual Input catalogue entry')
    expect(
      configurationForEmbeddedPage(input, { configuration: JSON.stringify(Button.defaults) }),
    ).toEqual(Input.defaults)
    const ramka = pageAt('/ramka/lightbox')
    if (ramka === undefined) throw new Error('Expected the actual Ramka catalogue entry')
    expect(configurationForEmbeddedPage(ramka, {})).toEqual({ _tag: 'none' })
    expect(
      configurationForEmbeddedPage(ramka, { configuration: JSON.stringify(Button.defaults) }),
    ).toEqual({ _tag: 'none' })
  })
})

it('treats explicit default and omitted legacy values as equal normalized URI inputs', () => {
  const page = pageAt('/components/input')
  if (page === undefined) throw new Error('Expected Input')
  const explicitDefault = configurationForEmbeddedPage(page, { value: '' })
  const omitted = configurationForEmbeddedPage(page, {})
  expect(explicitDefault).toEqual(omitted)
  const local = Input.Configuration.make({ ...Input.defaults, value: 'Local after default' })
  expect(accept(explicitDefault, omitted, local).configuration).toBe(local)
  const nondefault = Input.Configuration.make({ ...Input.defaults, value: 'External' })
  expect(accept(nondefault, omitted, local).configuration).toEqual(Input.defaults)
  const localAfterReset = Input.Configuration.make({ ...Input.defaults, value: 'Edited again' })
  expect(accept(omitted, explicitDefault, localAfterReset).configuration).toBe(localAfterReset)
})

it('omits edited for fresh initialization instead of sending an unsupported wildcard', () => {
  const initialized = reconcileEmbeddedLocation(Option.none(), Input.defaults, Option.none())
  expect(initialized.intent).toBe('initialize')
  expect('edited' in initialized).toBe(false)
})

effectIt.effect(
  'checked Gallery operation distinguishes normalized-default equivalence from nondefault removal after real child editing',
  () =>
    Effect.gen(function* () {
      const flags = yield* prepareGalleryFlags
      yield* Story.withBlock({ block: GalleryBlock, layer: galleryLayer }, (gallery) => {
        const page = pageAt('/components/input')
        if (page === undefined) throw new Error('Expected Input')
        const explicitDefault = configurationForEmbeddedPage(page, { value: '' })
        const omitted = configurationForEmbeddedPage(page, {})
        const presentation = componentPresentation(siteDefaults)
        const configure = (configuration: PlaygroundConfiguration) =>
          GalleryBlock.InMessage.InformedOfConfiguration({
            configuration,
            presentation,
            source: 'location',
          })
        const initial = gallery.inMessageUpdate(
          gallery.init({ ...flags, componentSlug: 'input' }).model,
          configure(explicitDefault),
        ).model
        const childMessage = toParentMessageFor(gallery, galleryTest.Fluid)
        const ownerMessage = toParentMessageFor(gallery)
        const edit = (model: typeof GalleryBlock.Model.Type, value: string) =>
          Story.story(
            gallery.update,
            Story.given(model),
            Story.message(
              ownerMessage(
                galleryTest.Fluid,
                childMessage(InputBinding, InputBlock.Message.CapturedInput({ value })),
              ),
            ),
            Story.Command.expectNone(),
          )
        const local = edit(initial, 'Accepted local edit')
        expect(Option.getOrThrow(local.embeddedConfiguration)).toMatchObject({
          _tag: 'input',
          value: 'Accepted local edit',
        })
        const removedDefault = gallery.inMessageUpdate(local, configure(omitted)).model
        expect(removedDefault.fluid.input.value).toBe('Accepted local edit')
        expect(removedDefault.fluid.input).toBe(local.fluid.input)
        expect(Option.getOrThrow(removedDefault.embeddedLocationConfiguration)).toEqual(omitted)

        const external = Input.Configuration.make({
          ...Input.defaults,
          value: 'Nondefault URI value',
        })
        const controlled = gallery.inMessageUpdate(removedDefault, configure(external)).model
        expect(controlled.fluid.input.value).toBe('Nondefault URI value')
        const editedAgain = edit(controlled, 'Another local edit')
        const removedNondefault = gallery.inMessageUpdate(editedAgain, configure(omitted)).model
        expect(removedNondefault.fluid.input.value).toBe('')
        const afterReset = edit(removedNondefault, 'Local after reset')
        expect(
          gallery.inMessageUpdate(afterReset, configure(explicitDefault)).model.fluid.input.value,
        ).toBe('Local after reset')
      })
    }),
)
